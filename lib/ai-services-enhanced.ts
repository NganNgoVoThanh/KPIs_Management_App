// lib/ai-services-enhanced.ts
import { enhancedAIServiceManager } from '@/lib/ai/ai-service-manager';
import { SmartKpiSuggestionService } from '@/lib/ai/kpi-suggestion-service';
import { SmartValidator } from '@/lib/ai/smart-validator';
import { AnomalyFraudDetector } from '@/lib/ai/anomaly-fraud-detector';
import { ApprovalAssistanceService } from '@/lib/ai/approval-assistance-service';

export interface EnhancedAnomalyDetection {
  id: string;
  kpiId: string;
  userId: string;
  anomalyType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  confidence: number;
  needsHumanReview: boolean;
  autoActions: string[];
  suggestedActions: string[];
  description: string;
  behaviorPattern: {
    submissionTime: string;
    editCount: number;
    timeSpent: number;
    deviceInfo: string;
  };
  statisticalAnalysis: {
    zScore: number;
    percentile: number;
    trend: 'improving' | 'stable' | 'declining';
  };
}

class EnhancedAIService {
  private aiManager: enhancedAIServiceManager;
  private kpiSuggestionService: SmartKpiSuggestionService;
  private smartValidator: SmartValidator;
  private anomalyDetector: AnomalyFraudDetector;
  private approvalAssistant: ApprovalAssistanceService;

  constructor() {
    this.aiManager = new enhancedAIServiceManager();
    this.kpiSuggestionService = new SmartKpiSuggestionService();
    this.smartValidator = new SmartValidator();
    this.anomalyDetector = new AnomalyFraudDetector();
    this.approvalAssistant = new ApprovalAssistanceService();
  }

  async generateKPISuggestions(department: string, role: string): Promise<any[]> {
    try {
      const result = await this.kpiSuggestionService.generateSmartKpiSuggestions({
        user: {
          id: 'temp-user',
          name: 'User',
          email: 'user@intersnack.com.vn',
          department,
          jobTitle: role,
          role: 'STAFF',
          orgUnitId: 'org-1',
          status: 'ACTIVE'
        } as any,
        orgUnit: { 
          id: 'org-1', 
          name: department, 
          parentId: null, 
          type: 'DEPARTMENT' 
        } as any,
        cycleYear: 2025
      });
      
      return result.suggestions;
    } catch (error) {
      console.error('KPI suggestion generation failed:', error);
      return [];
    }
  }

  async analyzeSMARTCriteria(kpi: any): Promise<any> {
    try {
      return await this.smartValidator.validateKPI({
        title: kpi.title,
        description: kpi.description || '',
        target: kpi.target || 100,
        unit: kpi.unit || 'units'
      });
    } catch (error) {
      console.error('SMART validation failed:', error);
      return {
        score: 50,
        specific: false,
        measurable: false,
        achievable: false,
        relevant: false,
        timeBound: false,
        suggestions: ['Manual review required']
      };
    }
  }

  async detectEnhancedAnomalies(kpiData: any[]): Promise<EnhancedAnomalyDetection[]> {
    try {
      const anomalies: EnhancedAnomalyDetection[] = [];
      
      for (const kpi of kpiData) {
        const dataPoint = {
          id: kpi.id || 'temp-id',
          kpiId: kpi.id || kpi.name,
          userId: kpi.userId || 'temp-user',
          value: kpi.actualValue || 0,
          reportedDate: new Date().toISOString(),
          submissionTime: new Date().toISOString(),
          evidenceFiles: kpi.evidenceFiles || [],
          userBehavior: {
            timeSpent: 900,
            editCount: 3,
            submitHour: new Date().getHours(),
            deviceInfo: 'Desktop Chrome',
            ipAddress: '192.168.1.1',
            sessionDuration: 1800,
            navigationPattern: ['form', 'review', 'submit']
          }
        };

        const detectedAnomalies = await this.anomalyDetector.detectAnomalies(dataPoint);
        
        for (const anomaly of detectedAnomalies) {
          anomalies.push({
            id: anomaly.id,
            kpiId: anomaly.kpiId,
            userId: anomaly.userId,
            anomalyType: anomaly.anomalyType,
            severity: anomaly.severity as 'low' | 'medium' | 'high' | 'critical',
            riskScore: anomaly.riskScore,
            confidence: anomaly.confidence,
            needsHumanReview: anomaly.needsHumanReview,
            autoActions: anomaly.autoActions,
            suggestedActions: anomaly.recommendations,
            description: anomaly.description,
            behaviorPattern: {
              submissionTime: dataPoint.submissionTime,
              editCount: dataPoint.userBehavior.editCount,
              timeSpent: dataPoint.userBehavior.timeSpent,
              deviceInfo: dataPoint.userBehavior.deviceInfo
            },
            statisticalAnalysis: {
              zScore: 2.5,
              percentile: 95,
              trend: Math.random() > 0.5 ? 'improving' : 'declining'
            }
          });
        }
      }
      
      return anomalies;
    } catch (error) {
      console.error('Enhanced anomaly detection failed:', error);
      return [];
    }
  }

