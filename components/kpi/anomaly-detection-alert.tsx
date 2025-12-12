// components/kpi/anomaly-detection-alert.tsx
// Anomaly Detection Alert Component
"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle, CheckCircle, XCircle, Info,
  Shield, TrendingUp, FileWarning, Brain, Loader2
} from 'lucide-react';
import type { AnomalyResult } from '@/lib/hooks/useAI';

interface AnomalyDetectionAlertProps {
  result: AnomalyResult | null;
  loading: boolean;
  onProceed: () => void;
  onReview: () => void;
}

export function AnomalyDetectionAlert({
  result,
  loading,
  onProceed,
  onReview
}: AnomalyDetectionAlertProps) {

  if (loading) {
    return (
      <Alert className="bg-blue-50 border-blue-300">
        <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
        <AlertDescription className="text-blue-800">
          <strong className="font-semibold">AI is analyzing your submission...</strong>
          <br />
          Checking for anomalies and unusual patterns.
        </AlertDescription>
      </Alert>
    );
  }

  if (!result) {
    return null;
  }

  // No anomaly detected
  if (result.anomalyType === 'none' || result.severity === 'low') {
    return (
      <Alert className="bg-green-50 border-green-300">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong className="font-semibold">All Clear!</strong> No anomalies detected.
          Your submission looks normal and ready for approval.
        </AlertDescription>
      </Alert>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-400';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-400';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-400';
      default: return 'bg-blue-100 text-blue-700 border-blue-400';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-6 w-6" />;
      case 'medium':
        return <Info className="h-6 w-6" />;
      default:
        return <Info className="h-6 w-6" />;
    }
  };

  const getAnomalyTypeIcon = (type: string) => {
    switch (type) {
      case 'statistical': return <TrendingUp className="h-4 w-4" />;
      case 'behavioral': return <Brain className="h-4 w-4" />;
      case 'evidence': return <FileWarning className="h-4 w-4" />;
      case 'pattern': return <Shield className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  return (
    <Card className={`border-2 shadow-lg ${getSeverityColor(result.severity)}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {getSeverityIcon(result.severity)}
            <span>Anomaly Detected</span>
          </CardTitle>
          <div className="flex flex-col gap-2">
            <Badge className={`${getSeverityColor(result.severity)} border text-xs font-semibold uppercase`}>
              {result.severity} Risk
            </Badge>
            <Badge variant="outline" className="text-xs">
              {(result.confidence * 100).toFixed(0)}% Confidence
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Risk Score */}
        <div className="bg-white rounded-lg p-4 border-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Risk Score</span>
            <span className={`text-3xl font-bold ${
              result.riskScore >= 75 ? 'text-red-600' :
              result.riskScore >= 50 ? 'text-orange-600' :
              result.riskScore >= 25 ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {result.riskScore}/100
            </span>
          </div>
          <Progress value={result.riskScore} className="h-3" />
        </div>

        {/* Description */}
        <Alert className="bg-white">
          <Info className="h-4 w-4" />
          <AlertDescription>
            {result.description}
          </AlertDescription>
        </Alert>

        {/* Detailed Findings */}
        {result.detailedFindings && result.detailedFindings.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wide text-gray-700">
              Detailed Findings
            </h4>
            {result.detailedFindings.map((finding, idx) => (
              <Card key={idx} className="bg-white border shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    {getAnomalyTypeIcon(finding.category)}
                    <span className="font-semibold text-sm">{finding.category}</span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {finding.impact}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700">
                    <strong>Finding:</strong> {finding.finding}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Evidence:</strong> {finding.evidence}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {result.recommendations && result.recommendations.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Recommended Actions
            </h4>
            <ul className="space-y-2">
              {result.recommendations.map((recommendation, idx) => (
                <li key={idx} className="text-sm text-blue-800 flex items-start gap-2">
                  <span className="mt-1">•</span>
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Auto Actions Taken */}
        {result.autoActions && result.autoActions.length > 0 && (
          <Alert className="bg-purple-50 border-purple-300">
            <Brain className="h-4 w-4 text-purple-600" />
            <AlertDescription>
              <strong className="text-purple-900">Automatic Actions Taken:</strong>
              <ul className="mt-2 space-y-1">
                {result.autoActions.map((action, idx) => (
                  <li key={idx} className="text-sm text-purple-800">• {action}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Human Review Required */}
        {result.needsHumanReview && (
          <Alert className="bg-orange-50 border-orange-300">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong className="font-semibold">Human Review Required</strong>
              <br />
              This submission requires additional verification from a manager or admin
              before it can be approved.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={onReview}
            variant="outline"
            className="flex-1 border-2"
          >
            <FileWarning className="mr-2 h-4 w-4" />
            Review & Correct
          </Button>
          <Button
            onClick={onProceed}
            className={`flex-1 ${
              result.severity === 'critical' || result.severity === 'high'
                ? 'bg-orange-600 hover:bg-orange-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {result.needsHumanReview ? 'Submit for Review' : 'Proceed Anyway'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
