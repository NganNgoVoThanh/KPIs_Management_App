// lib/ai/kpi-suggestion-service.ts
import { KpiType, User, OrgUnit } from '@/lib/types';
import { EnhancedDatabaseService } from '@/lib/database-service-enhanced';
import { enhancedAIServiceManager } from '@/lib/ai/ai-service-manager';

interface OGSMObjective {
  id: string;
  title: string;
  description: string;
  department: string;
  weight: number;
  kpiType: string;
  targetRange: {
    min: number;
    max: number;
    recommended: number;
  };
  dataSource: string;
  frequency: string;
}

interface DepartmentTemplate {
  department: string;
  kpiCategories: {
    businessObjective: { weight: number; maxKpis: number };
    individualDevelopment: { weight: number; maxKpis: number };
    coreValues: { weight: number; maxKpis: number };
  };
  specificKpis: TemplateKpi[];
}

interface TemplateKpi {
  title: string;
  description: string;
  type: KpiType;
  unit: string;
  category: 'Business Objective' | 'Individual Development' | 'Core Values';
  applicableRoles: string[];
  ogsmAlignment: string;
  dataSource: string;
  evidenceType: string;
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

interface KpiSuggestionInput {
  user: User;
  orgUnit: OrgUnit;
  cycleYear: number;
  historicalData?: HistoricalPerformance[];
  peerBenchmarks?: PeerBenchmark[];
}

interface PeerBenchmark {
  department: string;
  jobTitle: string;
  kpiType: string;
  averageTarget: number;
  averageAchievement: number;
  topPerformerTarget: number;
}

export interface SmartKpiSuggestion {
  id: string;
  title: string;
  name?: string; // Added for compatibility
  description: string;
  type: KpiType | number;
  unit: string;
  target?: number; // Added for compatibility
  suggestedTarget: number;
  weight: number;
  category: 'Business Objective' | 'Individual Development' | 'Core Values';
  ogsmAlignment: string;
  dataSource: string;
  evidenceRequirements: string[];
  rationale: string;
  formula?: string; // Added for compatibility
  measurementMethod?: string; // Added for compatibility
  balanceAnalysis: {
    businessAlignment: number;
    personalGrowth: number;
    competencyDevelopment: number;
    difficulty: number;
    achievability: number;
  };
  smartScore: number;
  riskFactors: string[];
  historicalComparison?: {
    similarKpiPerformance: number;
    trendAnalysis: string;
    recommendedAdjustment: string;
  };
}

interface SuggestionResult {
  suggestions: SmartKpiSuggestion[];
  balanceAnalysis: {
    totalBusinessWeight: number;
    totalPersonalWeight: number;
    totalCoreValuesWeight: number;
    overallBalance: 'Excellent' | 'Good' | 'Needs Adjustment' | 'Poor';
    recommendations: string[];
  };
  departmentComparison: {
    avgKpiCount: number;
    avgBusinessWeight: number;
    yourPositioning: string;
  };
}

export class SmartKpiSuggestionService {
  private aiManager: enhancedAIServiceManager;
  private dbService: EnhancedDatabaseService;

  constructor() {
    this.aiManager = new enhancedAIServiceManager();
    this.dbService = new EnhancedDatabaseService();
  }

