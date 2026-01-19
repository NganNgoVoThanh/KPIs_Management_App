// lib/ai/smart-validator.ts
import { enhancedAIServiceManager } from './ai-service-manager';

interface KpiInput {
  title: string;
  description: string;
  target: number;
  unit: string;
  measurementMethod?: string;
  timeline?: string;
  dataSource?: string;
  type?: number;
}

interface SmartCriterion {
  score: number; // 0-100
  level: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  feedback: string;
  improvements: string[];
  examples: string[];
}

interface SmartValidationResult {
  overallScore: number;
  level: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  criteria: {
    specific: SmartCriterion;
    measurable: SmartCriterion;
    achievable: SmartCriterion;
    relevant: SmartCriterion;
    timeBound: SmartCriterion;
  };
  autoImprovements: {
    suggestedTitle: string;
    suggestedDescription: string;
    suggestedMeasurement: string;
    confidenceScore: number;
  };
  visualMetrics: {
    progressData: Array<{
      criterion: string;
      score: number;
      maxScore: number;
      color: string;
    }>;
    strengthsCount: number;
    weaknessesCount: number;
    improvementPotential: number;
  };
  validationHistory?: ValidationHistoryItem[];
}

interface ValidationHistoryItem {
  timestamp: string;
  overallScore: number;
  changes: string[];
  improvements: string[];
}

export class SmartValidator {
  private aiManager: enhancedAIServiceManager;
  private validationCache = new Map<string, SmartValidationResult>();

  constructor() {
    this.aiManager = new enhancedAIServiceManager();
  }

  /**
   * Validate KPI against SMART criteria with real-time scoring
   */
  async validateKPI(kpiInput: KpiInput): Promise<SmartValidationResult> {
    const cacheKey = this.generateCacheKey(kpiInput);

    // Check cache for recent validation
    if (this.validationCache.has(cacheKey)) {
      const cached = this.validationCache.get(cacheKey)!;
      if (this.isCacheValid(cached)) {
        return cached;
      }
    }

    // Perform comprehensive SMART validation
    const validation = await this.performSmartValidation(kpiInput);

    // Cache result
    this.validationCache.set(cacheKey, validation);

    return validation;
  }

