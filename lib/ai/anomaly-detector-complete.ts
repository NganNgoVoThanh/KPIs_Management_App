// lib/ai/anomaly-detector-complete.ts
// Complete Anomaly & Fraud Detection Implementation

import { enhancedAIServiceManager } from './ai-service-manager';

interface AnomalyInput {
  kpiId: string;
  userId: string;
  actualValue: number;
  target: number;
  type: string;
  submittedAt: string;
  historicalData: HistoricalDataPoint[];
  peerData: PeerDataPoint[];
  evidence?: EvidenceFile[];
  behaviorMetrics?: BehaviorMetrics;
}

interface HistoricalDataPoint {
  cycleId: string;
  year: number;
  quarter?: number;
  actualValue: number;
  target: number;
  percentage: number;
  score: number;
}

interface PeerDataPoint {
  userId: string;
  department: string;
  jobTitle: string;
  actualValue: number;
  target: number;
  percentage: number;
}

interface EvidenceFile {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  metadata?: Record<string, any>;
}

interface BehaviorMetrics {
  submissionTime: string; // ISO timestamp
  editCount: number;
  timeSpentMinutes: number;
  deviceInfo: string;
  ipAddress: string;
  previousSubmissions: number;
}

interface AnomalyResult {
  id: string;
  kpiId: string;
  userId: string;
  anomalyType: 'statistical' | 'behavioral' | 'evidence' | 'pattern' | 'none';
  severity: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100
  confidence: number; // 0-1
  needsHumanReview: boolean;
  autoActions: string[];
  description: string;
  detailedFindings: DetailedFinding[];
  recommendations: string[];
  detectedAt: string;
}

interface DetailedFinding {
  category: string;
  finding: string;
  evidence: string;
  impact: 'low' | 'medium' | 'high';
}

interface StatisticalAnalysis {
  mean: number;
  median: number;
  stdDev: number;
  zScore: number;
  iqr: number;
  q1: number;
  q3: number;
  isOutlier: boolean;
  outlierMethod: string[];
  percentile: number;
}

export class CompleteAnomalyDetector {
  private aiManager: enhancedAIServiceManager;

  constructor() {
    this.aiManager = new enhancedAIServiceManager();
  }

