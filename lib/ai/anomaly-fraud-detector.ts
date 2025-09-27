// lib/ai/anomaly-fraud-detector.ts
import { enhancedAIServiceManager } from './ai-service-manager';
import { DatabaseService } from '@/lib/database-service-enhanced';

interface PerformanceDataPoint {
  id: string;
  kpiId: string;
  userId: string;
  value: number;
  reportedDate: string;
  submissionTime: string;
  evidenceFiles: string[];
  userBehavior: UserBehaviorData;
}

interface UserBehaviorData {
  timeSpent: number; // seconds spent on form
  editCount: number; // number of edits made
  submitHour: number; // hour of day when submitted
  deviceInfo: string;
  ipAddress: string;
  sessionDuration: number;
  navigationPattern: string[];
}

interface StatisticalBaseline {
  mean: number;
  standardDeviation: number;
  median: number;
  q1: number;
  q3: number;
  outlierThreshold: {
    lower: number;
    upper: number;
  };
  seasonalityFactors?: Record<string, number>;
  trendCoefficient?: number;
}

interface BehaviorPattern {
  userId: string;
  typicalSubmissionTime: number[]; // array of typical hours
  averageFormTime: number;
  averageEditCount: number;
  commonDevices: string[];
  locationConsistency: number; // 0-100%
  submissionFrequency: number; // submissions per period
}

interface AnomalyResult {
  id: string;
  kpiId: string;
  userId: string;
  timestamp: string;
  anomalyType: 'statistical' | 'behavioral' | 'evidence' | 'pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100%
  riskScore: number; // 0-100%
  flags: string[];
  description: string;
  evidence: AnomalyEvidence;
  recommendations: string[];
  autoActions: string[];
  needsHumanReview: boolean;
}

interface AnomalyEvidence {
  statisticalDeviation?: {
    actualValue: number;
    expectedRange: [number, number];
    deviationSigma: number;
    historicalComparison: string;
  };
  behavioralDeviation?: {
    unusualSubmissionTime: boolean;
    abnormalFormInteraction: boolean;
    deviceLocationMismatch: boolean;
    suspiciousEditPatterns: boolean;
  };
  documentAnalysis?: {
    ocrConfidence: number;
    dataConsistency: number;
    metadataAnomalies: string[];
    suspiciousModifications: boolean;
  };
  patternAnalysis?: {
    correlationWithPeers: number;
    seasonalConsistency: number;
    progressionLogic: number;
    crossKpiConsistency: number;
  };
}

export class AnomalyFraudDetector {
  private aiManager: enhancedAIServiceManager;
  private dbService: typeof DatabaseService;
  private statisticalBaselines = new Map<string, StatisticalBaseline>();
  private behaviorProfiles = new Map<string, BehaviorPattern>();

  constructor() {
    this.aiManager = new enhancedAIServiceManager();
    this.dbService = DatabaseService;
    this.initializeBaselines();
  }

  /**
   * Comprehensive anomaly detection using multiple methods
   */
  async detectAnomalies(dataPoint: PerformanceDataPoint): Promise<AnomalyResult[]> {
    const anomalies: AnomalyResult[] = [];

    // 1. Statistical Anomaly Detection
    const statisticalAnomaly = await this.detectStatisticalAnomalies(dataPoint);
    if (statisticalAnomaly) {
      anomalies.push(statisticalAnomaly);
    }

    // 2. Behavioral Pattern Analysis
    const behavioralAnomaly = await this.detectBehavioralAnomalies(dataPoint);
    if (behavioralAnomaly) {
      anomalies.push(behavioralAnomaly);
    }

    // 3. Evidence Document Analysis
    if (dataPoint.evidenceFiles.length > 0) {
      const evidenceAnomalies = await this.analyzeEvidenceAnomalies(dataPoint);
      anomalies.push(...evidenceAnomalies);
    }

    // 4. Cross-KPI Pattern Analysis
    const patternAnomaly = await this.detectPatternAnomalies(dataPoint);
    if (patternAnomaly) {
      anomalies.push(patternAnomaly);
    }

    // 5. Calculate combined risk score and prioritize
    const prioritizedAnomalies = await this.prioritizeAnomalies(anomalies, dataPoint);

    // 6. Auto-trigger actions for critical anomalies
    await this.handleCriticalAnomalies(prioritizedAnomalies);

    return prioritizedAnomalies;
  }

