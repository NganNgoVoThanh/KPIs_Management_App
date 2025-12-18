// components/kpi/enhanced-kpi-form.tsx - PROFESSIONAL UI REDESIGN - COMPLETE
"use client"

import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles, Target, CheckCircle, AlertCircle, FileText, Calculator,
  Save, Eye, Trash2, Plus, BarChart3, Clock, User, Building, XCircle,
  Copy, Calendar, BookOpen, Shield, TrendingUp, X
} from 'lucide-react';
import { TypeIVScaleEditor } from './type-iv-scale-editor';
import type { TypeIVScoringRules } from '@/lib/scoring-service';
import { useSMARTValidation, useKPISuggestions, useDebouncedSMARTValidation } from '@/lib/hooks/useAI';
import type { SMARTValidationResult, KPISuggestion } from '@/lib/hooks/useAI';

interface KpiFormData {
  id?: string;
  title: string;
  description: string;
  type: 'QUANT_HIGHER_BETTER' | 'QUANT_LOWER_BETTER' | 'MILESTONE' | 'BOOLEAN';
  unit: string;
  target: number;
  weight: number;
  formula?: string;
  dataSource?: string;
  evidenceRequirements?: string;
  category: 'Business Objective' | 'Individual Development' | 'Core Values';
  ogsmAlignment?: string;
  frequency?: 'Monthly' | 'Quarterly' | 'Annually';
  priority?: 'High' | 'Medium' | 'Low';
  dependencies?: string;
  scoringRules?: TypeIVScoringRules;
  startDate?: string;
  dueDate?: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  jobTitle: string;
  managerId?: string;
}

interface KpiFormProps {
  initialData?: Partial<KpiFormData>;
  onSubmit: (kpis: KpiFormData[]) => void;
  onCancel: () => void;
  userProfile: UserProfile;
  showAISuggestions?: boolean;
  maxKpis?: number;
  minKpis?: number;
  cycleYear?: number;
  className?: string;
  currentCycle?: any;
}

