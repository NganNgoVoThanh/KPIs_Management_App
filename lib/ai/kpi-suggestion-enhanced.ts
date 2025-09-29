// lib/ai/kpi-suggestion-enhanced.ts - FIXED: Proper type definitions
import type { User, OrgUnit, HistoricalKpiData, KpiType } from '@/lib/types'

interface KpiSuggestionContext {
  user: User
  orgUnit: OrgUnit
  cycleYear: number
  cycleQuarter?: number
  historicalData?: HistoricalKpiData[]
  ogsmDocuments?: any[]
  departmentContext?: any
}

interface SmartKpiSuggestion {
  id: string
  title: string
  description: string
  type: KpiType
  unit: string
  suggestedTarget: number
  targetRange: {
    min: number
    max: number
    recommended: number
  }
  weight: number
  rationale: string
  dataSource: string
  formula?: string
  smartScore: number
  confidenceLevel: number
  basedOnHistorical: boolean
  historicalPerformance?: {
    previousTarget: number
    previousActual: number
    previousScore: number
    trend: 'improving' | 'stable' | 'declining'
  }
  aiInsights: string[]
}

export class EnhancedKpiSuggestionService {
  /**
   * Generate smart KPI suggestions using historical data and company documents
   */
  async generateSmartKpiSuggestions(context: KpiSuggestionContext): Promise<{
    suggestions: SmartKpiSuggestion[]
    summary: {
      totalSuggestions: number
      basedOnHistorical: number
      basedOnOGSM: number
      avgConfidence: number
      recommendedKpis: string[]
    }
  }> {
    
    const suggestions: SmartKpiSuggestion[] = []

    // 1. Historical-based suggestions
    if (context.historicalData && context.historicalData.length > 0) {
      const historicalSuggestions = await this.generateHistoricalBasedSuggestions(
        context.user,
        context.historicalData,
        context.cycleYear
      )
      suggestions.push(...historicalSuggestions)
    }

    // 2. OGSM-based suggestions
    if (context.ogsmDocuments && context.ogsmDocuments.length > 0) {
      const ogsmSuggestions = await this.generateOGSMBasedSuggestions(
        context.user,
        context.ogsmDocuments,
        context.cycleYear
      )
      suggestions.push(...ogsmSuggestions)
    }

    // 3. Department standard suggestions
    const departmentSuggestions = await this.generateDepartmentSuggestions(
      context.user,
      context.orgUnit
    )
    suggestions.push(...departmentSuggestions)

    // 4. Remove duplicates and rank by confidence
    const uniqueSuggestions = this.deduplicateAndRank(suggestions)

    // 5. Calculate summary
    const summary = {
      totalSuggestions: uniqueSuggestions.length,
      basedOnHistorical: uniqueSuggestions.filter(s => s.basedOnHistorical).length,
      basedOnOGSM: uniqueSuggestions.filter(s => s.aiInsights.some(i => i.includes('OGSM'))).length,
      avgConfidence: uniqueSuggestions.length > 0 
        ? uniqueSuggestions.reduce((sum, s) => sum + s.confidenceLevel, 0) / uniqueSuggestions.length 
        : 0,
      recommendedKpis: uniqueSuggestions
        .filter(s => s.confidenceLevel >= 80)
        .slice(0, 5)
        .map(s => s.title)
    }

    return {
      suggestions: uniqueSuggestions,
      summary
    }
  }

  /**
   * Generate suggestions based on historical performance
   */
  private async generateHistoricalBasedSuggestions(
    user: User,
    historicalData: HistoricalKpiData[],
    targetYear: number
  ): Promise<SmartKpiSuggestion[]> {
    
    const suggestions: SmartKpiSuggestion[] = []

    // Get most recent historical data
    const recentHistory = historicalData
      .sort((a, b) => b.year - a.year)
      .slice(0, 3) // Last 3 periods

    if (recentHistory.length === 0) return suggestions

    const lastPeriod = recentHistory[0]

    for (const historicalKpi of lastPeriod.kpis) {
      // Calculate trend
      const trend = this.calculateTrend(historicalKpi, recentHistory)
      
      // Calculate suggested target based on historical performance
      const { suggestedTarget, targetRange } = this.calculateSmartTarget(
        historicalKpi,
        trend,
        recentHistory
      )

      const suggestion: SmartKpiSuggestion = {
        id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: historicalKpi.title,
        description: `Based on your ${recentHistory.length} previous period(s) performance`,
        type: historicalKpi.type,
        unit: 'units',
        suggestedTarget,
        targetRange,
        weight: historicalKpi.weight,
        rationale: `Your historical performance shows a ${trend} trend. Average achievement: ${this.calculateAvgAchievement(recentHistory, historicalKpi.title)}%`,
        dataSource: 'Historical Performance Data',
        smartScore: 85,
        confidenceLevel: this.calculateConfidence(recentHistory, historicalKpi.title),
        basedOnHistorical: true,
        historicalPerformance: {
          previousTarget: historicalKpi.target,
          previousActual: historicalKpi.actual,
          previousScore: historicalKpi.score,
          trend
        },
        aiInsights: [
          `Historical trend: ${trend}`,
          `Consistency score: ${this.calculateConsistency(recentHistory, historicalKpi.title)}/100`,
          trend === 'improving' 
            ? `Recommended to increase target by ${this.calculateIncreasePercentage(recentHistory, historicalKpi.title)}%`
            : `Maintain current target level with focus on consistency`
        ]
      }

      suggestions.push(suggestion)
    }

    return suggestions
  }