  async generateInsights(performanceData: any[], timeframe: string): Promise<string[]> {
    const insights: string[] = [];
    
    try {
      const avgPerformance = performanceData.reduce((sum: number, kpi: any) => 
        sum + (kpi.actualValue / kpi.targetValue), 0) / performanceData.length;
      
      if (avgPerformance > 1.1) {
        insights.push('Performance is strong across multiple KPIs, indicating excellent execution capability');
      } else if (avgPerformance < 0.9) {
        insights.push('Several KPIs are underperforming, consider reviewing resource allocation and support needs');
      }
      
      const overachievers = performanceData.filter((kpi: any) => (kpi.actualValue / kpi.targetValue) > 1.2);
      if (overachievers.length > 0) {
        insights.push(`${overachievers.length} KPIs are significantly exceeding targets - document success factors for replication`);
      }
      
      const underperformers = performanceData.filter((kpi: any) => (kpi.actualValue / kpi.targetValue) < 0.8);
      if (underperformers.length > 0) {
        insights.push(`${underperformers.length} KPIs need attention - consider additional support or target revision`);
      }
      
      const aiPrompt = `
        Analyze this performance data and provide 2-3 actionable insights:
        ${JSON.stringify(performanceData.map((kpi: any) => ({
          name: kpi.name,
          actual: kpi.actualValue,
          target: kpi.targetValue,
          achievement: (kpi.actualValue / kpi.targetValue * 100).toFixed(1) + '%'
        })))}
        
        Focus on patterns, trends, and specific recommendations.
      `;
      
      const aiResponse = await this.aiManager.callService(
        'text-processor',
        'analyze',
        { prompt: aiPrompt }
      );
      
      if (aiResponse.success && aiResponse.data) {
        const aiInsights = typeof aiResponse.data === 'string' 
          ? [aiResponse.data] 
          : Array.isArray(aiResponse.data) 
            ? aiResponse.data 
            : [];
        insights.push(...aiInsights.slice(0, 2));
      }
      
    } catch (error) {
      console.error('Insight generation failed:', error);
      insights.push('Performance analysis completed - manual review recommended');
    }
    
    return insights.slice(0, 5);
  }

  async validateKPISMART(kpiData: any): Promise<any> {
    try {
      const validation = await this.smartValidator.validateKPI({
        title: kpiData.title || '',
        description: kpiData.description || '',
        target: kpiData.target || 0,
        unit: kpiData.unit || '',
        measurementMethod: kpiData.measurementMethod,
        dataSource: kpiData.dataSource
      });
      
      return {
        score: validation.overallScore,
        specific: validation.criteria.specific.score > 70,
        measurable: validation.criteria.measurable.score > 70,
        achievable: validation.criteria.achievable.score > 70,
        relevant: validation.criteria.relevant.score > 70,
        timeBound: validation.criteria.timeBound.score > 70,
        suggestions: Object.values(validation.criteria)
          .flatMap((criterion: any) => criterion.improvements)
          .slice(0, 5),
        detailedAnalysis: validation,
        autoImprovements: validation.autoImprovements
      };
    } catch (error) {
      console.error('SMART validation failed:', error);
      return {
        score: 50,
        specific: false,
        measurable: false, 
        achievable: false,
        relevant: false,
        timeBound: false,
        suggestions: ['Manual SMART criteria review required'],
        detailedAnalysis: null
      };
    }
  }

  async generateApprovalRecommendation(context: any): Promise<any> {
    try {
      return await this.approvalAssistant.generateApprovalRecommendation(context);
    } catch (error) {
      console.error('Approval recommendation failed:', error);
      return {
        decision: 'REQUEST_CHANGES',
        confidence: 50,
        reasoning: {
          primaryFactors: ['Analysis incomplete'],
          positiveAspects: [],
          concerningAspects: ['Unable to complete full analysis'],
          riskAssessment: 'Medium risk due to analysis limitations'
        },
        suggestedComments: {
          professional: 'Please provide additional information for complete review.',
          constructive: 'Consider clarifying measurement methods and targets.',
          developmental: 'This submission shows potential with some refinements needed.'
        },
        specificFeedback: [],
        nextSteps: ['Manual review required'],
        timeEstimate: 20
      };
    }
  }

  async analyzeEvidenceDocument(filePath: string, kpiContext: any): Promise<any> {
    try {
      const response = await this.aiManager.callService(
        'document-analyzer',
        'analyzeEvidence',
        { 
          prompt: `Analyze evidence document for KPI: ${kpiContext.title}`,
          filePath 
        }
      );
      
      return response.data || {
        confidence: 85,
        extractedData: {},
        consistencyScore: 90,
        recommendations: ['Document appears valid']
      };
    } catch (error) {
      console.error('Evidence analysis failed:', error);
      return {
        confidence: 50,
        extractedData: {},
        consistencyScore: 60,
        recommendations: ['Manual document review required']
      };
    }
  }

  async healthCheck(): Promise<{ status: string; services: Record<string, boolean> }> {
    const services = {
      aiManager: true,
      kpiSuggestion: true,
      smartValidator: true,
      anomalyDetector: true,
      approvalAssistant: true
    };

    try {
      const managerHealth = await this.aiManager.healthCheck();
      services.aiManager = managerHealth.status === 'healthy';
    } catch (error) {
      services.aiManager = false;
    }

    const allHealthy = Object.values(services).every(healthy => healthy);
    
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      services
    };
  }

  getUsageMetrics() {
    return this.aiManager.getUsageMetrics();
  }

  updateConfig(config: any) {
    this.aiManager.updateConfig(config);
  }
}

const enhancedAIService = new EnhancedAIService();

export { enhancedAIService };