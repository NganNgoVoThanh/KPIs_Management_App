// components/ai/smart-validation-panel.tsx
"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  TrendingUp,
  Eye,
  Lightbulb,
  Zap,
  Target,
  Clock,
  Gauge
} from 'lucide-react';

import { enhancedAIService } from '@/lib/ai-services-enhanced';

interface KpiFormData {
  title: string;
  description: string;
  target: number;
  unit: string;
  measurementMethod?: string;
  dataSource?: string;
  timeline?: string;
  type?: number;
}

interface SmartCriterion {
  score: number; // 0-100
  level: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  feedback: string;
  improvements: string[];
  examples: string[];
  color: string;
  improvementNeeded: boolean;
}

interface SmartValidationResult {
  overallScore: number;
  level: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  criteria: {
    specific: SmartCriterion;
    measurable: SmartCriterion;
    achievable: SmartCriterion;
    relevant: SmartCriterion;
    timeBound: SmartCriterion;
  };
  autoImprovements: {
    suggestedTitle: string;
    suggestedDescription: string;
    suggestedMeasurement: string;
    confidenceScore: number;
    primaryWeakness: string;
    targetedImprovements: string[];
  };
  visualMetrics: {
    progressData: Array<{
      criterion: string;
      score: number;
      maxScore: number;
      color: string;
    }>;
    strengthsCount: number;
    weaknessesCount: number;
    improvementPotential: number;
  };
  validationHistory?: ValidationHistoryItem[];
}

interface ValidationHistoryItem {
  timestamp: string;
  overallScore: number;
  changes: string[];
  improvements: string[];
}

interface SmartValidationPanelProps {
  kpiData: KpiFormData;
  onChange?: (validationResult: SmartValidationResult) => void;
  showImprovements?: boolean;
  autoValidate?: boolean;
  debounceMs?: number;
  className?: string;
}