  /**
   * Generate suggestions based on OGSM documents
   */
  private async generateOGSMBasedSuggestions(
    user: User,
    ogsmDocs: any[],
    targetYear: number
  ): Promise<SmartKpiSuggestion[]> {
    
    const suggestions: SmartKpiSuggestion[] = []

    // Common OGSM-based KPIs by department
    const ogsmKpis = this.getOGSMKpisByDepartment(user.department || 'General')

    for (const kpi of ogsmKpis) {
      const suggestion: SmartKpiSuggestion = {
        id: `ogsm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: kpi.title!,
        description: kpi.description!,
        type: kpi.type!,
        unit: kpi.unit!,
        suggestedTarget: kpi.suggestedTarget!,
        targetRange: kpi.targetRange!,
        weight: kpi.weight!,
        rationale: kpi.rationale!,
        dataSource: kpi.dataSource!,
        smartScore: 90,
        confidenceLevel: 85,
        basedOnHistorical: false,
        aiInsights: [
          `Aligned with company OGSM objectives`,
          `Critical for ${user.department} department success`,
          `Recommended by AI based on strategic priorities`
        ]
      }

      suggestions.push(suggestion)
    }

    return suggestions
  }

  /**
   * Generate department-standard suggestions
   */
  private async generateDepartmentSuggestions(
    user: User,
    orgUnit: OrgUnit
  ): Promise<SmartKpiSuggestion[]> {
    
    const suggestions: SmartKpiSuggestion[] = []

    const departmentStandards = this.getDepartmentStandardKpis(user.department || 'General')

    for (const kpi of departmentStandards) {
      const suggestion: SmartKpiSuggestion = {
        id: `dept-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: kpi.title!,
        description: kpi.description!,
        type: kpi.type!,
        unit: kpi.unit!,
        suggestedTarget: kpi.suggestedTarget!,
        targetRange: kpi.targetRange!,
        weight: kpi.weight!,
        rationale: kpi.rationale!,
        dataSource: kpi.dataSource!,
        smartScore: 80,
        confidenceLevel: 75,
        basedOnHistorical: false,
        aiInsights: [
          `Standard KPI for ${user.department}`,
          `Widely used across similar roles`,
          `Proven metric for measuring performance`
        ]
      }

      suggestions.push(suggestion)
    }

    return suggestions
  }

  /**
   * Calculate trend from historical data
   */
  private calculateTrend(
    kpi: any,
    historicalData: HistoricalKpiData[]
  ): 'improving' | 'stable' | 'declining' {
    
    const kpiHistory = historicalData
      .map(h => h.kpis.find(k => k.title === kpi.title))
      .filter(k => k !== undefined)

    if (kpiHistory.length < 2) return 'stable'

    const scores = kpiHistory.map(k => k!.score)
    const avgChange = (scores[0] - scores[scores.length - 1]) / (scores.length - 1)

    if (avgChange > 0.3) return 'improving'
    if (avgChange < -0.3) return 'declining'
    return 'stable'
  }

  /**
   * Calculate smart target based on historical performance
   */
  private calculateSmartTarget(
    kpi: any,
    trend: string,
    historicalData: HistoricalKpiData[]
  ): { suggestedTarget: number; targetRange: { min: number; max: number; recommended: number } } {
    
    const lastActual = kpi.actual
    const lastTarget = kpi.target
    const achievementRate = lastActual / lastTarget

    let suggestedTarget = lastTarget

    if (trend === 'improving' && achievementRate >= 1.0) {
      suggestedTarget = Math.round(lastTarget * 1.12)
    } else if (trend === 'declining' || achievementRate < 0.8) {
      suggestedTarget = Math.round(lastActual * 1.05)
    } else {
      suggestedTarget = Math.round((lastTarget + lastActual) / 2)
    }

    return {
      suggestedTarget,
      targetRange: {
        min: Math.round(suggestedTarget * 0.8),
        max: Math.round(suggestedTarget * 1.2),
        recommended: suggestedTarget
      }
    }
  }

