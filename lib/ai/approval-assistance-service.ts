// lib/ai/approval-assistance-service.ts
import { enhancedAIServiceManager } from '@/lib/ai/ai-service-manager';
import { DatabaseService } from '@/lib/database-service-enhanced';
import { SmartValidator } from './smart-validator';
import { AnomalyFraudDetector } from './anomaly-fraud-detector';

interface ApprovalContext {
  submission: KpiSubmission;
  employee: EmployeeProfile;
  approver: ApproverProfile;
  historicalData: HistoricalPerformance[];
  peerBenchmarks: PeerComparison[];
  departmentContext: DepartmentContext;
  anomalies?: AnomalyResult[];
}

interface KpiSubmission {
  id: string;
  kpiDefinitions: KpiDefinition[];
  submittedAt: string;
  submissionType: 'goals' | 'actuals';
  totalWeight: number;
  evidenceFiles: EvidenceFile[];
  employeeComments: string;
  previousVersions?: SubmissionVersion[];
}

interface KpiDefinition {
  id: string;
  title: string;
  description?: string;
  target: number;
  unit: string;
  weight: number;
  type: string;
  category: string;
  formula: string;
  dataSource: string;
}

interface EvidenceFile {
  id: string;
  filename: string;
  path: string;
  type: string;
  size: number;
}

interface SubmissionVersion {
  id: string;
  version: number;
  changes: string[];
  submittedAt: string;
}

interface EmployeeProfile {
  id: string;
  name: string;
  jobTitle: string;
  department: string;
  experienceLevel: 'Junior' | 'Mid-level' | 'Senior';
  performanceHistory: PerformanceRecord[];
  competencyLevel: number;
  riskProfile: 'Low' | 'Medium' | 'High';
}

interface PerformanceRecord {
  id: string;
  year: number;
  overallScore: number;
  achievements: string[];
  challenges: string[];
}

interface ApproverProfile {
  id: string;
  name: string;
  role: 'LINE_MANAGER' | 'MANAGER';
  approvalLevel: 1 | 2;
  experience: number;
  strictnessLevel: number; // 1-10 scale
  approvalPatterns: ApprovalPattern[];
}

interface ApprovalPattern {
  criteriaType: string;
  averageDecisionTime: number;
  approvalRate: number;
  commonConcerns: string[];
  typicalComments: string[];
}

interface HistoricalPerformance {
  userId: string;
  kpiId: string;
  year: number;
  target: number;
  actual: number;
  achievementPercent: number;
  score: number;
}

interface PeerComparison {
  department: string;
  jobTitle: string;
  averageTarget: number;
  averageAchievement: number;
  topPerformerTarget: number;
}

interface DepartmentContext {
  name: string;
  averageKpiCount: number;
  typicalWeightDistribution: Record<string, number>;
  seasonalFactors: Record<string, number>;
  budgetConstraints: BudgetConstraint[];
  strategicPriorities: string[];
}

interface BudgetConstraint {
  category: string;
  limit: number;
  current: number;
}

interface AnomalyResult {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  riskScore: number;
}

interface ApprovalRecommendation {
  decision: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT';
  confidence: number;
  reasoning: {
    primaryFactors: string[];
    positiveAspects: string[];
    concerningAspects: string[];
    riskAssessment: string;
  };
  suggestedComments: {
    professional: string;
    constructive: string;
    developmental: string;
  };
  specificFeedback: SpecificFeedback[];
  nextSteps: string[];
  timeEstimate: number; // minutes needed for review
}

interface SpecificFeedback {
  kpiId: string;
  kpiTitle: string;
  issue: string;
  severity: 'Minor' | 'Moderate' | 'Major' | 'Critical';
  suggestion: string;
  requiredAction: 'None' | 'Clarification' | 'Revision' | 'Evidence';
}

