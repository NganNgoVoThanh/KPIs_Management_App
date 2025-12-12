// components/kpi/ai-suggestions-panel.tsx
// AI KPI Suggestions Component
"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Sparkles, CheckCircle, AlertCircle, TrendingUp,
  Target, Plus, Loader2, Brain, Shield
} from 'lucide-react';
import type { KPISuggestion } from '@/lib/hooks/useAI';

interface AISuggestionsPanelProps {
  suggestions: KPISuggestion[];
  loading: boolean;
  error: string | null;
  onUseSuggestion: (suggestion: KPISuggestion) => void;
  onLoadSuggestions: () => void;
}

export function AISuggestionsPanel({
  suggestions,
  loading,
  error,
  onUseSuggestion,
  onLoadSuggestions
}: AISuggestionsPanelProps) {

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-700 border-green-300';
    if (score >= 60) return 'bg-blue-100 text-blue-700 border-blue-300';
    if (score >= 40) return 'bg-orange-100 text-orange-700 border-orange-300';
    return 'bg-red-100 text-red-700 border-red-300';
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'QUANT_HIGHER_BETTER': 'Type I: Higher is Better',
      'QUANT_LOWER_BETTER': 'Type II: Lower is Better',
      'MILESTONE': 'Type IV: Milestone',
      'BOOLEAN': 'Type III: Yes/No'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
        <CardContent className="p-8">
          <div className="text-center">
            <Loader2 className="h-16 w-16 mx-auto mb-4 text-blue-500 animate-spin" />
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              AI is analyzing your profile...
            </h3>
            <p className="text-sm text-blue-700">
              Generating personalized KPI suggestions based on your role, department, and historical performance.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert className="bg-red-50 border-red-300">
        <AlertCircle className="h-5 w-5 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong className="font-semibold">Error loading suggestions:</strong> {error}
        </AlertDescription>
        <Button
          onClick={onLoadSuggestions}
          variant="outline"
          size="sm"
          className="mt-3"
        >
          Try Again
        </Button>
      </Alert>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-600" />
            AI-Powered KPI Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600 text-sm">
            Get personalized KPI recommendations powered by AI, based on:
          </p>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Your role and department</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Historical performance data</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Peer benchmarks</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Company OGSM alignment</span>
            </li>
          </ul>
          <Button
            onClick={onLoadSuggestions}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            size="lg"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Get AI Suggestions
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Alert className="bg-blue-50 border-blue-300">
        <Brain className="h-5 w-5 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong className="font-semibold">AI Analysis Complete!</strong> Found {suggestions.length} personalized KPI suggestions for you.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        {suggestions.map((suggestion) => (
          <Card
            key={suggestion.id}
            className="border-2 hover:border-purple-300 hover:shadow-lg transition-all"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <CardTitle className="text-base mb-2 flex items-start gap-2">
                    <Target className="h-5 w-5 text-purple-600 mt-0.5" />
                    <span className="flex-1">{suggestion.title}</span>
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    {suggestion.description}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Badge className={`${getConfidenceColor(suggestion.confidenceScore)} border text-xs font-semibold`}>
                    {suggestion.confidenceScore}% Confidence
                  </Badge>
                  <Badge className="bg-green-100 text-green-700 border-green-300 text-xs font-semibold">
                    SMART: {suggestion.smartScore}/100
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Key Metrics */}
              <div className="grid grid-cols-3 gap-3 bg-gray-50 rounded-lg p-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Target</div>
                  <div className="font-bold text-purple-700">
                    {suggestion.suggestedTarget} {suggestion.unit}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Weight</div>
                  <div className="font-bold text-purple-700">
                    {suggestion.weight}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Type</div>
                  <div className="text-xs font-semibold text-gray-700">
                    {getTypeLabel(suggestion.type)}
                  </div>
                </div>
              </div>

              {/* Category & OGSM */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  📊 {suggestion.category}
                </Badge>
                {suggestion.ogsmAlignment && (
                  <Badge variant="outline" className="text-xs">
                    🎯 {suggestion.ogsmAlignment}
                  </Badge>
                )}
              </div>

              {/* Rationale */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-xs font-semibold text-blue-900 mb-1">
                  Why this KPI?
                </div>
                <p className="text-xs text-blue-800 leading-relaxed">
                  {suggestion.rationale}
                </p>
              </div>

              {/* Risk Factors */}
              {suggestion.riskFactors && suggestion.riskFactors.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="text-xs font-semibold text-orange-900 mb-2 flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Risk Factors
                  </div>
                  <ul className="space-y-1">
                    {suggestion.riskFactors.map((risk, idx) => (
                      <li key={idx} className="text-xs text-orange-800 flex items-start gap-1">
                        <span>•</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Data Source */}
              <div className="text-xs text-gray-500">
                <strong>Data Source:</strong> {suggestion.dataSource}
              </div>

              {/* Action Button */}
              <Button
                onClick={() => onUseSuggestion(suggestion)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Use This Suggestion
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load More Button */}
      <Button
        onClick={onLoadSuggestions}
        variant="outline"
        className="w-full border-2 border-purple-300 text-purple-700 hover:bg-purple-50"
        size="lg"
      >
        <Sparkles className="mr-2 h-5 w-5" />
        Get More Suggestions
      </Button>
    </div>
  );
}
