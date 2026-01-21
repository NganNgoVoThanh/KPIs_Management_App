// AI utility functions and helpers

export const AI_CONFIG = {
  SMART_SCORE_THRESHOLD: 70,
  RISK_SCORE_THRESHOLD: 60,
  CONFIDENCE_THRESHOLD: 80,
  MAX_RETRIES: 3,
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
};

export const KPI_CATEGORIES = {
  'Business Objective': {
    minWeight: 60,
    maxWeight: 80,
    color: 'blue'
  },
  'Individual Development': {
    minWeight: 15,
    maxWeight: 25,
    color: 'green'
  },
  'Core Values': {
    minWeight: 5,
    maxWeight: 15,
    color: 'purple'
  }
};

export const KPI_TYPES = {
  1: 'Higher is Better',
  2: 'Lower is Better',
  3: 'Pass/Fail',
  4: 'Scaled Rating'
};

export function formatAIResponse(response: any): any {
  // Standardize AI response format
  if (typeof response === 'string') {
    try {
      return JSON.parse(response);
    } catch {
      return { text: response };
    }
  }
  return response;
}

export function calculateOverallRisk(anomalies: any[]): {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  factors: string[];
} {
  if (anomalies.length === 0) {
    return { level: 'low', score: 0, factors: [] };
  }

  const avgRiskScore = anomalies.reduce((sum, a) => sum + a.riskScore, 0) / anomalies.length;
  const criticalCount = anomalies.filter(a => a.severity === 'high').length;
  
  let level: 'low' | 'medium' | 'high' | 'critical';
  if (avgRiskScore >= 80 || criticalCount >= 3) level = 'critical';
  else if (avgRiskScore >= 60 || criticalCount >= 2) level = 'high';
  else if (avgRiskScore >= 40 || criticalCount >= 1) level = 'medium';
  else level = 'low';

  return {
    level,
    score: Math.round(avgRiskScore),
    factors: anomalies.map(a => a.description).slice(0, 5)
  };
}

export function generateRecommendations(smartScores: number[], riskLevel: string): string[] {
  const recommendations = [];
  
  const avgScore = smartScores.reduce((sum, score) => sum + score, 0) / smartScores.length;
  const lowScoreCount = smartScores.filter(score => score < 70).length;

  if (avgScore < 70) {
    recommendations.push('Focus on improving SMART criteria compliance across all KPIs');
  }
  
  if (lowScoreCount > 2) {
    recommendations.push('Consider revising KPIs with low SMART scores before submission');
  }

  if (riskLevel === 'high' || riskLevel === 'critical') {
    recommendations.push('Review high-risk KPIs and consider adjusting targets or methods');
  }

  if (recommendations.length === 0) {
    recommendations.push('Your KPIs appear well-structured and ready for submission');
  }

  return recommendations;
}