  /**
   * Calculate average achievement rate
   */
  private calculateAvgAchievement(
    historicalData: HistoricalKpiData[],
    kpiTitle: string
  ): number {
    
    const kpiHistory = historicalData
      .map(h => h.kpis.find(k => k.title === kpiTitle))
      .filter(k => k !== undefined)

    if (kpiHistory.length === 0) return 100

    const achievements = kpiHistory.map(k => (k!.actual / k!.target) * 100)
    return Math.round(achievements.reduce((sum, a) => sum + a, 0) / achievements.length)
  }

  /**
   * Calculate confidence level
   */
  private calculateConfidence(
    historicalData: HistoricalKpiData[],
    kpiTitle: string
  ): number {
    
    const dataPoints = historicalData.length
    const consistency = this.calculateConsistency(historicalData, kpiTitle)
    
    const baseConfidence = Math.min(50 + (dataPoints * 10), 80)
    const consistencyBonus = (consistency / 100) * 20
    
    return Math.round(baseConfidence + consistencyBonus)
  }

  /**
   * Calculate consistency score
   */
  private calculateConsistency(
    historicalData: HistoricalKpiData[],
    kpiTitle: string
  ): number {
    
    const kpiHistory = historicalData
      .map(h => h.kpis.find(k => k.title === kpiTitle))
      .filter(k => k !== undefined)

    if (kpiHistory.length < 2) return 100

    const scores = kpiHistory.map(k => k!.score)
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length
    const stdDev = Math.sqrt(variance)

    return Math.round(Math.max(0, 100 - (stdDev * 25)))
  }

  /**
   * Calculate recommended increase percentage
   */
  private calculateIncreasePercentage(
    historicalData: HistoricalKpiData[],
    kpiTitle: string
  ): number {
    
    const avgAchievement = this.calculateAvgAchievement(historicalData, kpiTitle)
    
    if (avgAchievement >= 120) return 15
    if (avgAchievement >= 110) return 10
    if (avgAchievement >= 100) return 5
    return 0
  }

  /**
   * Get OGSM-based KPIs by department
   */
  private getOGSMKpisByDepartment(department: string): Partial<SmartKpiSuggestion>[] {
    const kpiMap: Record<string, Partial<SmartKpiSuggestion>[]> = {
      'R&D': [
        {
          title: 'Giảm NCR nội bộ',
          description: 'Số lượng NCR (Non-Conformance Report) phát sinh trong nội bộ',
          type: 'QUANT_LOWER_BETTER',
          unit: 'cases',
          suggestedTarget: 12,
          targetRange: { min: 5, max: 15, recommended: 12 },
          weight: 25,
          rationale: 'Mục tiêu chất lượng OGSM - giảm sự cố chất lượng nội bộ',
          dataSource: 'eQMS System'
        }
      ],
      'Production': [
        {
          title: 'OEE (Overall Equipment Effectiveness)',
          description: 'Hiệu suất sử dụng thiết bị tổng thể',
          type: 'QUANT_HIGHER_BETTER',
          unit: '%',
          suggestedTarget: 85,
          targetRange: { min: 75, max: 95, recommended: 85 },
          weight: 30,
          rationale: 'Mục tiêu năng suất OGSM',
          dataSource: 'Production System'
        }
      ]
    }

    return kpiMap[department] || []
  }

  /**
   * Get department standard KPIs
   */
  private getDepartmentStandardKpis(department: string): Partial<SmartKpiSuggestion>[] {
    return [
      {
        title: 'Cải tiến quy trình',
        description: 'Số lượng cải tiến quy trình được triển khai',
        type: 'QUANT_HIGHER_BETTER',
        unit: 'projects',
        suggestedTarget: 2,
        targetRange: { min: 1, max: 4, recommended: 2 },
        weight: 15,
        rationale: 'KPI chuẩn cho phát triển liên tục',
        dataSource: 'Improvement System'
      }
    ]
  }

  /**
   * Deduplicate and rank suggestions
   */
  private deduplicateAndRank(suggestions: SmartKpiSuggestion[]): SmartKpiSuggestion[] {
    const uniqueMap = new Map<string, SmartKpiSuggestion>()

    for (const suggestion of suggestions) {
      const key = suggestion.title.toLowerCase().trim()
      
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, suggestion)
      } else {
        const existing = uniqueMap.get(key)!
        if (suggestion.confidenceLevel > existing.confidenceLevel) {
          uniqueMap.set(key, suggestion)
        }
      }
    }

    return Array.from(uniqueMap.values())
      .sort((a, b) => b.confidenceLevel - a.confidenceLevel)
  }
}

export const enhancedKpiSuggestionService = new EnhancedKpiSuggestionService()
export default enhancedKpiSuggestionService