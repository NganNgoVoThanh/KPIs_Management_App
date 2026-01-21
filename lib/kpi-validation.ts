// lib/kpi-validation.ts

export interface KpiValidationRule {
  MIN_KPIS: number
  MAX_KPIS: number
  MIN_WEIGHT_PER_KPI: number
  MAX_WEIGHT_PER_KPI: number
  TOTAL_WEIGHT_REQUIRED: number
}

export const DEFAULT_VALIDATION_RULES: KpiValidationRule = {
  MIN_KPIS: 3,
  MAX_KPIS: 5,
  MIN_WEIGHT_PER_KPI: 5,
  MAX_WEIGHT_PER_KPI: 40,
  TOTAL_WEIGHT_REQUIRED: 100
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings?: string[]
}

export interface KpiData {
  title: string
  type: string
  unit: string
  target: number
  weight: number
  dataSource?: string
  formula?: string
  description?: string
}

export class KpiValidationService {
  private rules: KpiValidationRule

  constructor(rules: KpiValidationRule = DEFAULT_VALIDATION_RULES) {
    this.rules = rules
  }

  /**
   * Validate a set of KPIs against all rules
   */
  validateKpis(kpis: KpiData[]): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // 1. Check number of KPIs
    if (kpis.length < this.rules.MIN_KPIS) {
      errors.push(`You must create at least ${this.rules.MIN_KPIS} KPIs (currently ${kpis.length})`)
    }
    if (kpis.length > this.rules.MAX_KPIS) {
      errors.push(`You cannot create more than ${this.rules.MAX_KPIS} KPIs (currently ${kpis.length})`)
    }

    // 2. Check total weight
    const totalWeight = kpis.reduce((sum, kpi) => sum + (kpi.weight || 0), 0)
    if (totalWeight !== this.rules.TOTAL_WEIGHT_REQUIRED) {
      errors.push(`Total weight must equal ${this.rules.TOTAL_WEIGHT_REQUIRED}% (currently ${totalWeight}%)`)
    }

    // 3. Check individual KPIs
    kpis.forEach((kpi, index) => {
      const kpiNum = index + 1

      // Check required fields
      if (!kpi.title || kpi.title.trim() === '') {
        errors.push(`KPI ${kpiNum}: Title is required`)
      }
      if (!kpi.unit || kpi.unit.trim() === '') {
        errors.push(`KPI ${kpiNum}: Unit of measurement is required`)
      }
      if (kpi.target <= 0) {
        errors.push(`KPI ${kpiNum}: Target must be greater than 0`)
      }

      // Check weight range
      if (kpi.weight < this.rules.MIN_WEIGHT_PER_KPI || kpi.weight > this.rules.MAX_WEIGHT_PER_KPI) {
        errors.push(
          `KPI ${kpiNum}: Weight must be between ${this.rules.MIN_WEIGHT_PER_KPI}% and ${this.rules.MAX_WEIGHT_PER_KPI}% (currently ${kpi.weight}%)`
        )
      }

      // Check data source (warning only)
      if (!kpi.dataSource || kpi.dataSource.trim() === '') {
        warnings.push(`KPI ${kpiNum}: Data source is recommended for tracking`)
      }

      // Check SMART criteria (warnings)
      if (kpi.title && kpi.title.length < 10) {
        warnings.push(`KPI ${kpiNum}: Title could be more specific`)
      }
      if (!kpi.description) {
        warnings.push(`KPI ${kpiNum}: Adding a description helps clarify the objective`)
      }
    })

    // 4. Check for duplicate titles
    const titles = kpis.map(k => k.title?.toLowerCase().trim()).filter(Boolean)
    const uniqueTitles = new Set(titles)
    if (titles.length !== uniqueTitles.size) {
      errors.push('KPI titles must be unique')
    }

    // 5. Check weight distribution (warning)
    if (errors.length === 0 && totalWeight === this.rules.TOTAL_WEIGHT_REQUIRED) {
      const avgWeight = totalWeight / kpis.length
      const hasUnbalanced = kpis.some(k => Math.abs(k.weight - avgWeight) > 15)
      if (hasUnbalanced) {
        warnings.push('Consider balancing weights more evenly across KPIs')
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    }
  }

  /**
   * Validate a single KPI
   */
  validateSingleKpi(kpi: KpiData, currentKpis: KpiData[] = []): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check required fields
    if (!kpi.title || kpi.title.trim() === '') {
      errors.push('Title is required')
    }
    if (!kpi.unit || kpi.unit.trim() === '') {
      errors.push('Unit of measurement is required')
    }
    if (kpi.target <= 0) {
      errors.push('Target must be greater than 0')
    }

    // Check weight
    if (kpi.weight < this.rules.MIN_WEIGHT_PER_KPI || kpi.weight > this.rules.MAX_WEIGHT_PER_KPI) {
      errors.push(
        `Weight must be between ${this.rules.MIN_WEIGHT_PER_KPI}% and ${this.rules.MAX_WEIGHT_PER_KPI}%`
      )
    }