  /**
   * Perform detailed SMART validation with AI assistance
   */
  private async performSmartValidation(kpiInput: KpiInput): Promise<SmartValidationResult> {
    const prompt = `
    Perform comprehensive SMART criteria analysis for this KPI:

    KPI DETAILS:
    Title: "${kpiInput.title}"
    Description: "${kpiInput.description}"
    Target: ${kpiInput.target} ${kpiInput.unit}
    Measurement Method: "${kpiInput.measurementMethod || 'Not specified'}"
    Data Source: "${kpiInput.dataSource || 'Not specified'}"
    Timeline: "${kpiInput.timeline || 'Not specified'}"
    Type: ${kpiInput.type || 'Not specified'}

    EVALUATION CRITERIA (Score 0-100 for each):

    SPECIFIC (0-100):
    - Is the KPI clearly defined and unambiguous?
    - Does it specify exactly what needs to be accomplished?
    - Are there clear boundaries and scope?
    Score Bands:
    - 90-100: Crystal clear, no ambiguity
    - 70-89: Clear with minor ambiguities
    - 50-69: Somewhat clear but needs refinement
    - 30-49: Vague, multiple interpretations possible
    - 0-29: Very unclear, major ambiguities

    MEASURABLE (0-100):
    - Can progress be quantified objectively?
    - Are measurement methods clearly defined?
    - Is the data source reliable and accessible?
    Score Bands:
    - 90-100: Perfectly quantifiable with clear metrics
    - 70-89: Mostly quantifiable, minor measurement gaps
    - 50-69: Measurable but needs clearer methods
    - 30-49: Difficult to measure objectively
    - 0-29: Cannot be measured reliably

    ACHIEVABLE (0-100):
    - Is the target realistic given available resources?
    - Does it consider constraints and dependencies?
    - Is it challenging but attainable?
    Score Bands:
    - 90-100: Well-balanced challenge, definitely achievable
    - 70-89: Challenging but realistic with effort
    - 50-69: Moderately challenging, some concerns
    - 30-49: Very challenging, may be unrealistic
    - 0-29: Likely unachievable with current resources

    RELEVANT (0-100):
    - Does it align with business objectives and OGSM?
    - Is it appropriate for the role and level?
    - Will achieving it create meaningful impact?
    Score Bands:
    - 90-100: Perfect alignment with strategic goals
    - 70-89: Strong alignment, clear relevance
    - 50-69: Generally relevant, some alignment
    - 30-49: Weak relevance, questionable value
    - 0-29: Not relevant to role or objectives

    TIME-BOUND (0-100):
    - Is there a clear deadline or timeframe?
    - Are there interim milestones defined?
    - Is the timeline realistic for the objective?
    Score Bands:
    - 90-100: Clear deadlines with realistic timeline
    - 70-89: Good timeline, minor timing concerns
    - 50-69: Timeline exists but needs refinement
    - 30-49: Vague timeline, unclear deadlines
    - 0-29: No clear timeline or unrealistic timing

    PROVIDE IMPROVEMENTS:
    For each criterion below 70, suggest 2-3 specific improvements.
    Generate an improved version of the KPI statement.

    RESPONSE FORMAT (JSON):
    {
      "overallScore": 85,
      "criteria": {
        "specific": {
          "score": 90,
          "level": "Excellent",
          "feedback": "KPI is clearly defined with specific outcomes",
          "improvements": [],
          "examples": ["Example of excellent specificity"]
        },
        "measurable": {
          "score": 85,
          "level": "Good", 
          "feedback": "Measurement method is clear",
          "improvements": ["Specify data collection frequency"],
          "examples": ["Monthly tracking via system X"]
        },
        "achievable": {
          "score": 75,
          "level": "Good",
          "feedback": "Target appears realistic",
          "improvements": ["Consider resource constraints"],
          "examples": ["Similar targets achieved previously"]
        },
        "relevant": {
          "score": 80,
          "level": "Good",
          "feedback": "Aligns with business objectives",
          "improvements": [],
          "examples": ["Supports OGSM objective Y"]
        },
        "timeBound": {
          "score": 70,
          "level": "Fair",
          "feedback": "Timeline is present but could be clearer",
          "improvements": ["Add quarterly milestones", "Specify exact dates"],
          "examples": ["Q1-Q4 2025 with monthly check-ins"]
        }
      },
      "autoImprovements": {
        "suggestedTitle": "Improved KPI title",
        "suggestedDescription": "Enhanced description with SMART improvements",
        "suggestedMeasurement": "Clear measurement methodology",
        "confidenceScore": 85
      },
      "keyWeaknesses": ["Main areas needing improvement"],
      "keyStrengths": ["What's already working well"],
      "priorityImprovements": ["Most important changes to make"]
    }

    Focus on practical, actionable feedback that helps improve the KPI quality.
    `;

    const aiResponse = await this.aiManager.callService<any>(
      'smart-validator',
      'validateSMART',
      { prompt }
    );

    // Process AI response and add visual metrics
    const result = this.processValidationResponse(aiResponse.data || aiResponse, kpiInput);

    return result;
  }

  /**
   * Process AI validation response and add visual metrics
   */
  private processValidationResponse(aiResponse: any, originalInput: KpiInput): SmartValidationResult {
    // Process AI response and add visual metrics
    const { criteria, autoImprovements } = aiResponse;

    // Safety Check: Ensure criteria object exists and has all required fields
    // This prevents "Cannot read properties of undefined (reading 'specific')" error
    const safeCriteria = criteria || {};
    const defaultCriterion = { score: 0, level: 'Poor', feedback: 'Evaluation unavailable', improvements: [], examples: [] };

    // Ensure all 5 SMART criteria exist
    safeCriteria.specific = safeCriteria.specific || { ...defaultCriterion };
    safeCriteria.measurable = safeCriteria.measurable || { ...defaultCriterion };
    safeCriteria.achievable = safeCriteria.achievable || { ...defaultCriterion };
    safeCriteria.relevant = safeCriteria.relevant || { ...defaultCriterion };
    safeCriteria.timeBound = safeCriteria.timeBound || { ...defaultCriterion };

    // Calculate overall score
    const overallScore = Math.round(
      (safeCriteria.specific.score +
        safeCriteria.measurable.score +
        safeCriteria.achievable.score +
        safeCriteria.relevant.score +
        safeCriteria.timeBound.score) / 5
    );

    // Determine overall level
    const overallLevel = this.getScoreLevel(overallScore);

    // Generate visual metrics for UI components
    const visualMetrics = this.generateVisualMetrics(safeCriteria, overallScore);

    // Enhance auto-improvements
    const enhancedImprovements = this.enhanceAutoImprovements(
      autoImprovements || {}, // Safety check for autoImprovements too
      safeCriteria,
      originalInput
    );

    return {
      overallScore,
      level: overallLevel,
      criteria: this.processCriteria(safeCriteria),
      autoImprovements: enhancedImprovements,
      visualMetrics,
      validationHistory: this.getValidationHistory(originalInput)
    };
  }