  async generateSmartKpiSuggestions(input: KpiSuggestionInput): Promise<SuggestionResult> {
    const ogsmObjectives = await this.loadOGSMObjectives(input.user.department || '');
    const departmentTemplate = await this.loadDepartmentTemplate(input.user.department || '', input.user.jobTitle || '');
    const historicalAnalysis = await this.analyzeHistoricalPerformance(input.user.id, input.historicalData);
    const peerBenchmarks = await this.getPeerBenchmarks(input.user.department || '', input.user.jobTitle || '');

    // RAG: Retrieve context from Knowledge Base
    const { KnowledgeBaseService } = await import('./knowledge-base-service');
    const kbService = new KnowledgeBaseService();
    const ragContext = await kbService.retrieveContext(
      `KPIs for ${input.user.jobTitle} in ${input.user.department}`,
      { department: input.user.department }
    );

    const aiPrompt = this.buildKpiSuggestionPrompt(
      input.user,
      ogsmObjectives,
      departmentTemplate,
      historicalAnalysis,
      peerBenchmarks,
      ragContext // Pass context
    );

    const aiResponse = await this.aiManager.callService<any>(
      'kpi-suggestion',
      'generateSuggestions',
      { prompt: aiPrompt }
    );

    const enhancedSuggestions = await this.enhanceSuggestions(aiResponse.data?.suggestions || [], input);
    const balanceAnalysis = this.analyzeKpiBalance(enhancedSuggestions);
    const departmentComparison = await this.comparWithDepartment(
      input.user.department || '',
      enhancedSuggestions
    );

    return {
      suggestions: enhancedSuggestions,
      balanceAnalysis,
      departmentComparison
    };
  }

  private async loadOGSMObjectives(department: string): Promise<OGSMObjective[]> {
    return await this.dbService.getOGSMObjectives({ department });
  }

  private async loadDepartmentTemplate(department: string, jobTitle: string): Promise<DepartmentTemplate> {
    const departmentConfigs: Record<string, DepartmentTemplate> = {
      'Process RD & Optimization': {
        department: 'R&D',
        kpiCategories: {
          businessObjective: { weight: 70, maxKpis: 5 },
          individualDevelopment: { weight: 20, maxKpis: 2 },
          coreValues: { weight: 10, maxKpis: 1 }
        },
        specificKpis: []
      },
      'Production': {
        department: 'Production',
        kpiCategories: {
          businessObjective: { weight: 80, maxKpis: 6 },
          individualDevelopment: { weight: 15, maxKpis: 2 },
          coreValues: { weight: 5, maxKpis: 1 }
        },
        specificKpis: []
      },
      'Quality Assurance': {
        department: 'QA',
        kpiCategories: {
          businessObjective: { weight: 75, maxKpis: 5 },
          individualDevelopment: { weight: 20, maxKpis: 2 },
          coreValues: { weight: 5, maxKpis: 1 }
        },
        specificKpis: []
      }
    };

    return departmentConfigs[department] || departmentConfigs['Process RD & Optimization'];
  }

  private buildKpiSuggestionPrompt(
    user: User,
    ogsmObjectives: OGSMObjective[],
    template: DepartmentTemplate,
    historical: any,
    benchmarks: PeerBenchmark[],
    ragContext: string = ''
  ): string {
    return `
    You are an expert KPI consultant for Intersnack Vietnam. Generate intelligent, balanced KPI suggestions.
    
    REFERENCE MATERIALS (LIBRARY CONTEXT):
    ${ragContext}

    EMPLOYEE PROFILE:
    - Name: ${user.name}
    - Department: ${user.department || 'N/A'}
    - Job Title: ${user.jobTitle || 'N/A'}
    - Experience Level: ${this.getExperienceLevel(user)}

    OGSM STRATEGIC OBJECTIVES:
    ${JSON.stringify(ogsmObjectives, null, 2)}

    DEPARTMENT TEMPLATE REQUIREMENTS:
    - Business Objectives: ${template.kpiCategories.businessObjective.weight}% (max ${template.kpiCategories.businessObjective.maxKpis} KPIs)
    - Individual Development: ${template.kpiCategories.individualDevelopment.weight}% (max ${template.kpiCategories.individualDevelopment.maxKpis} KPIs)
    - Core Values: ${template.kpiCategories.coreValues.weight}% (max ${template.kpiCategories.coreValues.maxKpis} KPIs)

    HISTORICAL PERFORMANCE ANALYSIS:
    ${JSON.stringify(historical, null, 2)}

    PEER BENCHMARKS:
    ${JSON.stringify(benchmarks, null, 2)}

    REQUIREMENTS:
    1. Generate 6-8 KPIs that perfectly align with OGSM objectives
    2. Optimize targets based on historical performance and peer benchmarks
    3. Ensure balanced distribution across categories
    4. Each KPI must score >80 on SMART criteria
    5. Consider Vietnamese business culture and Intersnack's values

    RESPONSE FORMAT (JSON):
    {
      "suggestions": [
        {
          "title": "Specific KPI title",
          "description": "Detailed description",
          "type": "QUANT_HIGHER_BETTER",
          "unit": "measurement unit",
          "suggestedTarget": 100,
          "weight": 15,
          "category": "Business Objective",
          "ogsmAlignment": "OGSM objective",
          "dataSource": "Data source",
          "evidenceRequirements": ["Evidence 1", "Evidence 2"],
          "rationale": "Why this KPI",
          "balanceAnalysis": {
            "businessAlignment": 90,
            "personalGrowth": 70,
            "competencyDevelopment": 80,
            "difficulty": 75,
            "achievability": 85
          },
          "riskFactors": ["Risk 1"],
          "historicalComparison": {
            "similarKpiPerformance": 85,
            "trendAnalysis": "Trend",
            "recommendedAdjustment": "Adjustment"
          }
        }
      ],
      "totalWeight": 100
    }
    `;
  }