    // Check if adding this KPI would exceed limits
    if (currentKpis.length >= this.rules.MAX_KPIS) {
      errors.push(`Cannot add more than ${this.rules.MAX_KPIS} KPIs`)
    }

    // Check SMART score
    const smartScore = this.calculateSmartScore(kpi)
    if (smartScore < 60) {
      warnings.push('KPI could be improved to meet SMART criteria better')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    }
  }

  /**
   * Calculate SMART score for a KPI
   */
  calculateSmartScore(kpi: KpiData): number {
    let score = 0
    const maxScore = 100

    // Specific (20 points)
    if (kpi.title && kpi.title.length > 10) {
      score += 20
    } else if (kpi.title && kpi.title.length > 5) {
      score += 10
    }

    // Measurable (20 points)
    if (kpi.unit && kpi.target > 0) {
      score += 20
    } else if (kpi.unit || kpi.target > 0) {
      score += 10
    }

    // Achievable (20 points)
    if (kpi.target > 0 && kpi.target < 1000000) {
      score += 20
    } else if (kpi.target > 0) {
      score += 10
    }

    // Relevant (20 points)
    if (kpi.dataSource && kpi.dataSource.trim() !== '') {
      score += 20
    } else if (kpi.description && kpi.description.trim() !== '') {
      score += 10
    }

    // Time-bound (20 points) - assumed from cycle
    score += 20

    return Math.min(score, maxScore)
  }

  /**
   * Suggest weight distribution for KPIs
   */
  suggestWeightDistribution(kpiCount: number): number[] {
    if (kpiCount < this.rules.MIN_KPIS || kpiCount > this.rules.MAX_KPIS) {
      throw new Error(
        `Number of KPIs must be between ${this.rules.MIN_KPIS} and ${this.rules.MAX_KPIS}`
      )
    }

    const baseWeight = Math.floor(this.rules.TOTAL_WEIGHT_REQUIRED / kpiCount)
    const remainder = this.rules.TOTAL_WEIGHT_REQUIRED - (baseWeight * kpiCount)
    
    const weights: number[] = []
    for (let i = 0; i < kpiCount; i++) {
      weights.push(i < remainder ? baseWeight + 1 : baseWeight)
    }

    return weights
  }

  /**
   * Check if a weight adjustment is valid
   */
  canAdjustWeight(
    kpiIndex: number,
    newWeight: number,
    allKpis: KpiData[]
  ): { valid: boolean; message?: string } {
    // Check weight bounds
    if (newWeight < this.rules.MIN_WEIGHT_PER_KPI) {
      return { 
        valid: false, 
        message: `Weight cannot be less than ${this.rules.MIN_WEIGHT_PER_KPI}%` 
      }
    }
    if (newWeight > this.rules.MAX_WEIGHT_PER_KPI) {
      return { 
        valid: false, 
        message: `Weight cannot be more than ${this.rules.MAX_WEIGHT_PER_KPI}%` 
      }
    }

    // Calculate new total
    const otherWeights = allKpis
      .filter((_, i) => i !== kpiIndex)
      .reduce((sum, kpi) => sum + kpi.weight, 0)
    
    const newTotal = otherWeights + newWeight

    if (newTotal > this.rules.TOTAL_WEIGHT_REQUIRED) {
      const maxAllowed = this.rules.TOTAL_WEIGHT_REQUIRED - otherWeights
      return { 
        valid: false, 
        message: `Weight cannot exceed ${maxAllowed}% (would make total ${newTotal}%)`
      }
    }

    return { valid: true }
  }

  /**
   * Get validation summary
   */
  getValidationSummary(kpis: KpiData[]): string {
    const totalWeight = kpis.reduce((sum, kpi) => sum + kpi.weight, 0)
    const remainingWeight = this.rules.TOTAL_WEIGHT_REQUIRED - totalWeight

    const parts: string[] = []

    // KPI count
    parts.push(`${kpis.length}/${this.rules.MIN_KPIS}-${this.rules.MAX_KPIS} KPIs`)

    // Weight status
    if (totalWeight === this.rules.TOTAL_WEIGHT_REQUIRED) {
      parts.push('✓ Weight 100%')
    } else if (totalWeight < this.rules.TOTAL_WEIGHT_REQUIRED) {
      parts.push(`Weight: ${totalWeight}% (${remainingWeight}% remaining)`)
    } else {
      parts.push(`Weight: ${totalWeight}% (${totalWeight - this.rules.TOTAL_WEIGHT_REQUIRED}% over)`)
    }

    // Individual weight compliance
    const invalidWeights = kpis.filter(
      k => k.weight < this.rules.MIN_WEIGHT_PER_KPI || k.weight > this.rules.MAX_WEIGHT_PER_KPI
    ).length
    
    if (invalidWeights > 0) {
      parts.push(`${invalidWeights} KPI(s) with invalid weight`)
    }

    return parts.join(' | ')
  }
}

// Export singleton instance with default rules
export const kpiValidation = new KpiValidationService()

// Export function for custom rules
export const createKpiValidator = (rules: Partial<KpiValidationRule>) => {
  return new KpiValidationService({ ...DEFAULT_VALIDATION_RULES, ...rules })
}