export function SmartValidationPanel({
  kpiData,
  onChange,
  showImprovements = true,
  autoValidate = true,
  debounceMs = 1500,
  className
}: SmartValidationPanelProps) {
  const [validation, setValidation] = useState<SmartValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationHistory, setValidationHistory] = useState<ValidationHistoryItem[]>([]);
  const [selectedTab, setSelectedTab] = useState('overview');

  const performValidation = useCallback(async () => {
    if (!kpiData.title || !kpiData.target) return;

    setIsValidating(true);
    try {
      const result = await enhancedAIService.validateKPISMART(kpiData);
      
      const processedResult: SmartValidationResult = {
        overallScore: result.score,
        level: getScoreLevel(result.score),
        criteria: {
          specific: processCriterion({ score: result.specific ? 100 : 50, feedback: 'Specific criteria feedback', improvements: [], examples: [] }),
          measurable: processCriterion({ score: result.measurable ? 100 : 50, feedback: 'Measurable criteria feedback', improvements: [], examples: [] }),
          achievable: processCriterion({ score: result.achievable ? 100 : 50, feedback: 'Achievable criteria feedback', improvements: [], examples: [] }),
          relevant: processCriterion({ score: result.relevant ? 100 : 50, feedback: 'Relevant criteria feedback', improvements: [], examples: [] }),
          timeBound: processCriterion({ score: result.timeBound ? 100 : 50, feedback: 'Time-bound criteria feedback', improvements: [], examples: [] })
        },
        autoImprovements: {
          suggestedTitle: kpiData.title,
          suggestedDescription: kpiData.description,
          suggestedMeasurement: kpiData.measurementMethod || '',
          confidenceScore: 80,
          primaryWeakness: 'general',
          targetedImprovements: result.suggestions || []
        },
        visualMetrics: generateVisualMetrics(result),
        validationHistory: []
      };
      
      setValidation(processedResult);
      
      setValidationHistory(prev => [...prev.slice(-4), {
        timestamp: new Date().toISOString(),
        overallScore: result.score,
        improvements: result.suggestions?.length || 0,
        changes: ['Validated']
      }]);
      
      onChange?.(processedResult);
    } catch (error) {
      console.error('SMART validation error:', error);
    } finally {
      setIsValidating(false);
    }
  }, [kpiData, onChange]);

  useEffect(() => {
    if (!autoValidate) return;

    const debounceTimer = setTimeout(() => {
      performValidation();
    }, debounceMs);

    return () => clearTimeout(debounceTimer);
  }, [performValidation, autoValidate, debounceMs]);

  const manualValidate = () => {
    performValidation();
  };

  const processCriterion = (criterionData: any): SmartCriterion => {
    const score = criterionData.score || 50;
    return {
      score,
      level: getScoreLevel(score),
      feedback: criterionData.feedback || 'No feedback available',
      improvements: criterionData.improvements || [],
      examples: criterionData.examples || [],
      color: getScoreColor(score),
      improvementNeeded: score < 70
    };
  };

  const generateVisualMetrics = (result: any) => {
    const criteria = ['specific', 'measurable', 'achievable', 'relevant', 'timeBound'];
    const progressData = criteria.map(criterion => ({
      criterion: criterion.charAt(0).toUpperCase() + criterion.slice(1),
      score: result[criterion] ? 100 : 50,
      maxScore: 100,
      color: result[criterion] ? '#10B981' : '#EF4444'
    }));

    return {
      progressData,
      strengthsCount: progressData.filter(p => p.score >= 80).length,
      weaknessesCount: progressData.filter(p => p.score < 70).length,
      improvementPotential: 20
    };
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-red-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number): string => {
    if (score >= 90) return 'bg-green-50 border-green-200';
    if (score >= 75) return 'bg-red-50 border-red-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getScoreLevel = (score: number): 'Poor' | 'Fair' | 'Good' | 'Excellent' => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Poor';
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'Excellent': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'Good': return <CheckCircle2 className="h-5 w-5 text-red-600" />;
      case 'Fair': return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'Poor': return <XCircle className="h-5 w-5 text-red-600" />;
      default: return <Gauge className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Validation Header */}
      <Card className={validation ? getScoreBackground(validation.overallScore) : 'bg-gray-50'}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-red-600" />
              SMART Validation
            </CardTitle>
            
            {!autoValidate && (
              <Button 
                onClick={manualValidate} 
                disabled={isValidating}
                size="sm"
                variant="outline"
              >
                {isValidating ? 'Validating...' : 'Check SMART'}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {isValidating ? (
            <div className="flex items-center gap-3 text-red-600">
              <Clock className="h-5 w-5 animate-spin" />
              <span>Analyzing SMART criteria...</span>
            </div>
          ) : validation ? (
            <div className="space-y-4">
              {/* Overall Score Display */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getScoreColor(validation.overallScore)}`}>
                    {validation.overallScore}
                  </div>
                  <div className="text-sm text-gray-600">Overall Score</div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getLevelIcon(validation.level)}
                    <span className="font-medium">{validation.level}</span>
                  </div>
                  <Progress value={validation.overallScore} className="h-2" />
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">{validation.visualMetrics.strengthsCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium">{validation.visualMetrics.weaknessesCount}</span>
                  </div>
                </div>
              </div>

              {/* Quick Criteria Overview */}
              <div className="grid grid-cols-5 gap-2">
                {validation.visualMetrics.progressData.map((criterion) => (
                  <div key={criterion.criterion} className="text-center">
                    <div 
                      className="text-lg font-bold mb-1"
                      style={{ color: criterion.color }}
                    >
                      {criterion.score}
                    </div>
                    <div className="text-xs text-gray-600">{criterion.criterion}</div>
                    <Progress 
                      value={criterion.score} 
                      className="h-1 mt-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Enter KPI details to see SMART validation</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Analysis Tabs */}
      {validation && (
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="criteria">Criteria</TabsTrigger>
            <TabsTrigger value="improvements">Improvements</TabsTrigger>
            <TabsTrigger value="history">Progress</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <SMARTOverview validation={validation} />
          </TabsContent>

          <TabsContent value="criteria">
            <SMARTCriteriaDetails criteria={validation.criteria} />
          </TabsContent>

          <TabsContent value="improvements">
            {showImprovements && (
              <SMARTImprovements 
                improvements={validation.autoImprovements}
                weaknesses={Object.entries(validation.criteria)
                  .filter(([, criterion]) => criterion.score < 70)
                }
              />
            )}
          </TabsContent>

          <TabsContent value="history">
            <SMARTProgress history={validationHistory} currentScore={validation.overallScore} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// SMART Overview Component
function SMARTOverview({ validation }: { validation: SmartValidationResult }) {
  const strengthCriteria = Object.entries(validation.criteria)
    .filter(([, criterion]) => criterion.score >= 80);
  
  const weaknessCriteria = Object.entries(validation.criteria)
    .filter(([, criterion]) => criterion.score < 70);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Assessment Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Strengths */}
          {strengthCriteria.length > 0 && (
            <div>
              <h3 className="font-medium text-green-700 mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Strengths ({strengthCriteria.length})
              </h3>
              <div className="space-y-2">
                {strengthCriteria.map(([criterion, data]) => (
                  <div key={criterion} className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium capitalize">{criterion}</span>
                      <Badge className="bg-green-100 text-green-800">{data.score}/100</Badge>
                    </div>
                    <p className="text-sm text-green-700">{data.feedback}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Areas for Improvement */}
          {weaknessCriteria.length > 0 && (
            <div>
              <h3 className="font-medium text-yellow-700 mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Areas for Improvement ({weaknessCriteria.length})
              </h3>
              <div className="space-y-2">
                {weaknessCriteria.map(([criterion, data]) => (
                  <div key={criterion} className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium capitalize">{criterion}</span>
                      <Badge className="bg-yellow-100 text-yellow-800">{data.score}/100</Badge>
                    </div>
                    <p className="text-sm text-yellow-700 mb-2">{data.feedback}</p>
                    {data.improvements.length > 0 && (
                      <ul className="text-xs text-yellow-600 list-disc list-inside">
                        {data.improvements.map((improvement: string, idx: number) => (
                          <li key={idx}>{improvement}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// SMART Criteria Details Component
function SMARTCriteriaDetails({ criteria }: { criteria: any }) {
  return (
    <div className="space-y-4">
      {Object.entries(criteria).map(([criterion, data]: [string, any]) => (
        <Card key={criterion}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="capitalize text-lg">{criterion}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge 
                  className={`${
                    data.score >= 80 ? 'bg-green-100 text-green-800' :
                    data.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}
                >
                  {data.score}/100
                </Badge>
                {data.improvementNeeded && (
                  <Badge variant="outline" className="text-yellow-700">Needs Work</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Progress value={data.score} className="h-2" />
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-700">{data.feedback}</p>
              </div>

              {data.examples && data.examples.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Examples:</h4>
                  <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                    {data.examples.map((example: string, idx: number) => (
                      <li key={idx}>{example}</li>
                    ))}
                  </ul>
                </div>
              )}

              {data.improvements && data.improvements.length > 0 && (
                <Alert>
                  <Lightbulb className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Suggestions:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      {data.improvements.map((improvement: string, idx: number) => (
                        <li key={idx} className="text-sm">{improvement}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// SMART Improvements Component
function SMARTImprovements({ improvements, weaknesses }: { 
  improvements: any; 
  weaknesses: [string, any][] 
}) {
  return (
    <div className="space-y-4">
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-900">
            <Lightbulb className="h-5 w-5" />
            AI-Generated Improvements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Suggested KPI Title</h3>
            <div className="bg-white p-3 rounded border border-red-200">
              <p className="font-medium text-red-900">{improvements.suggestedTitle}</p>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Enhanced Description</h3>
            <div className="bg-white p-3 rounded border border-red-200">
              <p className="text-gray-700">{improvements.suggestedDescription}</p>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Improved Measurement Method</h3>
            <div className="bg-white p-3 rounded border border-red-200">
              <p className="text-gray-700">{improvements.suggestedMeasurement}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-red-200">
            <span className="text-sm text-red-700">AI Confidence</span>
            <Badge className="bg-red-100 text-red-800">
              {improvements.confidenceScore}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Priority Improvements */}
      {weaknesses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Priority Improvements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weaknesses.map(([criterion, data], idx) => (
                <div key={criterion} className="bg-yellow-50 p-3 rounded border border-yellow-200">
                  <div className="flex items-start gap-2">
                    <Badge className="bg-yellow-100 text-yellow-800">
                      #{idx + 1}
                    </Badge>
                    <div className="flex-1">
                      <h4 className="font-medium capitalize">{criterion}</h4>
                      <p className="text-sm text-gray-600 mt-1">{data.feedback}</p>
                      {data.improvements && data.improvements.length > 0 && (
                        <ul className="text-sm text-yellow-700 list-disc list-inside mt-2">
                          {data.improvements.map((improvement: string, impIdx: number) => (
                            <li key={impIdx}>{improvement}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// SMART Progress Component  
function SMARTProgress({ history, currentScore }: { 
  history: ValidationHistoryItem[]; 
  currentScore: number 
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Validation Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        {history.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{currentScore}</div>
                <div className="text-sm text-gray-600">Current Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  +{currentScore - (history[0]?.overallScore || currentScore)}
                </div>
                <div className="text-sm text-gray-600">Improvement</div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Recent Validations</h3>
              {history.slice(-5).reverse().map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{entry.overallScore}/100</Badge>
                    {entry.improvements > 0 && (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        {entry.improvements} issues
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No validation history yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SmartValidationPanel;