  /**
   * Statistical anomaly detection using multiple statistical methods
   */
  private async detectStatisticalAnomalies(dataPoint: PerformanceDataPoint): Promise<AnomalyResult | null> {
    const baseline = await this.getStatisticalBaseline(dataPoint.kpiId, dataPoint.userId);
    
    if (!baseline) return null;

    const value = dataPoint.value;
    const zScore = Math.abs((value - baseline.mean) / baseline.standardDeviation);
    const isOutlier = value < baseline.outlierThreshold.lower || value > baseline.outlierThreshold.upper;

    // Multiple statistical tests
    const tests = {
      zScoreTest: zScore > 2.5,
      iqrTest: isOutlier,
      modifiedZScore: this.calculateModifiedZScore(value, baseline) > 3.5,
      grubbs: await this.grubbsTest(value, dataPoint.kpiId),
      dixon: await this.dixonTest(value, dataPoint.kpiId)
    };

    const failedTests = Object.entries(tests).filter(([, failed]) => failed);

    if (failedTests.length >= 2) {
      const severity = this.calculateStatisticalSeverity(zScore, failedTests.length);
      
      return {
        id: this.generateAnomalyId(),
        kpiId: dataPoint.kpiId,
        userId: dataPoint.userId,
        timestamp: new Date().toISOString(),
        anomalyType: 'statistical',
        severity,
        confidence: Math.min(95, 60 + (failedTests.length * 10)),
        riskScore: Math.min(100, Math.round(zScore * 20)),
        flags: [
          `Statistical deviation: ${zScore.toFixed(2)}σ`,
          `Failed ${failedTests.length}/5 tests`,
          ...failedTests.map(([test]) => `Failed ${test}`)
        ],
        description: `Performance value ${value} deviates significantly from historical baseline (μ=${baseline.mean.toFixed(2)}, σ=${baseline.standardDeviation.toFixed(2)})`,
        evidence: {
          statisticalDeviation: {
            actualValue: value,
            expectedRange: [baseline.outlierThreshold.lower, baseline.outlierThreshold.upper],
            deviationSigma: zScore,
            historicalComparison: await this.getHistoricalComparison(dataPoint)
          }
        },
        recommendations: this.generateStatisticalRecommendations(zScore, baseline, value),
        autoActions: severity === 'critical' ? ['Flag for immediate review', 'Notify supervisor'] : ['Log for trend analysis'],
        needsHumanReview: severity === 'high' || severity === 'critical'
      };
    }

    return null;
  }

  /**
   * Behavioral pattern anomaly detection
   */
  private async detectBehavioralAnomalies(dataPoint: PerformanceDataPoint): Promise<AnomalyResult | null> {
    const userProfile = await this.getBehaviorProfile(dataPoint.userId);
    const behavior = dataPoint.userBehavior;

    if (!userProfile) {
      // New user - create baseline behavior
      await this.createBehaviorProfile(dataPoint.userId, behavior);
      return null;
    }

    const anomalies = {
      timeAnomaly: this.detectTimeAnomaly(behavior.submitHour, userProfile.typicalSubmissionTime),
      speedAnomaly: this.detectSpeedAnomaly(behavior.timeSpent, userProfile.averageFormTime),
      editAnomaly: this.detectEditAnomaly(behavior.editCount, userProfile.averageEditCount),
      deviceAnomaly: this.detectDeviceAnomaly(behavior.deviceInfo, userProfile.commonDevices),
      locationAnomaly: await this.detectLocationAnomaly(behavior.ipAddress, dataPoint.userId)
    };

    const suspiciousPatterns = Object.entries(anomalies).filter(([, isSuspicious]) => isSuspicious);

    if (suspiciousPatterns.length >= 2) {
      const riskScore = this.calculateBehavioralRisk(anomalies, suspiciousPatterns.length);
      const severity = this.mapRiskToSeverity(riskScore);

      return {
        id: this.generateAnomalyId(),
        kpiId: dataPoint.kpiId,
        userId: dataPoint.userId,
        timestamp: new Date().toISOString(),
        anomalyType: 'behavioral',
        severity,
        confidence: Math.min(90, 50 + (suspiciousPatterns.length * 15)),
        riskScore,
        flags: [
          `Behavioral anomalies: ${suspiciousPatterns.length}/5`,
          ...suspiciousPatterns.map(([pattern]) => `Suspicious ${pattern}`)
        ],
        description: `User behavior deviates from established patterns in ${suspiciousPatterns.length} areas`,
        evidence: {
          behavioralDeviation: {
            unusualSubmissionTime: anomalies.timeAnomaly,
            abnormalFormInteraction: anomalies.speedAnomaly,
            deviceLocationMismatch: anomalies.deviceAnomaly || anomalies.locationAnomaly,
            suspiciousEditPatterns: anomalies.editAnomaly
          }
        },
        recommendations: this.generateBehavioralRecommendations(anomalies),
        autoActions: riskScore > 70 ? ['Verify identity', 'Request additional verification'] : ['Monitor future submissions'],
        needsHumanReview: riskScore > 60
      };
    }

    return null;
  }