  private async enhanceSuggestions(
    aiSuggestions: any[],
    input: KpiSuggestionInput
  ): Promise<SmartKpiSuggestion[]> {
    const enhancedSuggestions: SmartKpiSuggestion[] = [];

    for (const suggestion of aiSuggestions) {
      const smartScore = await this.calculateSmartScore(suggestion);
      const riskFactors = await this.assessRiskFactors(suggestion, input);
      const historicalComparison = await this.getHistoricalComparison(
        suggestion,
        input.historicalData
      );

      enhancedSuggestions.push({
        id: this.generateSuggestionId(),
        ...suggestion,
        name: suggestion.title, // Add compatibility field
        target: suggestion.suggestedTarget, // Add compatibility field
        smartScore,
        riskFactors,
        historicalComparison
      });
    }

    return enhancedSuggestions;
  }

  private analyzeKpiBalance(suggestions: SmartKpiSuggestion[]): any {
    const businessWeight = suggestions
      .filter(s => s.category === 'Business Objective')
      .reduce((sum, s) => sum + s.weight, 0);

    const personalWeight = suggestions
      .filter(s => s.category === 'Individual Development')
      .reduce((sum, s) => sum + s.weight, 0);

    const coreValuesWeight = suggestions
      .filter(s => s.category === 'Core Values')
      .reduce((sum, s) => sum + s.weight, 0);

    let balance: 'Excellent' | 'Good' | 'Needs Adjustment' | 'Poor';
    const recommendations: string[] = [];

    if (businessWeight >= 60 && businessWeight <= 80 &&
      personalWeight >= 15 && personalWeight <= 25 &&
      coreValuesWeight >= 5 && coreValuesWeight <= 15) {
      balance = 'Excellent';
    } else if (businessWeight >= 50 && personalWeight >= 10) {
      balance = 'Good';
      if (businessWeight > 85) {
        recommendations.push('Consider adding more personal development KPIs');
      }
    } else {
      balance = 'Needs Adjustment';
      recommendations.push('Rebalance weights according to template requirements');
    }

    return {
      totalBusinessWeight: businessWeight,
      totalPersonalWeight: personalWeight,
      totalCoreValuesWeight: coreValuesWeight,
      overallBalance: balance,
      recommendations
    };
  }

  private async comparWithDepartment(
    department: string,
    suggestions: SmartKpiSuggestion[]
  ): Promise<any> {
    const deptStats = await this.dbService.getDepartmentKpiStatistics(department);

    return {
      avgKpiCount: deptStats.avgKpiCount,
      avgBusinessWeight: deptStats.avgBusinessWeight,
      yourPositioning: suggestions.length > deptStats.avgKpiCount ?
        'Above average KPI count' : 'Standard KPI count'
    };
  }

  private getExperienceLevel(user: User): string {
    const joiningDate = new Date(user.joiningDate || '');
    const yearsExp = (new Date().getFullYear() - joiningDate.getFullYear());

    if (yearsExp < 2) return 'Junior';
    if (yearsExp < 5) return 'Mid-level';
    return 'Senior';
  }