  /**
   * Generate visual metrics for progress indicators
   */
  private generateVisualMetrics(criteria: any, overallScore: number): any {
    const progressData = Object.entries(criteria).map(([key, criterion]: [string, any]) => ({
      criterion: key.charAt(0).toUpperCase() + key.slice(1),
      score: criterion.score,
      maxScore: 100,
      color: this.getProgressColor(criterion.score)
    }));

    const scores = Object.values(criteria).map((c: any) => c.score);
    const strengthsCount = scores.filter(score => score >= 80).length;
    const weaknessesCount = scores.filter(score => score < 70).length;

    const improvementPotential = Math.max(0,
      Math.min(...scores.filter(score => score < 90)) + 20 - Math.max(...scores)
    );

    return {
      progressData,
      strengthsCount,
      weaknessesCount,
      improvementPotential: Math.round(improvementPotential)
    };
  }

  /**
   * Enhanced auto-improvement suggestions
   */
  private enhanceAutoImprovements(
    improvements: any,
    criteria: any,
    originalInput: KpiInput
  ): any {
    // Identify the weakest criteria for targeted improvements
    const weakestCriterion = Object.entries(criteria)
      .sort(([, a], [, b]) => (a as any).score - (b as any).score)[0];

    // Generate targeted improvements based on weakest area
    let enhancedTitle = improvements.suggestedTitle || originalInput.title;
    let enhancedDescription = improvements.suggestedDescription || originalInput.description;
    let enhancedMeasurement = improvements.suggestedMeasurement || originalInput.measurementMethod || '';

    // Apply specific enhancements based on weak areas
    if (weakestCriterion[0] === 'specific' && (weakestCriterion[1] as any).score < 70) {
      enhancedTitle = this.improveSpecificity(originalInput.title);
      enhancedDescription = this.addSpecificDetails(originalInput.description);
    }

    if (weakestCriterion[0] === 'measurable' && (weakestCriterion[1] as any).score < 70) {
      enhancedMeasurement = this.improveMeasurability(originalInput);
    }

    return {
      suggestedTitle: enhancedTitle,
      suggestedDescription: enhancedDescription,
      suggestedMeasurement: enhancedMeasurement,
      confidenceScore: improvements.confidenceScore || 80,
      primaryWeakness: weakestCriterion[0],
      targetedImprovements: this.generateTargetedImprovements(weakestCriterion)
    };
  }

  /**
   * Get validation history for tracking improvements
   */
  private getValidationHistory(input: KpiInput): ValidationHistoryItem[] {
    // This would typically come from a database
    // For now, return empty array - to be implemented with actual storage
    return [];
  }

  /**
   * Helper methods for improvements
   */
  private improveSpecificity(title: string): string {
    if (title.toLowerCase().includes('improve')) {
      return title.replace(/improve/gi, 'increase by X%');
    }
    if (title.toLowerCase().includes('enhance')) {
      return title.replace(/enhance/gi, 'achieve specific target of');
    }
    if (!title.includes('by') && !title.includes('%') && !title.includes('target')) {
      return `${title} - achieve specific measurable target`;
    }
    return title;
  }