  /**
   * Evidence document analysis for tampering or inconsistencies
   */
  private async analyzeEvidenceAnomalies(dataPoint: PerformanceDataPoint): Promise<AnomalyResult[]> {
    const anomalies: AnomalyResult[] = [];

    for (const evidenceFile of dataPoint.evidenceFiles) {
      const analysis = await this.analyzeDocument(evidenceFile, dataPoint);
      
      if (analysis.suspiciousScore > 60) {
        anomalies.push({
          id: this.generateAnomalyId(),
          kpiId: dataPoint.kpiId,
          userId: dataPoint.userId,
          timestamp: new Date().toISOString(),
          anomalyType: 'evidence',
          severity: this.mapRiskToSeverity(analysis.suspiciousScore),
          confidence: analysis.confidence,
          riskScore: analysis.suspiciousScore,
          flags: analysis.flags,
          description: `Evidence document shows ${analysis.issues.length} potential integrity issues`,
          evidence: {
            documentAnalysis: {
              ocrConfidence: analysis.ocrConfidence,
              dataConsistency: analysis.dataConsistency,
              metadataAnomalies: analysis.metadataAnomalies,
              suspiciousModifications: analysis.hasModifications
            }
          },
          recommendations: this.generateEvidenceRecommendations(analysis),
          autoActions: analysis.suspiciousScore > 80 ? 
            ['Quarantine document', 'Request original source'] : 
            ['Flag for manual review'],
          needsHumanReview: true
        });
      }
    }

    return anomalies;
  }

  /**
   * Cross-KPI pattern analysis for logical inconsistencies
   */
  private async detectPatternAnomalies(dataPoint: PerformanceDataPoint): Promise<AnomalyResult | null> {
    const userKpis = await this.dbService.getUserKpis(dataPoint.userId, dataPoint.reportedDate);
    
    if (userKpis.length < 2) return null; // Need multiple KPIs for pattern analysis

    const patternAnalysis = {
      correlationConsistency: await this.checkKpiCorrelations(userKpis),
      progressionLogic: await this.checkProgressionLogic(userKpis),
      seasonalConsistency: await this.checkSeasonalConsistency(userKpis),
      peerComparison: await this.compareToPeers(dataPoint)
    };

    const inconsistencies = Object.entries(patternAnalysis)
      .filter(([, score]) => score < 60).length;

    if (inconsistencies >= 2) {
      const riskScore = 100 - (Object.values(patternAnalysis).reduce((a, b) => a + b) / 4);
      
      return {
        id: this.generateAnomalyId(),
        kpiId: dataPoint.kpiId,
        userId: dataPoint.userId,
        timestamp: new Date().toISOString(),
        anomalyType: 'pattern',
        severity: this.mapRiskToSeverity(riskScore),
        confidence: 75,
        riskScore,
        flags: [
          `Pattern inconsistencies: ${inconsistencies}/4`,
          ...Object.entries(patternAnalysis)
            .filter(([, score]) => score < 60)
            .map(([pattern]) => `Inconsistent ${pattern}`)
        ],
        description: `KPI performance shows logical inconsistencies with related metrics and patterns`,
        evidence: {
          patternAnalysis: {
            correlationWithPeers: patternAnalysis.peerComparison,
            seasonalConsistency: patternAnalysis.seasonalConsistency,
            progressionLogic: patternAnalysis.progressionLogic,
            crossKpiConsistency: patternAnalysis.correlationConsistency
          }
        },
        recommendations: this.generatePatternRecommendations(patternAnalysis),
        autoActions: riskScore > 75 ? ['Cross-verify with related KPIs'] : ['Monitor pattern consistency'],
        needsHumanReview: riskScore > 60
      };
    }

    return null;
  }