  /**
   * Main entry point: Analyze KPI submission for anomalies
   */
  async analyzeKpiSubmission(input: AnomalyInput): Promise<AnomalyResult> {
    const findings: DetailedFinding[] = [];
    let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let totalRiskScore = 0;
    let anomalyType: AnomalyResult['anomalyType'] = 'none';

    // 1. Statistical Analysis
    if (input.historicalData.length >= 3) {
      const statAnalysis = await this.performStatisticalAnalysis(input);
      if (statAnalysis.isOutlier) {
        findings.push(...this.generateStatisticalFindings(statAnalysis, input));
        anomalyType = 'statistical';
        maxSeverity = this.escalateSeverity(maxSeverity, statAnalysis.zScore > 3 ? 'high' : 'medium');
        totalRiskScore += Math.min(Math.abs(statAnalysis.zScore) * 20, 40);
      }
    }

    // 2. Peer Comparison
    if (input.peerData.length >= 3) {
      const peerAnalysis = await this.analyzePeerComparison(input);
      if (peerAnalysis.isAnomalous) {
        findings.push(...peerAnalysis.findings);
        if (anomalyType === 'none') anomalyType = 'pattern';
        maxSeverity = this.escalateSeverity(maxSeverity, peerAnalysis.severity);
        totalRiskScore += peerAnalysis.riskContribution;
      }
    }

    // 3. Behavioral Analysis
    if (input.behaviorMetrics) {
      const behaviorAnalysis = await this.analyzeBehaviorPattern(input.behaviorMetrics);
      if (behaviorAnalysis.isSuspicious) {
        findings.push(...behaviorAnalysis.findings);
        if (anomalyType === 'none') anomalyType = 'behavioral';
        maxSeverity = this.escalateSeverity(maxSeverity, behaviorAnalysis.severity);
        totalRiskScore += behaviorAnalysis.riskContribution;
      }
    }

    // 4. Evidence Quality Check
    if (input.evidence && input.evidence.length > 0) {
      const evidenceAnalysis = await this.analyzeEvidenceQuality(input.evidence);
      if (evidenceAnalysis.hasIssues) {
        findings.push(...evidenceAnalysis.findings);
        if (anomalyType === 'none') anomalyType = 'evidence';
        maxSeverity = this.escalateSeverity(maxSeverity, evidenceAnalysis.severity);
        totalRiskScore += evidenceAnalysis.riskContribution;
      }
    }

    // 5. AI-Powered Pattern Recognition
    const aiAnalysis = await this.performAIPatternAnalysis(input, findings);
    if (aiAnalysis.additionalRisks.length > 0) {
      findings.push(...aiAnalysis.additionalRisks);
      totalRiskScore += aiAnalysis.riskContribution;
    }

    // Cap risk score at 100
    const finalRiskScore = Math.min(totalRiskScore, 100);

    // Determine if human review needed
    const needsHumanReview = finalRiskScore > 60 || maxSeverity === 'high' || maxSeverity === 'critical';

    // Generate auto-actions
    const autoActions = this.generateAutoActions(finalRiskScore, maxSeverity, anomalyType);

    // Generate recommendations
    const recommendations = this.generateRecommendations(findings, input);

    return {
      id: `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      kpiId: input.kpiId,
      userId: input.userId,
      anomalyType: findings.length > 0 ? anomalyType : 'none',
      severity: maxSeverity,
      riskScore: Math.round(finalRiskScore),
      confidence: findings.length > 0 ? this.calculateConfidence(findings) : 1,
      needsHumanReview,
      autoActions,
      description: this.generateDescription(findings, finalRiskScore, anomalyType),
      detailedFindings: findings,
      recommendations,
      detectedAt: new Date().toISOString()
    };
  }

  /**
   * Statistical Analysis: Z-Score, IQR, Grubbs, Dixon
   */
  private async performStatisticalAnalysis(input: AnomalyInput): Promise<StatisticalAnalysis & { isOutlier: boolean }> {
    const values = input.historicalData.map(d => d.percentage);
    values.push((input.actualValue / input.target) * 100);

    // Calculate statistics
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const sortedValues = [...values].sort((a, b) => a - b);
    const median = sortedValues[Math.floor(sortedValues.length / 2)];

    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const currentValue = (input.actualValue / input.target) * 100;
    const zScore = stdDev > 0 ? (currentValue - mean) / stdDev : 0;

    // IQR Method
    const q1Index = Math.floor(sortedValues.length * 0.25);
    const q3Index = Math.floor(sortedValues.length * 0.75);
    const q1 = sortedValues[q1Index];
    const q3 = sortedValues[q3Index];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    // Determine outliers
    const outlierMethods: string[] = [];

    // Z-Score method (3 sigma rule)
    if (Math.abs(zScore) > 3) {
      outlierMethods.push('Z-Score (3σ)');
    }

    // IQR method
    if (currentValue < lowerBound || currentValue > upperBound) {
      outlierMethods.push('IQR Method');
    }

    // Grubbs Test (simplified)
    if (values.length >= 7) {
      const maxDeviation = Math.max(...values.map(v => Math.abs(v - mean)));
      const grubbsStatistic = maxDeviation / stdDev;
      const grubbs95 = 2.5; // Simplified critical value for n=7-10
      if (grubbsStatistic > grubbs95 && Math.abs(currentValue - mean) === maxDeviation) {
        outlierMethods.push('Grubbs Test');
      }
    }

    const percentile = (sortedValues.filter(v => v <= currentValue).length / sortedValues.length) * 100;

    return {
      mean,
      median,
      stdDev,
      zScore,
      iqr,
      q1,
      q3,
      isOutlier: outlierMethods.length > 0,
      outlierMethod: outlierMethods,
      percentile
    };
  }

  /**
   * Generate findings from statistical analysis
   */
  private generateStatisticalFindings(analysis: StatisticalAnalysis, input: AnomalyInput): DetailedFinding[] {
    const findings: DetailedFinding[] = [];

    if (Math.abs(analysis.zScore) > 3) {
      findings.push({
        category: 'Statistical Anomaly',
        finding: `Actual value is ${Math.abs(analysis.zScore).toFixed(2)} standard deviations from historical mean`,
        evidence: `Z-Score: ${analysis.zScore.toFixed(2)}, Mean: ${analysis.mean.toFixed(1)}%, StdDev: ${analysis.stdDev.toFixed(1)}%`,
        impact: Math.abs(analysis.zScore) > 4 ? 'high' : 'medium'
      });
    }

    if (analysis.percentile > 95 || analysis.percentile < 5) {
      findings.push({
        category: 'Extreme Performance',
        finding: `Performance at ${analysis.percentile.toFixed(1)}th percentile (extreme ${analysis.percentile > 50 ? 'high' : 'low'})`,
        evidence: `Current: ${((input.actualValue / input.target) * 100).toFixed(1)}%, Historical range: ${analysis.q1.toFixed(1)}% - ${analysis.q3.toFixed(1)}%`,
        impact: 'medium'
      });
    }

    return findings;
  }

  /**
   * Peer Comparison Analysis
   */
  private async analyzePeerComparison(input: AnomalyInput): Promise<{
    isAnomalous: boolean;
    findings: DetailedFinding[];
    severity: 'low' | 'medium' | 'high';
    riskContribution: number;
  }> {
    const findings: DetailedFinding[] = [];
    let riskContribution = 0;

    const peerValues = input.peerData.map(p => p.percentage);
    const currentValue = (input.actualValue / input.target) * 100;

    const peerMean = peerValues.reduce((sum, v) => sum + v, 0) / peerValues.length;
    const deviation = currentValue - peerMean;
    const deviationPercent = (deviation / peerMean) * 100;

    // Check if significantly different from peers
    if (Math.abs(deviationPercent) > 50) {
      findings.push({
        category: 'Peer Comparison',
        finding: `Performance ${deviationPercent > 0 ? 'exceeds' : 'falls below'} peer average by ${Math.abs(deviationPercent).toFixed(1)}%`,
        evidence: `Your performance: ${currentValue.toFixed(1)}%, Peer average: ${peerMean.toFixed(1)}%`,
        impact: Math.abs(deviationPercent) > 100 ? 'high' : 'medium'
      });
      riskContribution = Math.min(Math.abs(deviationPercent) / 2, 30);
    }

    // Check if only one performing this well/poorly
    const similarPeers = peerValues.filter(v => Math.abs(v - currentValue) < 10).length;
    if (similarPeers === 0 && peerValues.length >= 5) {
      findings.push({
        category: 'Unique Performance',
        finding: 'No peers achieved similar results',
        evidence: `0 out of ${peerValues.length} peers within 10% range`,
        impact: 'medium'
      });
      riskContribution += 15;
    }

    const severity: 'low' | 'medium' | 'high' =
      findings.some(f => f.impact === 'high') ? 'high' :
      findings.length > 0 ? 'medium' : 'low';

    return {
      isAnomalous: findings.length > 0,
      findings,
      severity,
      riskContribution
    };
  }

  /**
   * Behavioral Pattern Analysis
   */
  private async analyzeBehaviorPattern(metrics: BehaviorMetrics): Promise<{
    isSuspicious: boolean;
    findings: DetailedFinding[];
    severity: 'low' | 'medium' | 'high';
    riskContribution: number;
  }> {
    const findings: DetailedFinding[] = [];
    let riskContribution = 0;

    // Check submission time (late night submissions are suspicious)
    const submitHour = new Date(metrics.submissionTime).getHours();
    if (submitHour >= 0 && submitHour < 6) {
      findings.push({
        category: 'Suspicious Timing',
        finding: 'Submission made during unusual hours (12AM-6AM)',
        evidence: `Submitted at ${new Date(metrics.submissionTime).toLocaleTimeString()}`,
        impact: 'low'
      });
      riskContribution += 10;
    }

    // Check excessive editing
    if (metrics.editCount > 20) {
      findings.push({
        category: 'Excessive Editing',
        finding: `KPI was edited ${metrics.editCount} times before submission`,
        evidence: `Edit count: ${metrics.editCount} (average is 3-5)`,
        impact: 'low'
      });
      riskContribution += 5;
    }

    // Check very short time spent
    if (metrics.timeSpentMinutes < 2) {
      findings.push({
        category: 'Rushed Submission',
        finding: 'Very short time spent on submission',
        evidence: `Time spent: ${metrics.timeSpentMinutes} minutes (expected: 10-30 min)`,
        impact: 'medium'
      });
      riskContribution += 15;
    }

    // Check rapid resubmissions
    if (metrics.previousSubmissions > 3) {
      findings.push({
        category: 'Multiple Resubmissions',
        finding: `This is the ${metrics.previousSubmissions + 1}th submission attempt`,
        evidence: `Previous submissions: ${metrics.previousSubmissions}`,
        impact: 'medium'
      });
      riskContribution += 10;
    }

    const severity: 'low' | 'medium' | 'high' =
      findings.some(f => f.impact === 'medium') ? 'medium' : 'low';

    return {
      isSuspicious: findings.length > 0,
      findings,
      severity,
      riskContribution
    };
  }

  /**
   * Evidence Quality Analysis
   */
  private async analyzeEvidenceQuality(evidence: EvidenceFile[]): Promise<{
    hasIssues: boolean;
    findings: DetailedFinding[];
    severity: 'low' | 'medium' | 'high';
    riskContribution: number;
  }> {
    const findings: DetailedFinding[] = [];
    let riskContribution = 0;

    // Check if evidence is missing
    if (evidence.length === 0) {
      findings.push({
        category: 'Missing Evidence',
        finding: 'No evidence files provided',
        evidence: 'Expected at least 1 evidence file',
        impact: 'high'
      });
      riskContribution += 30;
    }

    // Check for very small files (potentially fake)
    const smallFiles = evidence.filter(e => e.fileSize < 1000);
    if (smallFiles.length > 0) {
      findings.push({
        category: 'Suspicious File Size',
        finding: `${smallFiles.length} file(s) are suspiciously small`,
        evidence: `Files under 1KB: ${smallFiles.map(f => f.fileName).join(', ')}`,
        impact: 'medium'
      });
      riskContribution += 15;
    }

    // Check for duplicate files
    const fileNames = evidence.map(e => e.fileName);
    const duplicates = fileNames.filter((name, index) => fileNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      findings.push({
        category: 'Duplicate Evidence',
        finding: 'Duplicate file names detected',
        evidence: `Duplicates: ${[...new Set(duplicates)].join(', ')}`,
        impact: 'low'
      });
      riskContribution += 5;
    }

    // Check upload timing (all uploaded at same time is suspicious)
    if (evidence.length > 1) {
      const uploadTimes = evidence.map(e => new Date(e.uploadedAt).getTime());
      const timeDifferences = uploadTimes.slice(1).map((t, i) => t - uploadTimes[i]);
      const allWithinSecond = timeDifferences.every(diff => diff < 1000);

      if (allWithinSecond) {
        findings.push({
          category: 'Bulk Upload',
          finding: 'All evidence files uploaded simultaneously',
          evidence: 'All files uploaded within 1 second',
          impact: 'low'
        });
        riskContribution += 5;
      }
    }

    const severity: 'low' | 'medium' | 'high' =
      findings.some(f => f.impact === 'high') ? 'high' :
      findings.some(f => f.impact === 'medium') ? 'medium' : 'low';

    return {
      hasIssues: findings.length > 0,
      findings,
      severity,
      riskContribution
    };
  }

  /**
   * AI-Powered Pattern Analysis
   */
  private async performAIPatternAnalysis(input: AnomalyInput, existingFindings: DetailedFinding[]): Promise<{
    additionalRisks: DetailedFinding[];
    riskContribution: number;
  }> {
    // Use AI to analyze patterns that statistical methods might miss
    const prompt = `
Analyze this KPI submission for potential fraud or anomalies:

KPI Details:
- Target: ${input.target}
- Actual: ${input.actualValue}
- Achievement: ${((input.actualValue / input.target) * 100).toFixed(1)}%

Historical Performance (last ${input.historicalData.length} cycles):
${input.historicalData.map(h => `- ${h.year}Q${h.quarter || 'N/A'}: ${h.percentage.toFixed(1)}% (score: ${h.score})`).join('\n')}

Peer Comparison (${input.peerData.length} peers):
- Average: ${(input.peerData.reduce((sum, p) => sum + p.percentage, 0) / input.peerData.length).toFixed(1)}%

Existing Findings:
${existingFindings.map(f => `- ${f.category}: ${f.finding}`).join('\n')}

Analyze for:
1. Unrealistic improvement patterns
2. Too-good-to-be-true consistency
3. Suspicious correlations
4. Gaming indicators

Return JSON with:
{
  "additionalRisks": [
    {
      "category": "string",
      "finding": "string",
      "evidence": "string",
      "impact": "low|medium|high"
    }
  ],
  "riskContribution": number (0-20)
}
`;

    try {
      const response = await this.aiManager.callService<any>(
        'anomaly-detector',
        'analyze',
        { prompt },
        { priority: 'high', bypassCache: true }
      );

      if (response.success && response.data) {
        return response.data;
      }
    } catch (error) {
      console.error('AI pattern analysis failed:', error);
    }

    return { additionalRisks: [], riskContribution: 0 };
  }

  /**
   * Helper: Escalate severity
   */
  private escalateSeverity(current: 'low' | 'medium' | 'high' | 'critical',
                            new_: 'low' | 'medium' | 'high' | 'critical'): 'low' | 'medium' | 'high' | 'critical' {
    const levels = { low: 1, medium: 2, high: 3, critical: 4 };
    return levels[new_] > levels[current] ? new_ : current;
  }

  /**
   * Calculate confidence based on findings
   */
  private calculateConfidence(findings: DetailedFinding[]): number {
    const highImpact = findings.filter(f => f.impact === 'high').length;
    const mediumImpact = findings.filter(f => f.impact === 'medium').length;

    const confidence = Math.min(0.5 + (highImpact * 0.2) + (mediumImpact * 0.1), 0.95);
    return confidence;
  }

  /**
   * Generate auto-actions based on risk
   */
  private generateAutoActions(riskScore: number, severity: string, anomalyType: string): string[] {
    const actions: string[] = [];

    if (riskScore > 80 || severity === 'critical') {
      actions.push('FLAG_FOR_IMMEDIATE_REVIEW');
      actions.push('NOTIFY_ADMIN');
      actions.push('BLOCK_AUTO_APPROVAL');
    } else if (riskScore > 60 || severity === 'high') {
      actions.push('FLAG_FOR_REVIEW');
      actions.push('NOTIFY_APPROVER');
      actions.push('REQUEST_ADDITIONAL_EVIDENCE');
    } else if (riskScore > 40 || severity === 'medium') {
      actions.push('ADD_TO_WATCH_LIST');
      actions.push('SUGGEST_APPROVER_REVIEW');
    }

    if (anomalyType === 'statistical') {
      actions.push('VERIFY_DATA_SOURCE');
    }

    if (anomalyType === 'evidence') {
      actions.push('REQUEST_EVIDENCE_CLARIFICATION');
    }

    return actions;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(findings: DetailedFinding[], input: AnomalyInput): string[] {
    const recommendations: string[] = [];

    if (findings.some(f => f.category.includes('Statistical'))) {
      recommendations.push('Verify calculation methodology and data sources');
      recommendations.push('Compare against original source systems (ERP, CRM, etc.)');
    }

    if (findings.some(f => f.category.includes('Peer'))) {
      recommendations.push('Interview employee about exceptional performance factors');
      recommendations.push('Check if special circumstances or one-time events occurred');
    }

    if (findings.some(f => f.category.includes('Evidence'))) {
      recommendations.push('Request additional or higher quality evidence');
      recommendations.push('Verify evidence authenticity through source verification');
    }

    if (findings.some(f => f.category.includes('Behavioral') || f.category.includes('Timing'))) {
      recommendations.push('Conduct behavioral interview with submitter');
      recommendations.push('Review submission process and timeline');
    }

    if (findings.length === 0) {
      recommendations.push('No anomalies detected - proceed with standard approval');
    }

    return recommendations;
  }

  /**
   * Generate human-readable description
   */
  private generateDescription(findings: DetailedFinding[], riskScore: number, anomalyType: string): string {
    if (findings.length === 0) {
      return 'No anomalies detected. Performance appears normal based on statistical analysis, peer comparison, and behavioral patterns.';
    }

    const highFindings = findings.filter(f => f.impact === 'high');
    const mediumFindings = findings.filter(f => f.impact === 'medium');

    let description = `Detected ${findings.length} potential anomal${findings.length === 1 ? 'y' : 'ies'} (Risk Score: ${riskScore}/100). `;

    if (highFindings.length > 0) {
      description += `High priority concerns: ${highFindings.map(f => f.finding).join('; ')}. `;
    }

    if (mediumFindings.length > 0) {
      description += `Medium priority concerns: ${mediumFindings.map(f => f.finding).join('; ')}. `;
    }

    description += `Primary anomaly type: ${anomalyType}. Human review recommended.`;

    return description;
  }
}

// Export singleton instance
export const anomalyDetector = new CompleteAnomalyDetector();