export function KpiForm({
  initialData = {},
  onSubmit,
  onCancel,
  userProfile,
  showAISuggestions = true,
  maxKpis = 5,
  minKpis = 3,
  cycleYear = new Date().getFullYear(),
  className,
  currentCycle
}: KpiFormProps) {
  const [kpis, setKpis] = useState<KpiFormData[]>([{
    id: `kpi-${Date.now()}`,
    title: '',
    description: '',
    type: 'QUANT_HIGHER_BETTER',
    unit: '',
    target: 0,
    weight: 0,
    dataSource: '',
    category: 'Business Objective',
    frequency: 'Quarterly',
    priority: 'Medium',
    startDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    ...initialData
  }]);

  const [activeTab, setActiveTab] = useState('manual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalWeight, setTotalWeight] = useState(0);
  const [showLibrarySelector, setShowLibrarySelector] = useState(false);
  const [selectedKpiIndex, setSelectedKpiIndex] = useState<number>(0);
  const [smartValidationResults, setSmartValidationResults] = useState<Map<number, SMARTValidationResult>>(new Map());

  // AI Hooks
  const { validate: validateSMART, loading: validatingSmartLoading, result: smartResult } = useDebouncedSMARTValidation(1500);
  const { getSuggestions, loading: suggestionsLoading, suggestions, error: suggestionsError } = useKPISuggestions();

  useEffect(() => {
    const total = kpis.reduce((sum, kpi) => sum + (parseFloat(String(kpi.weight)) || 0), 0);
    setTotalWeight(total);
  }, [kpis]);

  // Auto-validate SMART for current KPI when it changes
  useEffect(() => {
    const currentKpi = kpis[selectedKpiIndex];
    if (currentKpi && currentKpi.title && currentKpi.target && currentKpi.unit) {
      validateSMART({
        title: currentKpi.title,
        description: currentKpi.description,
        target: currentKpi.target,
        unit: currentKpi.unit,
        measurementMethod: currentKpi.dataSource || '',
        dataSource: currentKpi.dataSource || ''
      });
    }
  }, [kpis, selectedKpiIndex, validateSMART]);

  // Update SMART validation results when they come back
  useEffect(() => {
    if (smartResult) {
      setSmartValidationResults(prev => new Map(prev).set(selectedKpiIndex, smartResult));
    }
  }, [smartResult, selectedKpiIndex]);

  const handleLibrarySelect = (entry: any) => {
    const typeMap = {
      'I': 'QUANT_HIGHER_BETTER',
      'II': 'QUANT_LOWER_BETTER',
      'III': 'BOOLEAN',
      'IV': 'MILESTONE'
    };

    const newKpi: KpiFormData = {
      id: `kpi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: entry.kpiName,
      description: entry.ogsmTarget || '',
      type: typeMap[entry.kpiType as keyof typeof typeMap] as KpiFormData['type'],
      unit: entry.unit,
      target: parseFloat(entry.yearlyTarget) || 0,
      weight: 0,
      dataSource: entry.dataSource,
      category: 'Business Objective',
      frequency: 'Quarterly',
      priority: 'Medium',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      ogsmAlignment: entry.ogsmTarget
    };

    setKpis([...kpis, newKpi]);
    setShowLibrarySelector(false);
  };

  const addKpi = () => {
    if (kpis.length < maxKpis) {
      setKpis([...kpis, {
        id: `kpi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: '',
        description: '',
        type: 'QUANT_HIGHER_BETTER',
        unit: '',
        target: 0,
        weight: 0,
        dataSource: '',
        category: 'Business Objective',
        frequency: 'Quarterly',
        priority: 'Medium',
        startDate: new Date().toISOString().split('T')[0],
        dueDate: ''
      }]);
    }
  };

  const removeKpi = (index: number) => {
    if (kpis.length > 1) {
      setKpis(kpis.filter((_, i) => i !== index));
    }
  };

  const duplicateKpi = (index: number) => {
    if (kpis.length < maxKpis) {
      const originalKpi = kpis[index];
      const duplicatedKpi: KpiFormData = {
        ...originalKpi,
        id: `kpi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: `${originalKpi.title} (Copy)`,
        weight: 0
      };

      const newKpis = [...kpis];
      newKpis.splice(index + 1, 0, duplicatedKpi);
      setKpis(newKpis);
    }
  };

  const updateKpi = (index: number, updates: Partial<KpiFormData>) => {
    const newKpis = [...kpis];
    newKpis[index] = { ...newKpis[index], ...updates };
    setKpis(newKpis);
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    try {
      const validKpis = kpis.filter(kpi =>
        kpi.title.trim() &&
        kpi.target > 0 &&
        kpi.weight > 0 &&
        kpi.unit.trim()
      );
      onSubmit(validKpis);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const validKpiCount = kpis.filter(k => k.title.trim()).length;
  const invalidWeightCount = kpis.filter(k => k.title.trim() && (k.weight < 5 || k.weight > 40)).length;

  return (
    <div className={`bg-gray-50 ${className || ''}`}>

      {/* PROFESSIONAL HEADER */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 shadow-lg border-b-2 border-red-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/90 p-2.5 rounded-xl shadow-md">
                <Target className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white mb-1">
                  KPI Goal Setting - {userProfile.name}
                </h1>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1.5 text-white/90">
                    <Shield className="h-3.5 w-3.5" />
                    <span className="font-medium">{userProfile.role}</span>
                  </div>
                  <span className="text-white/50">•</span>
                  <div className="flex items-center gap-1.5 text-white/90">
                    <Building className="h-3.5 w-3.5" />
                    <span>{userProfile.department}</span>
                  </div>
                  <span className="text-white/50">•</span>
                  <div className="flex items-center gap-1.5 text-white/90">
                    <User className="h-3.5 w-3.5" />
                    <span>{userProfile.jobTitle}</span>
                  </div>
                  <span className="text-white/50">•</span>
                  <div className="flex items-center gap-1.5 text-white/90">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{cycleYear} Cycle</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-8 py-3 shadow-lg border-2 border-white/50">
              <div className="text-center">
                <div className={`text-4xl font-bold mb-1 ${Math.abs(totalWeight - 100) <= 0.01 ? 'text-green-600' :
                    totalWeight > 100 ? 'text-red-600' : 'text-orange-600'
                  }`}>
                  {totalWeight.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600 font-semibold uppercase tracking-wider">
                  Total Weight / 100%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => setShowLibrarySelector(true)}
            size="lg"
            className="h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-md font-semibold text-base"
          >
            <BookOpen className="mr-2 h-5 w-5" />
            Select from KPI Library
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => setActiveTab('ai-suggestions')}
            className="h-12 border-2 border-red-500 text-red-700 hover:bg-red-50 font-semibold text-base"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            AI Suggestions
          </Button>
        </div>

        {/* Validation Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className={`border-2 shadow-md ${Math.abs(totalWeight - 100) <= 0.01
              ? 'border-green-400 bg-gradient-to-br from-green-50 to-emerald-50'
              : 'border-red-400 bg-gradient-to-br from-red-50 to-rose-50'
            }`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${Math.abs(totalWeight - 100) <= 0.01 ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                    <Calculator className={`h-5 w-5 ${Math.abs(totalWeight - 100) <= 0.01 ? 'text-green-600' : 'text-red-600'
                      }`} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-700 mb-0.5">Total Weight</div>
                    <div className={`text-3xl font-bold ${Math.abs(totalWeight - 100) <= 0.01 ? 'text-green-600' :
                        totalWeight > 100 ? 'text-red-600' : 'text-orange-600'
                      }`}>
                      {totalWeight.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-600 font-medium">
                {Math.abs(totalWeight - 100) <= 0.01
                  ? '✓ Perfect balance achieved'
                  : `${totalWeight > 100 ? 'Reduce by' : 'Add'} ${Math.abs(100 - totalWeight).toFixed(1)}%`}
              </div>
            </CardContent>
          </Card>

          <Card className={`border-2 shadow-md ${validKpiCount >= minKpis && validKpiCount <= maxKpis
              ? 'border-green-400 bg-gradient-to-br from-green-50 to-emerald-50'
              : 'border-red-400 bg-gradient-to-br from-red-50 to-rose-50'
            }`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${validKpiCount >= minKpis && validKpiCount <= maxKpis ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                    <Target className={`h-5 w-5 ${validKpiCount >= minKpis && validKpiCount <= maxKpis ? 'text-green-600' : 'text-red-600'
                      }`} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-700 mb-0.5">KPI Count</div>
                    <div className={`text-3xl font-bold ${validKpiCount >= minKpis && validKpiCount <= maxKpis ? 'text-green-600' : 'text-red-600'
                      }`}>
                      {validKpiCount}
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-600 font-medium">
                {validKpiCount < minKpis ? `Need ${minKpis - validKpiCount} more KPI(s)` :
                  validKpiCount > maxKpis ? `Remove ${validKpiCount - maxKpis} KPI(s)` : `✓ Valid range (${minKpis}-${maxKpis})`}
              </div>
              {currentCycle && (
                <div className="text-xs text-blue-700 font-semibold mt-2">
                  Cycle: {currentCycle.name}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={`border-2 shadow-md ${invalidWeightCount === 0
              ? 'border-green-400 bg-gradient-to-br from-green-50 to-emerald-50'
              : 'border-red-400 bg-gradient-to-br from-red-50 to-rose-50'
            }`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${invalidWeightCount === 0 ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                    <BarChart3 className={`h-5 w-5 ${invalidWeightCount === 0 ? 'text-green-600' : 'text-red-600'
                      }`} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-700 mb-0.5">Weight Range</div>
                    <div className={`text-3xl font-bold ${invalidWeightCount === 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                      {invalidWeightCount}
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-600 font-medium">
                {invalidWeightCount === 0
                  ? '✓ All weights valid (5-40%)'
                  : `${invalidWeightCount} invalid weight(s)`}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 h-12 bg-white border-2 border-gray-200 p-1 rounded-xl shadow-sm">
            <TabsTrigger
              value="ai-suggestions"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg font-semibold"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              AI Suggestions
            </TabsTrigger>
            <TabsTrigger
              value="manual"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg font-semibold"
            >
              <FileText className="mr-2 h-4 w-4" />
              Manual Entry
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg font-semibold"
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai-suggestions" className="mt-4">
            <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-indigo-50">
              <CardContent className="p-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className="bg-gradient-to-br from-red-600 to-red-700 p-3 rounded-xl shadow-md">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-red-900 mb-1">
                      AI-Powered KPI Suggestions
                    </h3>
                    <p className="text-sm text-red-700">
                      Based on OGSM, historical data, and your role
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      if (!currentCycle?.id) {
                        alert('No active cycle found. Please contact HR.');
                        return;
                      }
                      getSuggestions({
                        cycleId: currentCycle.id,
                        department: userProfile.department,
                        includeHistorical: true
                      })
                    }}
                    disabled={suggestionsLoading || !currentCycle}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 font-semibold"
                  >
                    {suggestionsLoading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Suggestions
                      </>
                    )}
                  </Button>
                </div>

                {suggestionsError && (
                  <Alert className="bg-red-50 border-red-300 mb-4">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-sm text-red-700">
                      {suggestionsError}
                    </AlertDescription>
                  </Alert>
                )}

                {suggestions && suggestions.length > 0 ? (
                  <div className="space-y-3">
                    {suggestions.map((suggestion, index) => (
                      <Card key={index} className="border-2 border-red-200 bg-white hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-bold text-base text-gray-900">{suggestion.title}</h4>
                              <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
                            </div>
                            <Button
                              onClick={() => {
                                const newKpi: KpiFormData = {
                                  id: `kpi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                  title: suggestion.title,
                                  description: suggestion.description || '',
                                  type: (suggestion.type as KpiFormData['type']) || 'QUANT_HIGHER_BETTER',
                                  unit: suggestion.unit || '',
                                  target: suggestion.suggestedTarget || 0,
                                  weight: 0,
                                  dataSource: suggestion.dataSource || '',
                                  category: 'Business Objective',
                                  frequency: 'Quarterly',
                                  priority: 'Medium',
                                  startDate: new Date().toISOString().split('T')[0],
                                  dueDate: ''
                                };
                                setKpis([...kpis, newKpi]);
                                setActiveTab('manual');
                              }}
                              disabled={kpis.length >= maxKpis}
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                            >
                              <Plus className="mr-1 h-4 w-4" />
                              Add
                            </Button>
                          </div>
                          <div className="grid grid-cols-4 gap-3 text-sm mt-3">
                            <div>
                              <span className="text-gray-500 font-medium">Target:</span>
                              <div className="font-bold text-gray-900">{suggestion.suggestedTarget} {suggestion.unit}</div>
                            </div>
                            <div>
                              <span className="text-gray-500 font-medium">Type:</span>
                              <div className="font-bold text-gray-900">{suggestion.type}</div>
                            </div>
                            <div>
                              <span className="text-gray-500 font-medium">Confidence:</span>
                              <div className="font-bold text-gray-900">{(suggestion.confidenceScore * 100).toFixed(0)}%</div>
                            </div>
                            <div>
                              <span className="text-gray-500 font-medium">Rationale:</span>
                              <div className="text-xs text-gray-700">{suggestion.rationale}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Alert className="bg-white/80 border-red-300">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-sm text-gray-700">
                      Click "Generate Suggestions" to get AI-powered KPI recommendations based on your role, department, and company objectives.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 mt-4">
            {kpis.map((kpi, index) => (
              <Card key={kpi.id} className="border-l-4 border-l-red-600 shadow-md hover:shadow-lg transition-all bg-white">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-gray-100">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-gradient-to-r from-red-600 to-red-700 text-white font-bold px-3 py-1">
                        KPI #{index + 1}
                      </Badge>
                      {kpi.category && (
                        <Badge variant="outline" className="border-red-300 text-red-700 font-semibold">
                          {kpi.category.split(' ')[0]}
                        </Badge>
                      )}
                      {kpi.weight > 0 && (
                        <Badge className={`font-bold ${kpi.weight >= 5 && kpi.weight <= 40
                            ? 'bg-green-100 text-green-800 border-2 border-green-300'
                            : 'bg-red-100 text-red-800 border-2 border-red-300'
                          }`}>
                          {kpi.weight}%
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {kpis.length < maxKpis && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateKpi(index)}
                          className="h-8 w-8 p-0 hover:bg-red-50"
                        >
                          <Copy className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                      {kpis.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeKpi(index)}
                          className="h-8 w-8 p-0 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-bold text-gray-700 mb-1.5 block">
                        KPI Title *
                      </Label>
                      <Input
                        value={kpi.title}
                        onChange={(e) => updateKpi(index, { title: e.target.value })}
                        placeholder="Enter a clear, measurable KPI title"
                        className="h-10 text-sm font-medium border-2 focus:border-red-500"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-bold text-gray-700 mb-1.5 block">
                          Target *
                        </Label>
                        <Input
                          type="number"
                          value={kpi.target || ''}
                          onChange={(e) => updateKpi(index, { target: parseFloat(e.target.value) || 0 })}
                          placeholder="100"
                          step="0.01"
                          className="h-10 text-sm font-medium border-2 focus:border-red-500"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-bold text-gray-700 mb-1.5 block">
                          Unit *
                        </Label>
                        <Input
                          value={kpi.unit}
                          onChange={(e) => updateKpi(index, { unit: e.target.value })}
                          placeholder="%, pieces"
                          className="h-10 text-sm font-medium border-2 focus:border-red-500"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-bold text-gray-700 mb-1.5 block">
                          Weight (%) *
                        </Label>
                        <Input
                          type="number"
                          value={kpi.weight || ''}
                          onChange={(e) => updateKpi(index, { weight: parseFloat(e.target.value) || 0 })}
                          placeholder="5-40"
                          min="5"
                          max="40"
                          step="0.5"
                          className="h-10 text-sm font-medium border-2 focus:border-red-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-bold text-gray-700 mb-1.5 block">
                          KPI Type *
                        </Label>
                        <Select
                          value={kpi.type}
                          onValueChange={(value: any) => updateKpi(index, { type: value })}
                        >
                          <SelectTrigger className="h-10 text-sm font-medium border-2 focus:border-red-500 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[999999] bg-white border-2 shadow-lg" position="popper" sideOffset={5}>
                            <SelectItem value="QUANT_HIGHER_BETTER">Type I: Higher Better</SelectItem>
                            <SelectItem value="QUANT_LOWER_BETTER">Type II: Lower Better</SelectItem>
                            <SelectItem value="BOOLEAN">Type III: Pass/Fail</SelectItem>
                            <SelectItem value="MILESTONE">Type IV: Custom Scale</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-bold text-gray-700 mb-1.5 block">
                          Category
                        </Label>
                        <Select
                          value={kpi.category}
                          onValueChange={(value: any) => updateKpi(index, { category: value })}
                        >
                          <SelectTrigger className="h-10 text-sm font-medium border-2 focus:border-red-500 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[999999] bg-white border-2 shadow-lg" position="popper" sideOffset={5}>
                            <SelectItem value="Business Objective">Business</SelectItem>
                            <SelectItem value="Individual Development">Development</SelectItem>
                            <SelectItem value="Core Values">Values</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-bold text-gray-700 mb-1.5 block">
                          Priority
                        </Label>
                        <Select
                          value={kpi.priority}
                          onValueChange={(value: any) => updateKpi(index, { priority: value })}
                        >
                          <SelectTrigger className="h-10 text-sm font-medium border-2 focus:border-red-500 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[999999] bg-white border-2 shadow-lg" position="popper" sideOffset={5}>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-bold text-gray-700 mb-1.5 block">
                          <Calendar className="inline h-4 w-4 mr-1.5" />
                          Start Date *
                        </Label>
                        <Input
                          type="date"
                          value={kpi.startDate || ''}
                          onChange={(e) => updateKpi(index, { startDate: e.target.value })}
                          className="h-10 text-sm font-medium border-2 focus:border-red-500"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-bold text-gray-700 mb-1.5 block">
                          <Calendar className="inline h-4 w-4 mr-1.5" />
                          Due Date *
                        </Label>
                        <Input
                          type="date"
                          value={kpi.dueDate || ''}
                          onChange={(e) => updateKpi(index, { dueDate: e.target.value })}
                          min={kpi.startDate || undefined}
                          className="h-10 text-sm font-medium border-2 focus:border-red-500"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-bold text-gray-700 mb-1.5 block">
                        Description & Data Source
                      </Label>
                      <Textarea
                        value={kpi.description}
                        onChange={(e) => updateKpi(index, { description: e.target.value })}
                        placeholder="Describe the KPI, calculation method, and data source"
                        rows={3}
                        className="resize-none text-sm border-2 focus:border-red-500"
                      />
                    </div>
                  </div>

                  {kpi.type === 'MILESTONE' && (
                    <div className="mt-4">
                      <TypeIVScaleEditor
                        value={kpi.scoringRules}
                        onChange={(rules) => updateKpi(index, { scoringRules: rules })}
                        actualValue={kpi.target}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {kpis.length < maxKpis && (
              <Button
                onClick={addKpi}
                variant="outline"
                size="lg"
                className="w-full border-dashed border-2 border-gray-300 py-6 hover:border-red-500 hover:bg-red-50 text-gray-700 hover:text-red-700 font-semibold"
              >
                <Plus className="mr-2 h-5 w-5" />
                Add KPI ({kpis.length}/{maxKpis})
              </Button>
            )}
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <Card className="border-2 border-red-200 bg-white shadow-md">
              <CardHeader className="bg-gradient-to-r from-red-50 to-indigo-50 border-b-2">
                <CardTitle className="flex items-center gap-2 text-red-900">
                  <BarChart3 className="h-5 w-5" />
                  KPI Portfolio Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                {kpis.filter(k => k.title.trim()).map((kpi) => (
                  <div key={kpi.id} className="border-l-4 border-l-red-600 rounded-lg p-4 bg-gradient-to-r from-red-50 to-indigo-50 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-bold text-base text-gray-900">{kpi.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{kpi.description}</p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Badge className="bg-red-100 text-red-800 font-bold">{kpi.weight}%</Badge>
                        <Badge variant="outline" className="border-red-300 text-red-700">{kpi.category.split(' ')[0]}</Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-3 text-sm mt-3">
                      <div>
                        <span className="text-gray-500 font-medium">Target:</span>
                        <div className="font-bold text-gray-900">{kpi.target} {kpi.unit}</div>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium">Type:</span>
                        <div className="font-bold text-gray-900">{kpi.type.split('_')[0]}</div>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium">Priority:</span>
                        <div className="font-bold text-gray-900">{kpi.priority}</div>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium">Frequency:</span>
                        <div className="font-bold text-gray-900">{kpi.frequency}</div>
                      </div>
                      <div>
                        <span className="text-gray-500 font-medium">Timeline:</span>
                        <div className="text-xs font-medium text-gray-700">
                          {kpi.startDate && kpi.dueDate ? `${kpi.startDate} → ${kpi.dueDate}` : 'Not set'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-5 border-t-2 border-gray-200">
          <Button
            variant="outline"
            size="lg"
            onClick={onCancel}
            className="h-11 px-8 text-base font-semibold border-2 border-gray-300 hover:bg-gray-50"
          >
            Cancel
          </Button>

          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setActiveTab('preview')}
              className="h-11 px-6 text-base font-semibold border-2 border-red-500 text-red-700 hover:bg-red-50"
            >
              <Eye className="mr-2 h-5 w-5" />
              Preview
            </Button>

            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="h-11 px-8 text-base font-bold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Submitting...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-5 w-5" />
                  Submit KPIs ({validKpiCount})
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Library Selector Modal */}
      {showLibrarySelector && (
        <KpiLibrarySelectorModal
          onClose={() => setShowLibrarySelector(false)}
          onSelect={handleLibrarySelect}
          userDepartment={userProfile.department}
          userJobTitle={userProfile.jobTitle}
        />
      )}
    </div>
  );
}

// KPI Library Selector Modal Component
function KpiLibrarySelectorModal({
  onClose,
  onSelect,
  userDepartment,
  userJobTitle
}: {
  onClose: () => void;
  onSelect: (entry: any) => void;
  userDepartment: string;
  userJobTitle: string;
}) {
  const [entries, setEntries] = useState<any[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [kpiTypeFilter, setKpiTypeFilter] = useState('all');
  const [selectedEntry, setSelectedEntry] = useState<any>(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  useEffect(() => {
    let filtered = [...entries];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.kpiName.toLowerCase().includes(query) ||
        entry.department.toLowerCase().includes(query) ||
        entry.unit.toLowerCase().includes(query)
      );
    }

    if (departmentFilter !== 'all') {
      filtered = filtered.filter(entry => entry.department === departmentFilter);
    }

    if (kpiTypeFilter !== 'all') {
      filtered = filtered.filter(entry => entry.kpiType === kpiTypeFilter);
    }

    setFilteredEntries(filtered);
  }, [searchQuery, departmentFilter, kpiTypeFilter, entries]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: 'ACTIVE',
        isTemplate: 'true',
        limit: '100'
      });

      const res = await authenticatedFetch(`/api/kpi-library/entries?${params}`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      if (data.success) {
        setEntries(data.data);
        setFilteredEntries(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch KPI library');
      }
    } catch (error) {
      console.error('KPI Library fetch error:', error);
      setEntries([]);
      setFilteredEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const departments = Array.from(new Set(entries.map(e => e.department))).sort();
  const kpiTypes = ['I', 'II', 'III', 'IV'];

  const handleSelect = () => {
    if (selectedEntry) {
      onSelect(selectedEntry);
    }
  };

  const getKpiTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'I': 'Type I: Higher Better',
      'II': 'Type II: Lower Better',
      'III': 'Type III: Pass/Fail',
      'IV': 'Type IV: Custom Scale'
    };
    return labels[type] || type;
  };

  const getKpiTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      'I': 'bg-red-100 text-red-800 border-red-300',
      'II': 'bg-green-100 text-green-800 border-green-300',
      'III': 'bg-red-100 text-red-800 border-red-300',
      'IV': 'bg-orange-100 text-orange-800 border-orange-300'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-6xl max-h-[85vh] flex flex-col shadow-2xl border-2 border-gray-200">
        <CardHeader className="border-b-2 bg-gradient-to-r from-red-50 to-indigo-50 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-red-600 to-red-700 p-2.5 rounded-xl shadow-md">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  Select KPI from Library
                </CardTitle>
                <p className="text-sm text-gray-600 mt-0.5">
                  Browse and select approved KPI templates from the company library
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-9 w-9 p-0 hover:bg-red-50"
            >
              <X className="h-5 w-5 text-gray-600" />
            </Button>
          </div>
        </CardHeader>

        <div className="p-6 space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Filters */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <Label className="text-sm font-bold text-gray-700 mb-2 block">Search</Label>
              <div className="relative">
                <Input
                  placeholder="Search KPI name, department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 border-2 focus:border-red-500 font-medium"
                />
                <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div>
              <Label className="text-sm font-bold text-gray-700 mb-2 block">Department</Label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="h-10 border-2 focus:border-red-500 font-medium bg-white">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent className="z-[999999] bg-white border-2 shadow-lg" position="popper" sideOffset={5}>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-bold text-gray-700 mb-2 block">KPI Type</Label>
              <Select value={kpiTypeFilter} onValueChange={setKpiTypeFilter}>
                <SelectTrigger className="h-10 border-2 focus:border-red-500 font-medium bg-white">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="z-[999999] bg-white border-2 shadow-lg" position="popper" sideOffset={5}>
                  <SelectItem value="all">All Types</SelectItem>
                  {kpiTypes.map(type => (
                    <SelectItem key={type} value={type}>Type {type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">
              Showing {filteredEntries.length} of {entries.length} KPIs
            </p>
            {(searchQuery || departmentFilter !== 'all' || kpiTypeFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setDepartmentFilter('all');
                  setKpiTypeFilter('all');
                }}
                className="text-red-600 hover:bg-red-50 font-semibold"
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-auto border-2 rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-gray-600 font-semibold">Loading KPI library...</p>
                </div>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-700 font-bold text-lg">No KPIs found</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Try adjusting your filters or search query
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y">
                {filteredEntries.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className={`p-4 cursor-pointer transition-all ${selectedEntry?.id === entry.id
                        ? 'bg-red-50 border-l-4 border-l-red-600'
                        : 'hover:bg-gray-50'
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-base text-gray-900">{entry.kpiName}</h3>
                          <Badge className={`${getKpiTypeBadgeColor(entry.kpiType)} font-bold border`}>
                            Type {entry.kpiType}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-4 gap-4 text-sm mt-2">
                          <div>
                            <span className="text-gray-500 font-medium">Department:</span>
                            <div className="font-bold text-gray-900">{entry.department}</div>
                          </div>
                          <div>
                            <span className="text-gray-500 font-medium">Job Title:</span>
                            <div className="font-bold text-gray-900">{entry.jobTitle}</div>
                          </div>
                          <div>
                            <span className="text-gray-500 font-medium">Unit:</span>
                            <div className="font-bold text-gray-900">{entry.unit}</div>
                          </div>
                          <div>
                            <span className="text-gray-500 font-medium">Data Source:</span>
                            <div className="font-bold text-gray-900">{entry.dataSource}</div>
                          </div>
                        </div>

                        {entry.ogsmTarget && (
                          <div className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded">
                            <span className="font-semibold">OGSM Alignment:</span> {entry.ogsmTarget}
                          </div>
                        )}
                      </div>

                      {selectedEntry?.id === entry.id && (
                        <CheckCircle className="h-6 w-6 text-red-600 flex-shrink-0 ml-3" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected KPI Preview */}
          {selectedEntry && (
            <div className="rounded-lg border-2 border-red-300 bg-gradient-to-r from-red-50 to-indigo-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-red-900 mb-2">Selected KPI:</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-red-700 font-semibold">Name:</span>{' '}
                      <span className="text-red-900 font-bold">{selectedEntry.kpiName}</span>
                    </div>
                    <div>
                      <span className="text-red-700 font-semibold">Type:</span>{' '}
                      <span className="text-red-900 font-bold">{getKpiTypeLabel(selectedEntry.kpiType)}</span>
                    </div>
                    <div>
                      <span className="text-red-700 font-semibold">Unit:</span>{' '}
                      <span className="text-red-900 font-bold">{selectedEntry.unit}</span>
                    </div>
                    <div>
                      <span className="text-red-700 font-semibold">Data Source:</span>{' '}
                      <span className="text-red-900 font-bold">{selectedEntry.dataSource}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t-2 bg-gray-50 px-6 py-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={onClose}
            size="lg"
            className="h-11 px-6 font-semibold border-2"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSelect}
            disabled={!selectedEntry}
            size="lg"
            className="h-11 px-8 font-bold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            Use This KPI
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default KpiForm;