  private addSpecificDetails(description: string): string {
    let enhanced = description;

    if (!description.includes('specifically')) {
      enhanced = `Specifically, ${enhanced.toLowerCase()}`;
    }

    if (!description.includes('measured') && !description.includes('tracking')) {
      enhanced += ' This will be measured through systematic tracking and reporting.';
    }

    return enhanced;
  }

  private improveMeasurability(input: KpiInput): string {
    const improvements = [];

    if (!input.dataSource) {
      improvements.push('Data source: [Specify system/report name]');
    }

    if (!input.measurementMethod) {
      improvements.push('Measurement: [Define calculation method]');
    }

    improvements.push('Frequency: [Daily/Weekly/Monthly tracking]');
    improvements.push('Reporting: [Dashboard/Report format]');

    return improvements.join(' | ');
  }

  private generateTargetedImprovements(weakestCriterion: [string, any]): string[] {
    const [criterionName, criterionData] = weakestCriterion;
    const improvements = [];

    switch (criterionName) {
      case 'specific':
        improvements.push('Add quantifiable outcomes');
        improvements.push('Define exact scope and boundaries');
        improvements.push('Specify target audience/recipients');
        break;
      case 'measurable':
        improvements.push('Define measurement methodology');
        improvements.push('Specify data sources and tools');
        improvements.push('Set measurement frequency');
        break;
      case 'achievable':
        improvements.push('Validate resource availability');
        improvements.push('Consider historical performance');
        improvements.push('Account for external constraints');
        break;
      case 'relevant':
        improvements.push('Link to strategic objectives');
        improvements.push('Align with role responsibilities');
        improvements.push('Ensure business impact');
        break;
      case 'timeBound':
        improvements.push('Set specific deadlines');
        improvements.push('Define milestone checkpoints');
        improvements.push('Establish review schedules');
        break;
    }

    return improvements;
  }

  /**
   * Process criteria to add levels and colors
   */
  private processCriteria(criteria: any): any {
    const processed: any = {};

    for (const [key, criterion] of Object.entries(criteria)) {
      const typedCriterion = criterion as any;
      processed[key] = {
        ...typedCriterion,
        level: this.getScoreLevel(typedCriterion.score),
        color: this.getProgressColor(typedCriterion.score),
        improvementNeeded: typedCriterion.score < 70
      };
    }

    return processed;
  }

  /**
   * Determine score level based on numeric score
   */
  private getScoreLevel(score: number): 'Poor' | 'Fair' | 'Good' | 'Excellent' {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Poor';
  }

  /**
   * Get color for progress indicators
   */
  private getProgressColor(score: number): string {
    if (score >= 90) return '#10B981'; // green
    if (score >= 75) return '#3B82F6'; // blue
    if (score >= 60) return '#F59E0B'; // yellow
    return '#EF4444'; // red
  }

  /**
   * Generate cache key for validation results
   */
  private generateCacheKey(input: KpiInput): string {
    return `${input.title}-${input.description}-${input.target}-${input.unit}`.replace(/\s+/g, '-').toLowerCase();
  }

  /**
   * Check if cached validation is still valid (within 5 minutes)
   */
  private isCacheValid(cached: SmartValidationResult): boolean {
    // For now, always return false to get fresh validations
    // In production, implement proper cache invalidation logic
    return false;
  }

  /**
   * Batch validation for multiple KPIs
   */
  async validateMultipleKPIs(kpis: KpiInput[]): Promise<SmartValidationResult[]> {
    const validations = await Promise.all(
      kpis.map(kpi => this.validateKPI(kpi))
    );

    return validations;
  }

