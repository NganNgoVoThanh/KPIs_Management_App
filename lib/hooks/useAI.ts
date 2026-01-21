// lib/hooks/useAI.ts
// React hooks for AI features integration

import { useState, useCallback } from 'react';
import { authenticatedFetch } from '../api-client';

// Types
export interface SMARTValidationResult {
  overallScore: number;
  level: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  criteria: {
    specific: { score: number; feedback: string; improvements: string[] };
    measurable: { score: number; feedback: string; improvements: string[] };
    achievable: { score: number; feedback: string; improvements: string[] };
    relevant: { score: number; feedback: string; improvements: string[] };
    timeBound: { score: number; feedback: string; improvements: string[] };
  };
  validatedAt: string;
}

export interface KPISuggestion {
  id: string;
  title: string;
  description: string;
  type: string;
  suggestedTarget: number;
  unit: string;
  weight: number;
  category: string;
  confidenceScore: number;
  smartScore: number;
  riskFactors: string[];
  ogsmAlignment: string;
  dataSource: string;
  rationale: string;
}

export interface AnomalyResult {
  id: string;
  kpiId: string;
  anomalyType: 'statistical' | 'behavioral' | 'evidence' | 'pattern' | 'none';
  severity: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  confidence: number;
  needsHumanReview: boolean;
  autoActions: string[];
  description: string;
  detailedFindings: Array<{
    category: string;
    finding: string;
    evidence: string;
    impact: string;
  }>;
  recommendations: string[];
}

export interface ApprovalRecommendation {
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
  specificFeedback: Array<{
    kpiId: string;
    kpiTitle: string;
    issue: string;
    severity: string;
    suggestion: string;
    requiredAction: string;
  }>;
  nextSteps: string[];
  timeEstimate: number;
}

// Hook: Smart Validation
export function useSMARTValidation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SMARTValidationResult | null>(null);

  const validate = useCallback(async (kpiData: {
    title: string;
    description?: string;
    target: number;
    unit: string;
    measurementMethod?: string;
    dataSource?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch('/api/ai/validate', {
        method: 'POST',
        body: JSON.stringify(kpiData)
      });

      if (!response.ok) {
        throw new Error('Validation failed');
      }

      const data = await response.json();
      setResult(data.data || data);
      return data.data || data;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Validation error';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { validate, loading, error, result, reset };
}

// Hook: KPI Suggestions
export function useKPISuggestions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<KPISuggestion[]>([]);

  const getSuggestions = useCallback(async (params: {
    cycleId: string;
    department?: string;
    jobTitle?: string;
    includeHistorical?: boolean;
    includeOGSM?: boolean;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch('/api/ai/suggestions', {
        method: 'POST',
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error('Failed to get suggestions');
      }

      const data = await response.json();
      const suggestionList = data.data?.suggestions || data.suggestions || [];
      setSuggestions(suggestionList);
      return suggestionList;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Suggestion error';
      setError(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setSuggestions([]);
    setError(null);
  }, []);

  return { getSuggestions, loading, error, suggestions, reset };
}

// Hook: Anomaly Detection
export function useAnomalyDetection() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnomalyResult | null>(null);

  const detect = useCallback(async (params: {
    kpiId: string;
    actualValue: number;
    target: number;
    includeEvidence?: boolean;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch('/api/ai/analyze', {
        method: 'POST',
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error('Anomaly detection failed');
      }

      const data = await response.json();
      setResult(data.data || data);
      return data.data || data;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Detection error';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { detect, loading, error, result, reset };
}

// Hook: Approval Assistance
export function useApprovalAssistance() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<ApprovalRecommendation | null>(null);

  const getRecommendation = useCallback(async (params: {
    submissionId: string;
    submissionType: 'goals' | 'actuals';
    kpiIds: string[];
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch('/api/ai/approval', {
        method: 'POST',
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error('Failed to get recommendation');
      }

      const data = await response.json();
      setRecommendation(data.data || data);
      return data.data || data;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Recommendation error';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setRecommendation(null);
    setError(null);
  }, []);

  return { getRecommendation, loading, error, recommendation, reset };
}

// Hook: Document Analysis
export function useDocumentAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const analyze = useCallback(async (file: File, analysisType: 'extract' | 'verify' | 'quality') => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('analysisType', analysisType);

      const response = await authenticatedFetch('/api/ai/document', {
        method: 'POST',
        body: formData,
        headers: {} // Let browser set content-type for FormData
      });

      if (!response.ok) {
        throw new Error('Document analysis failed');
      }

      const data = await response.json();
      setResult(data.data || data);
      return data.data || data;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Analysis error';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { analyze, loading, error, result, reset };
}

// Combined AI Status Hook
export function useAIStatus() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    healthy: boolean;
    services: Record<string, boolean>;
    provider: string;
  } | null>(null);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch('/api/ai/health', {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error('Health check failed');
      }

      const data = await response.json();
      setStatus(data.data || data);
      return data.data || data;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Health check error';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { checkStatus, loading, error, status };
}

// Debounced validation hook for real-time typing
export function useDebouncedSMARTValidation(debounceMs: number = 1000) {
  const { validate, ...rest } = useSMARTValidation();
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const debouncedValidate = useCallback((kpiData: Parameters<typeof validate>[0]) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const newTimeoutId = setTimeout(() => {
      validate(kpiData);
    }, debounceMs);

    setTimeoutId(newTimeoutId);
  }, [validate, debounceMs, timeoutId]);

  return { validate: debouncedValidate, ...rest };
}

// Export all hooks
export default {
  useSMARTValidation,
  useKPISuggestions,
  useAnomalyDetection,
  useApprovalAssistance,
  useDocumentAnalysis,
  useAIStatus,
  useDebouncedSMARTValidation
};