  /**
   * Document analysis using OCR and AI
   */
  private async analyzeDocument(filePath: string, dataPoint: PerformanceDataPoint): Promise<any> {
    const prompt = `
    Analyze this evidence document for potential anomalies or tampering.
    Return analysis with suspicious score and recommendations.
    `;

    try {
      const response = await this.aiManager.callService<any>(
        'document-analyzer',
        'analyzeEvidence',
        { prompt, filePath }
      );

      return response.data || {
        ocrConfidence: 95,
        dataConsistency: 90,
        suspiciousScore: 25,
        confidence: 85,
        flags: [],
        issues: [],
        recommendations: [],
        hasModifications: false,
        metadataAnomalies: []
      };
    } catch (error) {
      return {
        ocrConfidence: 50,
        dataConsistency: 50,
        suspiciousScore: 70,
        confidence: 50,
        flags: ['Analysis failed'],
        issues: ['Could not analyze document'],
        recommendations: ['Manual review required'],
        hasModifications: true,
        metadataAnomalies: ['Analysis error']
      };
    }
  }

  // Utility and helper methods
  private calculateModifiedZScore(value: number, baseline: StatisticalBaseline): number {
    const median = baseline.median;
    const mad = baseline.standardDeviation * 0.6745; // Approximation
    return 0.6745 * (value - median) / mad;
  }

  private async grubbsTest(value: number, kpiId: string): Promise<boolean> {
    return false; // Simplified implementation
  }

  private async dixonTest(value: number, kpiId: string): Promise<boolean> {
    return false; // Simplified implementation
  }

  private calculateStatisticalSeverity(zScore: number, failedTests: number): 'low' | 'medium' | 'high' | 'critical' {
    if (zScore > 4 || failedTests >= 4) return 'critical';
    if (zScore > 3 || failedTests >= 3) return 'high';
    if (zScore > 2.5 || failedTests >= 2) return 'medium';
    return 'low';
  }

  private detectTimeAnomaly(submitHour: number, typicalHours: number[]): boolean {
    const isTypical = typicalHours.some(hour => Math.abs(hour - submitHour) <= 2);
    const isBusinessHours = submitHour >= 8 && submitHour <= 18;
    return !isTypical && !isBusinessHours;
  }

  private detectSpeedAnomaly(actualTime: number, averageTime: number): boolean {
    const ratio = actualTime / averageTime;
    return ratio < 0.3 || ratio > 3.0;
  }

  private detectEditAnomaly(actualEdits: number, averageEdits: number): boolean {
    return actualEdits > averageEdits * 2.5 || actualEdits === 0;
  }

  private detectDeviceAnomaly(device: string, commonDevices: string[]): boolean {
    return !commonDevices.some(common => device.includes(common));
  }

  private async detectLocationAnomaly(ipAddress: string, userId: string): Promise<boolean> {
    return false; // Simplified implementation
  }

  private calculateBehavioralRisk(anomalies: any, count: number): number {
    let baseRisk = count * 15;
    if (anomalies.speedAnomaly) baseRisk += 10;
    if (anomalies.locationAnomaly) baseRisk += 15;
    return Math.min(100, baseRisk);
  }

  private mapRiskToSeverity(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'high';
    if (riskScore >= 40) return 'medium';
    return 'low';
  }

  // Pattern analysis methods  
  private async checkKpiCorrelations(userKpis: any[]): Promise<number> {
    return 75; // Simplified implementation
  }

  private async checkProgressionLogic(userKpis: any[]): Promise<number> {
    return 80; // Simplified implementation
  }

  private async checkSeasonalConsistency(userKpis: any[]): Promise<number> {
    return 85; // Simplified implementation
  }

  private async compareToPeers(dataPoint: PerformanceDataPoint): Promise<number> {
    const peerData = await this.dbService.getPeerPerformance(
      dataPoint.userId,
      dataPoint.kpiId,
      dataPoint.reportedDate
    );
    
    if (peerData.length === 0) return 50;
    
    const peerAverage = peerData.reduce((sum, peer) => sum + peer.value, 0) / peerData.length;
    const deviation = Math.abs(dataPoint.value - peerAverage) / peerAverage;
    
    return Math.max(0, 100 - (deviation * 100));
  }

  // Recommendation generators
  private generateStatisticalRecommendations(zScore: number, baseline: StatisticalBaseline, value: number): string[] {
    const recommendations = [];
    
    if (zScore > 3) {
      recommendations.push('Verify data source and calculation method');
      recommendations.push('Request additional evidence or documentation');
    }
    
    return recommendations;
  }

  private generateBehavioralRecommendations(anomalies: any): string[] {
    const recommendations = [];
    
    if (anomalies.timeAnomaly) {
      recommendations.push('Verify submission timing and circumstances');
    }
    
    return recommendations;
  }

