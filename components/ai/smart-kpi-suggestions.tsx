// components/ai/smart-kpi-suggestions.tsx
"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, 
  TrendingUp, 
  Target, 
  Scale, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  BarChart3
} from 'lucide-react';
import { SmartKpiSuggestionService, SmartKpiSuggestion } from '@/lib/ai/kpi-suggestion-service';

interface SmartKpiSuggestionsProps {
  userId: string;
  department: string;
  jobTitle: string;
  onAcceptSuggestion: (suggestion: SmartKpiSuggestion) => void;
  onRejectSuggestion: (suggestionId: string) => void;
  className?: string;
}

export function SmartKpiSuggestions({
  userId,
  department,
  jobTitle,
  onAcceptSuggestion,
  onRejectSuggestion,
  className
}: SmartKpiSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SmartKpiSuggestion[]>([]);
  const [balanceAnalysis, setBalanceAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState('suggestions');

  const suggestionService = new SmartKpiSuggestionService();

  const generateSuggestions = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await suggestionService.generateSmartKpiSuggestions({
        user: {
          id: userId,
          department,
          jobTitle,
          // Add other required user properties
        } as any,
        orgUnit: { id: 'org-1', name: department } as any,
        cycleYear: 2025
      });

      setSuggestions(result.suggestions);
      setBalanceAnalysis(result.balanceAnalysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Low': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Business Objective': return <Target className="h-4 w-4" />;
      case 'Individual Development': return <TrendingUp className="h-4 w-4" />;
      case 'Core Values': return <Users className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="border-red-200 bg-gradient-to-r from-red-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-900">
            <Sparkles className="h-6 w-6 text-red-600" />
            Smart KPI Suggestions
          </CardTitle>
          <p className="text-red-700">
            AI-powered KPI recommendations based on OGSM objectives, department standards, and your role
          </p>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={generateSuggestions} 
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Generating AI Suggestions...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Smart KPI Suggestions
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {suggestions.length > 0 && (
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="suggestions">KPI Suggestions</TabsTrigger>
            <TabsTrigger value="balance">Balance Analysis</TabsTrigger>
            <TabsTrigger value="comparison">Department Comparison</TabsTrigger>
          </TabsList>

          <TabsContent value="suggestions" className="space-y-4">
            {suggestions.map((suggestion, index) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                index={index}
                onAccept={() => onAcceptSuggestion(suggestion)}
                onReject={() => onRejectSuggestion(suggestion.id)}
              />
            ))}
          </TabsContent>

          <TabsContent value="balance">
            {balanceAnalysis && <BalanceAnalysisCard analysis={balanceAnalysis} />}
          </TabsContent>

          <TabsContent value="comparison">
            <DepartmentComparisonCard suggestions={suggestions} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// Individual Suggestion Card Component
function SuggestionCard({ 
  suggestion, 
  index, 
  onAccept, 
  onReject 
}: {
  suggestion: SmartKpiSuggestion;
  index: number;
  onAccept: () => void;
  onReject: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  function getSeverityColor(arg0: string): string | undefined {
    throw new Error('Function not implemented.');
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">
                KPI #{index + 1}
              </Badge>
              <Badge className={getCategoryColor(suggestion.category)}>
                {suggestion.category}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Weight: {suggestion.weight}%
              </Badge>
            </div>
            <CardTitle className="text-lg leading-tight">{suggestion.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-sm font-medium">SMART Score</div>
              <div className="text-2xl font-bold text-red-600">{suggestion.smartScore}</div>
            </div>
            <Progress value={suggestion.smartScore} className="w-12 h-2" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium">Target:</span>
            <div className="text-lg font-semibold text-green-600">
              {suggestion.suggestedTarget} {suggestion.unit}
            </div>
          </div>
          <div>
            <span className="font-medium">Type:</span>
            <div>Type {suggestion.type}</div>
          </div>
          <div>
            <span className="font-medium">Data Source:</span>
            <div className="text-xs">{suggestion.dataSource}</div>
          </div>
          <div>
            <span className="font-medium">Risk Level:</span>
            <Badge className={getSeverityColor(suggestion.riskFactors.length > 2 ? 'High' : 'Low')}>
              {suggestion.riskFactors.length > 2 ? 'High' : 'Low'}
            </Badge>
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-700">{suggestion.description}</p>
        </div>

        {/* Balance Analysis Indicators */}
        <div className="grid grid-cols-5 gap-2 text-xs">
          {Object.entries(suggestion.balanceAnalysis).map(([key, value]) => (
            <div key={key} className="text-center">
              <div className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
              <Progress value={value as number} className="h-1 mt-1" />
              <div className="mt-1">{value}/100</div>
            </div>
          ))}
        </div>

        {expanded && (
          <div className="space-y-3 border-t pt-4">
            <div>
              <h4 className="font-medium text-sm mb-2">OGSM Alignment</h4>
              <p className="text-sm text-gray-600">{suggestion.ogsmAlignment}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-sm mb-2">Rationale</h4>
              <p className="text-sm text-gray-600">{suggestion.rationale}</p>
            </div>

            {suggestion.evidenceRequirements.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Evidence Requirements</h4>
                <ul className="text-sm text-gray-600 list-disc list-inside">
                  {suggestion.evidenceRequirements.map((req, idx) => (
                    <li key={idx}>{req}</li>
                  ))}
                </ul>
              </div>
            )}

            {suggestion.riskFactors.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2 text-orange-700">Risk Factors</h4>
                <ul className="text-sm text-orange-600 list-disc list-inside">
                  {suggestion.riskFactors.map((risk, idx) => (
                    <li key={idx}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}

            {suggestion.historicalComparison && (
              <div>
                <h4 className="font-medium text-sm mb-2">Historical Comparison</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Performance:</strong> {suggestion.historicalComparison.similarKpiPerformance}%</p>
                  <p><strong>Trend:</strong> {suggestion.historicalComparison.trendAnalysis}</p>
                  <p><strong>Recommendation:</strong> {suggestion.historicalComparison.recommendedAdjustment}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Show Less' : 'Show Details'}
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onReject}
              className="text-red-600 hover:bg-red-50"
            >
              Reject
            </Button>
            <Button
              size="sm"
              onClick={onAccept}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Accept KPI
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Balance Analysis Component
function BalanceAnalysisCard({ analysis }: { analysis: any }) {
  const getBalanceColor = (balance: string) => {
    switch (balance) {
      case 'Excellent': return 'text-green-600';
      case 'Good': return 'text-red-600';
      case 'Needs Adjustment': return 'text-yellow-600';
      case 'Poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          KPI Balance Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Balance Status */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold mb-2 ${getBalanceColor(analysis.overallBalance)}">
            {analysis.overallBalance}
          </div>
          <div className="text-sm text-gray-600">Overall Portfolio Balance</div>
        </div>

        {/* Weight Distribution */}
        <div className="space-y-4">
          <h3 className="font-medium">Weight Distribution</h3>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Business Objectives</span>
                <span>{analysis.totalBusinessWeight}%</span>
              </div>
              <Progress value={analysis.totalBusinessWeight} className="h-2" />
              <div className="text-xs text-gray-500 mt-1">Recommended: 60-80%</div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Individual Development</span>
                <span>{analysis.totalPersonalWeight}%</span>
              </div>
              <Progress value={analysis.totalPersonalWeight} className="h-2" />
              <div className="text-xs text-gray-500 mt-1">Recommended: 15-25%</div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Core Values</span>
                <span>{analysis.totalCoreValuesWeight}%</span>
              </div>
              <Progress value={analysis.totalCoreValuesWeight} className="h-2" />
              <div className="text-xs text-gray-500 mt-1">Recommended: 5-15%</div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div>
            <h3 className="font-medium mb-2">Recommendations</h3>
            <ul className="space-y-1">
              {analysis.recommendations.map((rec: string, idx: number) => (
                <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Department Comparison Component
function DepartmentComparisonCard({ suggestions }: { suggestions: SmartKpiSuggestion[] }) {
  const avgComplexity = suggestions.reduce((sum, s) => sum + s.smartScore, 0) / suggestions.length;
  const totalWeight = suggestions.reduce((sum, s) => sum + s.weight, 0);
  const categoryDistribution = suggestions.reduce((dist, s) => {
    dist[s.category] = (dist[s.category] || 0) + 1;
    return dist;
  }, {} as Record<string, number>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Department Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{suggestions.length}</div>
            <div className="text-sm text-gray-600">Total KPIs</div>
            <div className="text-xs text-gray-500">Dept Avg: 6-8</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{Math.round(avgComplexity)}</div>
            <div className="text-sm text-gray-600">Avg SMART Score</div>
            <div className="text-xs text-gray-500">Dept Avg: 75</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{totalWeight}%</div>
            <div className="text-sm text-gray-600">Total Weight</div>
            <div className="text-xs text-gray-500">Target: 100%</div>
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-3">Category Distribution</h3>
          <div className="space-y-2">
            {Object.entries(categoryDistribution).map(([category, count]) => (
              <div key={category} className="flex justify-between items-center">
                <span className="text-sm">{category}</span>
                <Badge variant="outline">{count} KPIs</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <div className="font-medium text-yellow-800">Positioning Insights</div>
              <div className="text-sm text-yellow-700 mt-1">
                Your KPI portfolio appears well-balanced compared to department averages. 
                Consider the complexity level appropriate for your experience.
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Utility function for category colors
function getCategoryColor(category: string): string {
  switch (category) {
    case 'Business Objective':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'Individual Development':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'Core Values':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

// Export the main component
export default SmartKpiSuggestions;