interface DecisionInsight {
  decisionFactors: {
    smartCompliance: number;
    targetReasonableness: number;
    balanceQuality: number;
    evidenceQuality: number;
    riskLevel: number;
  };
  comparativeAnalysis: {
    vsHistorical: string;
    vsPeers: string;
    vsDepartmentAverage: string;
  };
  potentialImpact: {
    businessImpact: 'Low' | 'Medium' | 'High';
    developmentValue: 'Low' | 'Medium' | 'High';
    riskExposure: 'Low' | 'Medium' | 'High';
  };
  approvalComplexity: 'Simple' | 'Moderate' | 'Complex' | 'Highly Complex';
}

export class ApprovalAssistanceService {
  private aiManager: enhancedAIServiceManager;
  private dbService: typeof DatabaseService;
  private smartValidator: SmartValidator;
  private anomalyDetector: AnomalyFraudDetector;

  constructor() {
    this.aiManager = new enhancedAIServiceManager();
    this.dbService = DatabaseService;
    this.smartValidator = new SmartValidator();
    this.anomalyDetector = new AnomalyFraudDetector();
  }

  /**
   * Generate comprehensive approval recommendation
   */
  async generateApprovalRecommendation(context: ApprovalContext): Promise<ApprovalRecommendation> {
    // 1. Validate SMART criteria for all KPIs
    const smartAnalysis = await this.analyzeSmartCompliance(context.submission.kpiDefinitions);
    
    // 2. Check for anomalies and risks
    const riskAnalysis = await this.analyzeRiskFactors(context);
    
    // 3. Perform comparative analysis
    const comparative = await this.performComparativeAnalysis(context);
    
    // 4. Generate AI recommendation
    const aiRecommendation = await this.generateAIRecommendation(context, {
      smartAnalysis,
      riskAnalysis,
      comparative
    });

    // 5. Customize for approver style
    const customizedRecommendation = await this.customizeForApprover(
      aiRecommendation,
      context.approver
    );

    return customizedRecommendation;
  }

  /**
   * Analyze SMART compliance across all KPIs
   */
  private async analyzeSmartCompliance(kpis: KpiDefinition[]): Promise<any> {
    const validations = await Promise.all(
      kpis.map(kpi => this.smartValidator.validateKPI({
        title: kpi.title,
        description: kpi.description || '',
        target: kpi.target,
        unit: kpi.unit,
        measurementMethod: kpi.formula,
        dataSource: kpi.dataSource
      }))
    );

    const overallScore = validations.reduce((sum, v) => sum + v.overallScore, 0) / validations.length;
    const weakKpis = validations.filter(v => v.overallScore < 70);
    const excellentKpis = validations.filter(v => v.overallScore >= 90);

    return {
      overallScore: Math.round(overallScore),
      totalKpis: kpis.length,
      weakKpisCount: weakKpis.length,
      excellentKpisCount: excellentKpis.length,
      commonIssues: this.identifyCommonSmartIssues(validations),
      recommendations: this.generateSmartRecommendations(validations)
    };
  }

  /**
   * Analyze risk factors comprehensively
   */
  private async analyzeRiskFactors(context: ApprovalContext): Promise<any> {
    const risks = {
      targetRisk: await this.assessTargetReasonableness(context),
      balanceRisk: this.assessWeightBalance(context.submission),
      competencyRisk: this.assessCompetencyAlignment(context),
      resourceRisk: await this.assessResourceRequirements(context),
      timelineRisk: this.assessTimelineRealism(context.submission),
      dependencyRisk: await this.assessExternalDependencies(context)
    };

    const overallRiskScore = Object.values(risks).reduce((sum, risk: any) => sum + risk.score, 0) / 6;
    const highRiskAreas = Object.entries(risks)
      .filter(([, risk]: [string, any]) => risk.score > 70)
      .map(([area]) => area);

    return {
      overallRiskScore: Math.round(overallRiskScore),
      riskLevel: this.mapScoreToRisk(overallRiskScore),
      highRiskAreas,
      detailedRisks: risks,
      mitigationSuggestions: this.generateRiskMitigations(risks)
    };
  }