  private async calculateSmartScore(suggestion: any): Promise<number> {
    const { SmartValidator } = await import('./smart-validator');
    const validator = new SmartValidator();
    const validation = await validator.validateKPI({
      title: suggestion.title,
      description: suggestion.description,
      target: suggestion.suggestedTarget,
      unit: suggestion.unit
    });

    return validation.overallScore;
  }

  private async assessRiskFactors(suggestion: any, input: KpiSuggestionInput): Promise<string[]> {
    const risks: string[] = [];

    if (suggestion.dataSource?.includes('external') || suggestion.dataSource?.includes('market')) {
      risks.push('External market dependency');
    }

    if (suggestion.description?.toLowerCase().includes('new system') ||
      suggestion.description?.toLowerCase().includes('implement')) {
      risks.push('Requires significant resources');
    }

    if (input.historicalData) {
      const similarKpis = input.historicalData.filter(h =>
        h.achievementPercent < 80
      );
      if (similarKpis.length > 0) {
        risks.push('Similar KPIs had achievement challenges');
      }
    }

    return risks;
  }

  private async getHistoricalComparison(
    suggestion: any,
    historical?: HistoricalPerformance[]
  ): Promise<any> {
    if (!historical || historical.length === 0) return undefined;

    const similar = historical.filter(h =>
      h.kpiId.toLowerCase().includes(suggestion.title.toLowerCase().split(' ')[0])
    );

    if (similar.length === 0) return undefined;

    const avgPerformance = similar.reduce((sum, s) => sum + s.achievementPercent, 0) / similar.length;

    return {
      similarKpiPerformance: Math.round(avgPerformance),
      trendAnalysis: avgPerformance > 100 ? 'Historically over-achieving' : 'Historically under-achieving',
      recommendedAdjustment: avgPerformance > 110 ? '+15% target increase' : 'Maintain current level'
    };
  }

  private generateSuggestionId(): string {
    return `kpi-suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async analyzeHistoricalPerformance(userId: string, historical?: HistoricalPerformance[]): Promise<any> {
    let data = historical;
    if (!data) {
      data = await this.dbService.getHistoricalPerformance(userId);
    }

    return {
      averageAchievement: data.length > 0
        ? data.reduce((sum, h) => sum + h.achievementPercent, 0) / data.length
        : 100,
      trends: this.analyzeTrends(data),
      strengths: this.identifyStrengths(data),
      challenges: this.identifyChallenges(data)
    };
  }

  private analyzeTrends(historical: HistoricalPerformance[]): string {
    if (historical.length < 2) return 'Insufficient data for trend analysis';

    const recent = historical.slice(-3);
    const older = historical.slice(0, -3);

    const recentAvg = recent.reduce((sum, h) => sum + h.achievementPercent, 0) / recent.length;
    const olderAvg = older.length > 0
      ? older.reduce((sum, h) => sum + h.achievementPercent, 0) / older.length
      : recentAvg;

    if (recentAvg > olderAvg + 10) return 'Improving performance trend';
    if (recentAvg < olderAvg - 10) return 'Declining performance trend';
    return 'Stable performance trend';
  }

  private identifyStrengths(historical: HistoricalPerformance[]): string[] {
    return historical
      .filter(h => h.achievementPercent > 110)
      .map(h => `Strong performance in ${h.kpiId}`)
      .slice(0, 3);
  }

  private identifyChallenges(historical: HistoricalPerformance[]): string[] {
    return historical
      .filter(h => h.achievementPercent < 80)
      .map(h => `Challenge in ${h.kpiId}`)
      .slice(0, 3);
  }

  private async getPeerBenchmarks(department: string, jobTitle: string): Promise<PeerBenchmark[]> {
    return await this.dbService.getPeerBenchmarks({ department, jobTitle });
  }
}

export type { SmartKpiSuggestion as default, SuggestionResult, KpiSuggestionInput };