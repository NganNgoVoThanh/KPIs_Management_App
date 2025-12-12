// components/kpi/ai-smart-validation-panel.tsx
// SMART Validation Sidebar Component for KPI Form
"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Sparkles, CheckCircle, AlertCircle, TrendingUp,
  Target, Calendar, BarChart3, Link as LinkIcon, Loader2
} from 'lucide-react';
import type { SMARTValidationResult } from '@/lib/hooks/useAI';

interface AISMARTValidationPanelProps {
  result: SMARTValidationResult | null;
  loading: boolean;
  kpiTitle: string;
}

export function AISMARTValidationPanel({ result, loading, kpiTitle }: AISMARTValidationPanelProps) {
  if (!kpiTitle || kpiTitle.length < 3) {
    return (
      <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-gray-400" />
            <span>SMART Validation</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <Target className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Enter KPI details to see AI validation</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-blue-500 animate-pulse" />
            <span>SMART Validation</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-blue-600 py-8">
            <Loader2 className="h-12 w-12 mx-auto mb-3 animate-spin" />
            <p className="text-sm font-medium">Analyzing KPI with AI...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return null;
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Excellent': return 'text-green-600 bg-green-50 border-green-300';
      case 'Good': return 'text-blue-600 bg-blue-50 border-blue-300';
      case 'Fair': return 'text-orange-600 bg-orange-50 border-orange-300';
      case 'Poor': return 'text-red-600 bg-red-50 border-red-300';
      default: return 'text-gray-600 bg-gray-50 border-gray-300';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const criteriaIcons = {
    specific: Target,
    measurable: BarChart3,
    achievable: TrendingUp,
    relevant: LinkIcon,
    timeBound: Calendar
  };

  const criteriaLabels = {
    specific: 'Specific',
    measurable: 'Measurable',
    achievable: 'Achievable',
    relevant: 'Relevant',
    timeBound: 'Time-bound'
  };

  return (
    <Card className={`border-2 shadow-lg ${getLevelColor(result.level)}`}>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5" />
            <span>SMART Validation</span>
          </CardTitle>
          <Badge className={getLevelColor(result.level)}>
            {result.level}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Overall Score */}
        <div className="bg-white rounded-xl p-4 border-2 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Overall Score</span>
            <span className={`text-3xl font-bold ${getScoreColor(result.overallScore)}`}>
              {result.overallScore}/100
            </span>
          </div>
          <Progress
            value={result.overallScore}
            className="h-3"
          />
          <div className="mt-2 flex items-center gap-2">
            {result.overallScore >= 70 ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-xs text-green-700 font-medium">Ready for submission</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="text-xs text-orange-700 font-medium">Needs improvement</span>
              </>
            )}
          </div>
        </div>

        {/* Criteria Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Criteria</h4>

          {Object.entries(result.criteria).map(([key, criterion]) => {
            const Icon = criteriaIcons[key as keyof typeof criteriaIcons];
            const label = criteriaLabels[key as keyof typeof criteriaLabels];

            return (
              <div key={key} className="bg-white rounded-lg p-3 border shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${
                      criterion.score >= 70 ? 'bg-green-100' : 'bg-orange-100'
                    }`}>
                      <Icon className={`h-4 w-4 ${
                        criterion.score >= 70 ? 'text-green-600' : 'text-orange-600'
                      }`} />
                    </div>
                    <span className="font-semibold text-sm">{label}</span>
                  </div>
                  <span className={`text-lg font-bold ${getScoreColor(criterion.score)}`}>
                    {criterion.score}
                  </span>
                </div>

                <Progress value={criterion.score} className="h-2" />

                <p className="text-xs text-gray-600 leading-relaxed">
                  {criterion.feedback}
                </p>

                {criterion.improvements && criterion.improvements.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {criterion.improvements.map((improvement, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-xs text-blue-700">
                        <span className="mt-0.5">•</span>
                        <span>{improvement}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Timestamp */}
        <div className="text-xs text-gray-500 text-center pt-2 border-t">
          Validated: {new Date(result.validatedAt).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}