  /**
   * Perform comparative analysis
   */
  private async performComparativeAnalysis(context: ApprovalContext): Promise<any> {
    const comparisons = {
      historical: await this.compareToHistoricalPerformance(context),
      peers: await this.compareToPeerPerformance(context),
      department: await this.compareToDepartmentAverages(context),
      industry: await this.compareToIndustryBenchmarks(context)
    };

    return {
      comparisons,
      positioningSummary: this.generatePositioningSummary(comparisons),
      competitiveAdvantage: this.identifyCompetitiveAdvantages(comparisons),
      improvementAreas: this.identifyImprovementAreas(comparisons)
    };
  }

  /**
   * Generate AI-powered recommendation
   */
  private async generateAIRecommendation(
    context: ApprovalContext,
    analysis: any
  ): Promise<ApprovalRecommendation> {
    const prompt = `
    You are an expert KPI approval consultant for Intersnack Vietnam. Analyze this KPI submission and provide professional approval guidance.

    SUBMISSION CONTEXT:
    Employee: ${context.employee.name} (${context.employee.jobTitle})
    Department: ${context.employee.department}
    Experience Level: ${context.employee.experienceLevel}
    Submission Type: ${context.submission.submissionType}
    Total KPIs: ${context.submission.kpiDefinitions.length}
    Total Weight: ${context.submission.totalWeight}%

    SMART ANALYSIS:
    Overall SMART Score: ${analysis.smartAnalysis.overallScore}/100
    Weak KPIs: ${analysis.smartAnalysis.weakKpisCount}/${analysis.smartAnalysis.totalKpis}
    Common Issues: ${analysis.smartAnalysis.commonIssues.join(', ')}

    RISK ANALYSIS:
    Overall Risk Score: ${analysis.riskAnalysis.overallRiskScore}/100
    Risk Level: ${analysis.riskAnalysis.riskLevel}
    High Risk Areas: ${analysis.riskAnalysis.highRiskAreas.join(', ')}

    COMPARATIVE ANALYSIS:
    ${JSON.stringify(analysis.comparative.positioningSummary)}

    KPI DETAILS:
    ${context.submission.kpiDefinitions.map(kpi => `
      - ${kpi.title}: Target ${kpi.target} ${kpi.unit}, Weight ${kpi.weight}%
    `).join('')}

    EMPLOYEE CONTEXT:
    - Performance History: ${context.employee.performanceHistory.length} records
    - Risk Profile: ${context.employee.riskProfile}
    - Competency Level: ${context.employee.competencyLevel}/10

    APPROVAL CRITERIA:
    1. SMART compliance (minimum 70/100 overall)
    2. Target reasonableness (based on historical and peer data)
    3. Weight distribution balance
    4. Resource availability and feasibility
    5. Strategic alignment with OGSM
    6. Risk assessment and mitigation

    PROVIDE RECOMMENDATION:
    Based on comprehensive analysis, recommend one of:
    - APPROVE: If overall quality is good (SMART >70, Low-Medium risk)
    - REQUEST_CHANGES: If issues exist but fixable (SMART 50-70, Medium risk)
    - REJECT: If fundamental problems exist (SMART <50, High risk)

    Consider Vietnamese business culture, Intersnack's values, and developmental approach.

    RESPONSE FORMAT (JSON):
    {
      "decision": "APPROVE",
      "confidence": 85,
      "reasoning": {
        "primaryFactors": ["Strong SMART compliance", "Reasonable targets"],
        "positiveAspects": ["Well-balanced KPI portfolio", "Clear measurement methods"],
        "concerningAspects": ["One KPI has high risk dependency"],
        "riskAssessment": "Low to Medium risk, manageable with proper monitoring"
      },
      "suggestedComments": {
        "professional": "The KPI submission demonstrates strong alignment with objectives...",
        "constructive": "Consider strengthening the measurement methodology for KPI #3...",
        "developmental": "This represents good growth in KPI planning capability..."
      },
      "specificFeedback": [
        {
          "kpiId": "kpi-123",
          "kpiTitle": "Sample KPI",
          "issue": "Measurement method needs clarification",
          "severity": "Minor",
          "suggestion": "Specify the data source and frequency",
          "requiredAction": "Clarification"
        }
      ],
      "nextSteps": ["Approve submission", "Schedule quarterly review"],
      "timeEstimate": 15
    }

    Focus on constructive, developmental feedback that helps the employee improve while maintaining high standards.
    `;

    const aiResponse = await this.aiManager.callService<any>(
      'approval-assistant',
      'generateRecommendation',
      { prompt }
    );

    return this.processAIRecommendation(aiResponse.data || aiResponse, context);
  }