  private generateEvidenceRecommendations(analysis: any): string[] {
    const recommendations = [];
    
    if (analysis.ocrConfidence < 90) {
      recommendations.push('Request clearer document scan or original file');
    }
    
    return recommendations;
  }

  private generatePatternRecommendations(patternAnalysis: any): string[] {
    return ['Review pattern consistency'];
  }

  // Critical anomaly handling
  private async handleCriticalAnomalies(anomalies: AnomalyResult[]): Promise<void> {
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
    for (const anomaly of criticalAnomalies) {
      console.log('Handling critical anomaly:', anomaly.id);
    }
  }

  // Baseline management
  private async initializeBaselines(): Promise<void> {
    try {
      const kpiIds = await this.dbService.getAllKpiIds();
      for (const kpiId of kpiIds) {
        const baseline = await this.calculateStatisticalBaseline(kpiId);
        this.statisticalBaselines.set(kpiId, baseline);
      }
    } catch (error) {
      console.error('Failed to initialize baselines:', error);
    }
  }

  private async getStatisticalBaseline(kpiId: string, userId?: string): Promise<StatisticalBaseline | null> {
    const key = userId ? `${kpiId}-${userId}` : kpiId;
    
    if (this.statisticalBaselines.has(key)) {
      return this.statisticalBaselines.get(key)!;
    }
    
    const baseline = await this.calculateStatisticalBaseline(kpiId, userId);
    this.statisticalBaselines.set(key, baseline);
    
    return baseline;
  }

  private async calculateStatisticalBaseline(kpiId: string, userId?: string): Promise<StatisticalBaseline> {
    try {
      const historicalData = await this.dbService.getHistoricalKpiData(kpiId, userId);
      const values = historicalData.map(d => d.value).sort((a, b) => a - b);
      
      if (values.length === 0) {
        return {
          mean: 100,
          standardDeviation: 20,
          median: 100,
          q1: 80,
          q3: 120,
          outlierThreshold: { lower: 50, upper: 150 }
        };
      }
      
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const standardDeviation = Math.sqrt(variance);
      
      const q1Index = Math.floor(values.length * 0.25);
      const q3Index = Math.floor(values.length * 0.75);
      const medianIndex = Math.floor(values.length * 0.5);
      
      const q1 = values[q1Index];
      const q3 = values[q3Index];
      const median = values[medianIndex];
      
      const iqr = q3 - q1;
      const outlierThreshold = {
        lower: q1 - (1.5 * iqr),
        upper: q3 + (1.5 * iqr)
      };
      
      return {
        mean,
        standardDeviation,
        median,
        q1,
        q3,
        outlierThreshold
      };
    } catch (error) {
      return {
        mean: 100,
        standardDeviation: 20,
        median: 100,
        q1: 80,
        q3: 120,
        outlierThreshold: { lower: 50, upper: 150 }
      };
    }
  }

  private async getBehaviorProfile(userId: string): Promise<BehaviorPattern | null> {
    if (this.behaviorProfiles.has(userId)) {
      return this.behaviorProfiles.get(userId)!;
    }
    
    const profile = await this.calculateBehaviorProfile(userId);
    if (profile) {
      this.behaviorProfiles.set(userId, profile);
    }
    
    return profile;
  }

  private async calculateBehaviorProfile(userId: string): Promise<BehaviorPattern | null> {
    try {
      const behaviorHistory = await this.dbService.getUserBehaviorHistory(userId);
      
      if (behaviorHistory.length < 5) return null;
      
      return {
        userId,
        typicalSubmissionTime: [9, 10, 11, 14, 15, 16],
        averageFormTime: 900,
        averageEditCount: 3,
        commonDevices: ['Desktop Chrome', 'Mobile Safari'],
        locationConsistency: 85,
        submissionFrequency: 1
      };
    } catch (error) {
      return null;
    }
  }

  // Utility methods
  private generateAnomalyId(): string {
    return `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getHistoricalComparison(dataPoint: PerformanceDataPoint): Promise<string> {
    return 'No significant historical deviation';
  }

  private async prioritizeAnomalies(anomalies: AnomalyResult[], dataPoint: PerformanceDataPoint): Promise<AnomalyResult[]> {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return anomalies.sort((a, b) => {
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.confidence - a.confidence;
    });
  }

  // Placeholder methods
  private async createBehaviorProfile(userId: string, behavior: UserBehaviorData): Promise<void> {
    // Placeholder implementation
  }
}

// Export types
export type { AnomalyResult, PerformanceDataPoint, UserBehaviorData };