  /**
   * Get validation summary across multiple KPIs
   */
  async getValidationSummary(kpis: KpiInput[]): Promise<ValidationSummary> {
    const validations = await this.validateMultipleKPIs(kpis);

    const totalScore = validations.reduce((sum, v) => sum + v.overallScore, 0) / validations.length;

    const criteriaAverages = {
      specific: validations.reduce((sum, v) => sum + v.criteria.specific.score, 0) / validations.length,
      measurable: validations.reduce((sum, v) => sum + v.criteria.measurable.score, 0) / validations.length,
      achievable: validations.reduce((sum, v) => sum + v.criteria.achievable.score, 0) / validations.length,
      relevant: validations.reduce((sum, v) => sum + v.criteria.relevant.score, 0) / validations.length,
      timeBound: validations.reduce((sum, v) => sum + v.criteria.timeBound.score, 0) / validations.length
    };

    const weakestCriterion = Object.entries(criteriaAverages)
      .sort(([, a], [, b]) => a - b)[0];

    return {
      totalKpis: kpis.length,
      averageScore: Math.round(totalScore),
      level: this.getScoreLevel(totalScore),
      criteriaAverages,
      weakestCriterion: weakestCriterion[0],
      weakestScore: Math.round(weakestCriterion[1]),
      excellentCount: validations.filter(v => v.overallScore >= 90).length,
      goodCount: validations.filter(v => v.overallScore >= 75 && v.overallScore < 90).length,
      needsImprovementCount: validations.filter(v => v.overallScore < 75).length,
      topRecommendations: this.generateTopRecommendations(validations)
    };
  }

  /**
   * Generate top recommendations across all KPIs
   */
  private generateTopRecommendations(validations: SmartValidationResult[]): string[] {
    const allImprovements = validations.flatMap(v =>
      Object.values(v.criteria).flatMap((c: any) => c.improvements)
    );

    // Count frequency of improvement suggestions
    const improvementCounts = allImprovements.reduce((counts, improvement) => {
      counts[improvement] = (counts[improvement] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    // Return top 5 most common improvements
    return Object.entries(improvementCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([improvement]) => improvement);
  }

  /**
   * Real-time validation with debouncing
   */
  async validateRealtime(input: KpiInput, debounceMs: number = 1000): Promise<SmartValidationResult> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(async () => {
        const result = await this.validateKPI(input);
        resolve(result);
      }, debounceMs);

      // Store timeout ID for potential cancellation
      (this as any)._realtimeTimeout = timeoutId;
    });
  }

  /**
   * Cancel ongoing real-time validation
   */
  cancelRealtimeValidation(): void {
    if ((this as any)._realtimeTimeout) {
      clearTimeout((this as any)._realtimeTimeout);
    }
  }
  /**
   * AI Gatekeeper: Validate evidence against reported data (Phase 3)
   */
  async validateEvidence(
    input: {
      actualValue: number;
      targetValue: number;
      reportedDate: string;
      evidenceContent: string; // Text extracted from file (OCR)
      evidenceType: string;
    }
  ): Promise<{
    isValid: boolean;
    confidence: number;
    reason: string;
    discrepancies: string[];
  }> {
    const prompt = `
      You are an AI Auditor. Verify if the submitted evidence supports the reported KPI result.

      REPORTED DATA:
      - Actual Value: ${input.actualValue}
      - Target Value: ${input.targetValue}
      - Date: ${input.reportedDate}

      EVIDENCE CONTENT (Extracted/OCR):
      """${input.evidenceContent}"""

      TASK:
      1. Check if the evidence content mentions numbers matching or close to the 'Actual Value' (${input.actualValue}).
      2. Check if the dates in evidence match the reported date (${input.reportedDate}).
      3. Identify any major discrepancies.
      4. Determine if the evidence is "Valid" (supports the claim), "Invalid" (contradicts), or "Inconclusive" (not enough info).

      RESPONSE FORMAT (JSON):
      {
        "isValid": boolean,
        "confidence": number (0-100),
        "reason": "Short explanation",
        "discrepancies": ["List of specific mismatch points"]
      }
    `;

    const aiResponse = await this.aiManager.callService<any>(
      'smart-validator',
      'validateEvidence',
      { prompt }
    );

    return aiResponse.data || {
      isValid: false,
      confidence: 0,
      reason: "AI Service unavailable",
      discrepancies: []
    };
  }
}

interface ValidationSummary {
  totalKpis: number;
  averageScore: number;
  level: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  criteriaAverages: {
    specific: number;
    measurable: number;
    achievable: number;
    relevant: number;
    timeBound: number;
  };
  weakestCriterion: string;
  weakestScore: number;
  excellentCount: number;
  goodCount: number;
  needsImprovementCount: number;
  topRecommendations: string[];
}

// Export types and the class
export type { KpiInput, SmartValidationResult, SmartCriterion, ValidationSummary };