  /**
   * Process AI recommendation and enhance with additional insights
   */
  private processAIRecommendation(aiResponse: any, context: ApprovalContext): ApprovalRecommendation {
    // Enhance with decision insights
    const decisionInsights = this.generateDecisionInsights(context, aiResponse);
    
    // Add time estimate based on complexity
    const timeEstimate = this.calculateReviewTimeEstimate(context, aiResponse);
    
    // Enhance specific feedback with actionable details
    const enhancedFeedback = this.enhanceSpecificFeedback(aiResponse.specificFeedback, context);

    return {
      ...aiResponse,
      specificFeedback: enhancedFeedback,
      timeEstimate,
      decisionInsights
    } as ApprovalRecommendation;
  }

  /**
   * Customize recommendation for specific approver
   */
  private async customizeForApprover(
    recommendation: ApprovalRecommendation,
    approver: ApproverProfile
  ): Promise<ApprovalRecommendation> {
    // Adjust based on approver's strictness level
    if (approver.strictnessLevel > 7 && recommendation.confidence < 90) {
      recommendation.decision = 'REQUEST_CHANGES';
      recommendation.reasoning.primaryFactors.push('High standards requirement');
    }

    // Adjust comment style based on approver patterns
    const commentStyle = this.determineCommentStyle(approver);
    recommendation.suggestedComments = await this.adjustCommentStyle(
      recommendation.suggestedComments,
      commentStyle
    );

    // Add approver-specific insights
    (recommendation as any).approverInsights = await this.generateApproverInsights(
      recommendation,
      approver
    );

    return recommendation;
  }

  // Helper methods implementation
  private identifyCommonSmartIssues(validations: any[]): string[] {
    const issueCount = new Map<string, number>();
    
    validations.forEach(validation => {
      Object.values(validation.criteria).forEach((criterion: any) => {
        criterion.improvements.forEach((improvement: string) => {
          issueCount.set(improvement, (issueCount.get(improvement) || 0) + 1);
        });
      });
    });

    return Array.from(issueCount.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([issue]) => issue);
  }

  private generateSmartRecommendations(validations: any[]): string[] {
    const weakCriteria = new Map<string, number>();
    
    validations.forEach(validation => {
      Object.entries(validation.criteria).forEach(([criterion, data]: [string, any]) => {
        if (data.score < 70) {
          weakCriteria.set(criterion, (weakCriteria.get(criterion) || 0) + 1);
        }
      });
    });

    return Array.from(weakCriteria.entries())
      .sort(([,a], [,b]) => b - a)
      .map(([criterion]) => `Improve ${criterion} criteria across KPIs`);
  }

  private mapScoreToRisk(score: number): 'Low' | 'Medium' | 'High' {
    if (score > 70) return 'High';
    if (score > 40) return 'Medium';
    return 'Low';
  }

  private generateRiskMitigations(risks: any): string[] {
    const mitigations: string[] = [];
    
    Object.entries(risks).forEach(([riskType, risk]: [string, any]) => {
      if (risk.score > 60) {
        mitigations.push(...risk.recommendations);
      }
    });

    return [...new Set(mitigations)]; // Remove duplicates
  }

  // Stub implementations for remaining methods
  private async assessTargetReasonableness(context: ApprovalContext): Promise<any> {
    return { score: 75, level: 'Medium', recommendations: ['Review targets against benchmarks'] };
  }

  private assessWeightBalance(submission: KpiSubmission): any {
    return { score: 85, level: 'Low', recommendations: ['Weight distribution is appropriate'] };
  }

  private assessCompetencyAlignment(context: ApprovalContext): any {
    return { score: 80, level: 'Low', recommendations: ['Good competency alignment'] };
  }

  private async assessResourceRequirements(context: ApprovalContext): Promise<any> {
    return { score: 70, level: 'Medium', recommendations: ['Verify resource availability'] };
  }

  private assessTimelineRealism(submission: KpiSubmission): any {
    return { score: 75, level: 'Medium', recommendations: ['Timelines appear realistic'] };
  }

  private async assessExternalDependencies(context: ApprovalContext): Promise<any> {
    return { score: 80, level: 'Low', recommendations: ['External dependencies are manageable'] };
  }

  private async compareToHistoricalPerformance(context: ApprovalContext): Promise<string> {
    return 'Targets align well with historical performance capability';
  }

  private async compareToPeerPerformance(context: ApprovalContext): Promise<string> {
    return 'Targets are competitive with peer performance';
  }

  private async compareToDepartmentAverages(context: ApprovalContext): Promise<string> {
    return 'Appropriate KPI portfolio size for department';
  }

  private async compareToIndustryBenchmarks(context: ApprovalContext): Promise<string> {
    return 'Industry benchmarks align with proposed targets';
  }

  private generatePositioningSummary(comparisons: any): string {
    return 'Employee positioning shows good alignment across all benchmarks';
  }

  private identifyCompetitiveAdvantages(comparisons: any): string[] {
    return ['Demonstrates growth ambition', 'Competitive target setting'];
  }

  private identifyImprovementAreas(comparisons: any): string[] {
    return ['Consider more challenging targets in some areas'];
  }

  private generateDecisionInsights(context: ApprovalContext, recommendation: any): DecisionInsight {
    return {
      decisionFactors: {
        smartCompliance: 85,
        targetReasonableness: 80,
        balanceQuality: 85,
        evidenceQuality: 70,
        riskLevel: 60
      },
      comparativeAnalysis: {
        vsHistorical: 'Above historical performance',
        vsPeers: 'Competitive with peers',
        vsDepartmentAverage: 'Above department average'
      },
      potentialImpact: {
        businessImpact: 'High',
        developmentValue: 'Medium',
        riskExposure: 'Low'
      },
      approvalComplexity: 'Moderate'
    };
  }

  private calculateReviewTimeEstimate(context: ApprovalContext, recommendation: any): number {
    let baseTime = 10; // Base 10 minutes
    baseTime += context.submission.kpiDefinitions.length * 3;
    return Math.round(baseTime);
  }

  private enhanceSpecificFeedback(feedback: SpecificFeedback[], context: ApprovalContext): SpecificFeedback[] {
    return feedback.map(item => ({
      ...item,
      contextualInfo: 'Additional context based on employee profile',
      exampleImprovements: ['Example improvement suggestion'],
      resourceLinks: ['Link to relevant resources'],
      estimatedEffort: '30 minutes'
    })) as any;
  }

  private determineCommentStyle(approver: ApproverProfile): string {
    return approver.strictnessLevel > 7 ? 'formal' : 'collaborative';
  }

  private async adjustCommentStyle(comments: any, style: string): Promise<any> {
    return comments; // Return as-is for now
  }

  private async generateApproverInsights(recommendation: ApprovalRecommendation, approver: ApproverProfile): Promise<any> {
    return { customInsights: ['Tailored for approver style'] };
  }
}

// Export types
export type { 
  ApprovalRecommendation, 
  ApprovalContext, 
  SpecificFeedback, 
  DecisionInsight 
};