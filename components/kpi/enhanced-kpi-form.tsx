// components/kpi/enhanced-kpi-form.tsx
"use client"

import React, { useState, useEffect } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { 
  Sparkles, 
  Zap, 
  Target, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  FileText,
  Calculator,
  Save,
  Eye,
  Trash2,
  Plus,
  BarChart3,
  Clock,
  User,
  Building,
  Lightbulb,
  Shield
} from 'lucide-react';

// Import AI components
import SmartKpiSuggestions from '@/components/ai/smart-kpi-suggestions';
import SmartValidationPanel from '@/components/ai/smart-validation-panel';
import { enhancedAIService } from '@/lib/ai-services-enhanced';

interface KpiFormData {
  id?: string;
  title: string;
  description: string;
  type: number;
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
}

interface UserProfile {
  id: string;
  name: string;
  department: string;
  jobTitle: string;
  managerId?: string;
  experienceLevel?: 'Junior' | 'Mid-level' | 'Senior';
}

interface KpiFormProps {
  initialData?: Partial<KpiFormData>;
  onSubmit: (kpis: KpiFormData[]) => void;
  onCancel: () => void;
  userProfile: UserProfile;
  showAISuggestions?: boolean;
  enableSmartValidation?: boolean;
  enableRealTimeAnalysis?: boolean;
  maxKpis?: number;
  cycleYear?: number;
  className?: string;
}

interface ValidationSummary {
  totalKpis: number;
  averageScore: number;
  excellentCount: number;
  goodCount: number;
  needsImprovementCount: number;
  topIssues: string[];
}

export function KpiForm({
  initialData = {},
  onSubmit,
  onCancel,
  userProfile,
  showAISuggestions = true,
  enableSmartValidation = true,
  enableRealTimeAnalysis = false,
  maxKpis = 8,
  cycleYear = new Date().getFullYear(),
  className
}: KpiFormProps) {
  // Form State
  const [kpis, setKpis] = useState<KpiFormData[]>([{
    id: `kpi-${Date.now()}`,
    title: '',
    description: '',
    type: 1,
    unit: '',
    target: 0,
    weight: 0,
    formula: '',
    dataSource: '',
    evidenceRequirements: '',
    category: 'Business Objective',
    ogsmAlignment: '',
    frequency: 'Quarterly',
    priority: 'Medium',
    dependencies: '',
    ...initialData
  }]);

  // UI State
  const [activeTab, setActiveTab] = useState('ai-suggestions');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // AI State
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  // Calculated Values
  const [totalWeight, setTotalWeight] = useState(0);
  const [categoryDistribution, setCategoryDistribution] = useState({
    businessObjective: 0,
    individualDevelopment: 0,
    coreValues: 0
  });

  // Calculate totals whenever KPIs change
  useEffect(() => {
    const total = kpis.reduce((sum, kpi) => sum + (kpi.weight || 0), 0);
    setTotalWeight(total);

    // Calculate category distribution
    const distribution = kpis.reduce((acc, kpi) => {
      switch (kpi.category) {
        case 'Business Objective':
          acc.businessObjective += kpi.weight || 0;
          break;
        case 'Individual Development':
          acc.individualDevelopment += kpi.weight || 0;
          break;
        case 'Core Values':
          acc.coreValues += kpi.weight || 0;
          break;
      }
      return acc;
    }, { businessObjective: 0, individualDevelopment: 0, coreValues: 0 });

    setCategoryDistribution(distribution);
  }, [kpis]);

  // Auto-validate KPIs when they change
  useEffect(() => {
    if (enableSmartValidation && kpis.some(kpi => kpi.title)) {
      const debounceTimer = setTimeout(() => {
        validateAllKPIs();
      }, 2000); // 2 second debounce

      return () => clearTimeout(debounceTimer);
    }
  }, [kpis, enableSmartValidation]);

  // Generate AI insights when KPIs change
  useEffect(() => {
    if (enableRealTimeAnalysis && kpis.length > 1) {
      generateAIInsights();
    }
  }, [kpis, enableRealTimeAnalysis]);

  const validateAllKPIs = async () => {
    setIsValidating(true);
    const results = [];
    
    try {
      for (let i = 0; i < kpis.length; i++) {
        const kpi = kpis[i];
        if (kpi.title && kpi.target) {
          try {
            const result = await enhancedAIService.validateKPISMART({
              title: kpi.title,
              description: kpi.description,
              target: kpi.target,
              unit: kpi.unit,
              measurementMethod: kpi.formula,
              dataSource: kpi.dataSource,
              timeline: `${kpi.frequency} for ${cycleYear}`
            });
            results[i] = result;
          } catch (error) {
            console.error(`Validation error for KPI ${i}:`, error);
            results[i] = null;
          }
        } else {
          results[i] = null;
        }
      }
      
      setValidationResults(results);
      
      // Calculate validation summary
      const validResults = results.filter(r => r !== null);
      if (validResults.length > 0) {
        const summary: ValidationSummary = {
          totalKpis: validResults.length,
          averageScore: Math.round(validResults.reduce((sum, r) => sum + r.score, 0) / validResults.length),
          excellentCount: validResults.filter(r => r.score >= 90).length,
          goodCount: validResults.filter(r => r.score >= 70 && r.score < 90).length,
          needsImprovementCount: validResults.filter(r => r.score < 70).length,
          topIssues: getTopValidationIssues(validResults)
        };
        setValidationSummary(summary);
      }
    } catch (error) {
      console.error('Batch validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const generateAIInsights = async () => {
    try {
      const kpiData = kpis
        .filter(kpi => kpi.title && kpi.target > 0)
        .map(kpi => ({
          id: kpi.id,
          name: kpi.title,
          actualValue: kpi.target, // Use target as placeholder
          targetValue: kpi.target,
          category: kpi.category,
          weight: kpi.weight,
          type: kpi.type
        }));

      if (kpiData.length > 0) {
        const insights = await enhancedAIService.generateInsights(kpiData, 'current');
        setAiInsights(insights);
      }
    } catch (error) {
      console.error('AI insights generation error:', error);
    }
  };

  const getTopValidationIssues = (results: any[]): string[] => {
    const issueCount = new Map<string, number>();
    
    results.forEach(result => {
      if (result.detailedAnalysis) {
        Object.values(result.detailedAnalysis.criteria).forEach((criterion: any) => {
          if (criterion.improvements) {
            criterion.improvements.forEach((issue: string) => {
              issueCount.set(issue, (issueCount.get(issue) || 0) + 1);
            });
          }
        });
      }
    });

    return Array.from(issueCount.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([issue]) => issue);
  };

  const addKpi = () => {
    if (kpis.length < maxKpis) {
      const newKpi: KpiFormData = {
        id: `kpi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: '',
        description: '',
        type: 1,
        unit: '',
        target: 0,
        weight: 0,
        formula: '',
        dataSource: '',
        evidenceRequirements: '',
        category: 'Business Objective',
        ogsmAlignment: '',
        frequency: 'Quarterly',
        priority: 'Medium',
        dependencies: ''
      };
      setKpis([...kpis, newKpi]);
    }
  };

  const removeKpi = (index: number) => {
    if (kpis.length > 1) {
      const newKpis = kpis.filter((_, i) => i !== index);
      setKpis(newKpis);
      
      // Remove validation result for this KPI
      const newValidationResults = validationResults.filter((_, i) => i !== index);
      setValidationResults(newValidationResults);
    }
  };

  const updateKpi = (index: number, updates: Partial<KpiFormData>) => {
    const newKpis = [...kpis];
    newKpis[index] = { ...newKpis[index], ...updates };
    setKpis(newKpis);
  };

  const duplicateKpi = (index: number) => {
    if (kpis.length < maxKpis) {
      const originalKpi = kpis[index];
      const duplicatedKpi: KpiFormData = {
        ...originalKpi,
        id: `kpi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: `${originalKpi.title} (Copy)`,
        weight: 0 // Reset weight to avoid exceeding 100%
      };
      
      const newKpis = [...kpis];
      newKpis.splice(index + 1, 0, duplicatedKpi);
      setKpis(newKpis);
    }
  };

  const handleAISuggestionAccept = (suggestion: any) => {
    const newKpi: KpiFormData = {
      id: `kpi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: suggestion.name || suggestion.title,
      description: suggestion.description,
      type: getKpiTypeFromAI(suggestion.type),
      unit: suggestion.unit,
      target: suggestion.target || suggestion.suggestedTarget,
      weight: suggestion.weight,
      formula: suggestion.formula || suggestion.measurementMethod || '',
      dataSource: suggestion.dataSource,
      evidenceRequirements: Array.isArray(suggestion.evidenceRequirements) 
        ? suggestion.evidenceRequirements.join(', ') 
        : suggestion.evidenceRequirements || '',
      category: suggestion.category || 'Business Objective',
      ogsmAlignment: suggestion.ogsmAlignment || suggestion.rationale,
      frequency: 'Quarterly',
      priority: 'Medium',
      dependencies: ''
    };

    // Find first empty KPI slot or add new one
    const emptyIndex = kpis.findIndex(kpi => !kpi.title.trim());
    if (emptyIndex >= 0) {
      updateKpi(emptyIndex, newKpi);
    } else if (kpis.length < maxKpis) {
      setKpis([...kpis, newKpi]);
    } else {
      // Replace last KPI if at max capacity
      const newKpis = [...kpis];
      newKpis[kpis.length - 1] = newKpi;
      setKpis(newKpis);
    }

    // Switch to manual tab to show the accepted KPI
    setActiveTab('manual');
    
    // Show success notification
    setTimeout(() => {
      alert(`KPI "${newKpi.title}" has been added successfully!`);
    }, 100);
  };

  const getKpiTypeFromAI = (aiType: string | number): number => {
    if (typeof aiType === 'number') return aiType;
    
    switch (aiType) {
      case 'quantitative':
      case 'QUANT_HIGHER_BETTER':
        return 1;
      case 'QUANT_LOWER_BETTER':
        return 2;
      case 'binary':
      case 'BOOLEAN':
        return 3;
      case 'qualitative':
      case 'BEHAVIOR':
      case 'MILESTONE':
        return 4;
      default:
        return 1;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Validate form data
      const validKpis = kpis.filter(kpi => 
        kpi.title.trim() && 
        kpi.target > 0 && 
        kpi.weight > 0 &&
        kpi.unit.trim()
      );

      if (validKpis.length === 0) {
        alert('Please add at least one complete KPI with title, target, weight, and unit.');
        return;
      }

      if (Math.abs(totalWeight - 100) > 0.01) {
        const confirm = window.confirm(
          `Total weight is ${totalWeight}%, not exactly 100%. Continue anyway?`
        );
        if (!confirm) return;
      }

      // Check validation scores
      if (validationSummary && validationSummary.needsImprovementCount > validKpis.length / 2) {
        const confirm = window.confirm(
          `${validationSummary.needsImprovementCount} KPI(s) have low SMART scores. This may affect approval. Continue anyway?`
        );
        if (!confirm) return;
      }

      // Final validation before submission
      console.log('Submitting KPIs:', validKpis);
      onSubmit(validKpis);
      
    } catch (error) {
      console.error('Form submission error:', error);
      alert('Failed to submit KPIs. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWeightColor = (weight: number): string => {
    if (Math.abs(weight - 100) <= 1) return 'text-green-600';
    if (weight > 100) return 'text-red-600';
    if (weight > 90) return 'text-yellow-600';
    if (weight > 70) return 'text-red-600';
    return 'text-gray-600';
  };

  const getCategoryRecommendation = (category: string, current: number): string => {
    switch (category) {
      case 'Business Objective':
        if (current < 60) return 'Too low - should be 60-80%';
        if (current > 80) return 'Too high - should be 60-80%';
        return 'Good range';
      case 'Individual Development':
        if (current < 15) return 'Too low - should be 15-25%';
        if (current > 25) return 'Too high - should be 15-25%';
        return 'Good range';
      case 'Core Values':
        if (current < 5) return 'Too low - should be 5-15%';
        if (current > 15) return 'Too high - should be 5-15%';
        return 'Good range';
      default:
        return '';
    }
  };

  const renderKpiTypeHelp = (type: number): string => {
    switch (type) {
      case 1: return 'Higher values = better performance (e.g., sales, productivity)';
      case 2: return 'Lower values = better performance (e.g., costs, defects)';
      case 3: return 'Pass/Fail criteria (e.g., certification achieved)';
      case 4: return 'Scale-based measurement (e.g., 1-5 rating)';
      default: return '';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Enhanced Header with Comprehensive Summary */}
      <Card className="border-red-200 bg-gradient-to-r from-red-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-red-900">
                <Target className="h-6 w-6 text-red-600" />
                KPI Goal Setting - {userProfile.name}
              </CardTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-red-700">
                <div className="flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  {userProfile.department}
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {userProfile.jobTitle}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {cycleYear} Cycle
                </div>
              </div>
            </div>
            
            {/* Weight and KPI Summary */}
            <div className="text-right">
              <div className="text-3xl font-bold">
                <span className={getWeightColor(totalWeight)}>{totalWeight.toFixed(1)}%</span>
                <span className="text-gray-400 text-lg">/100%</span>
              </div>
              <div className="text-sm text-gray-600 mb-2">Total Weight</div>
              
              <div className="flex items-center gap-4 text-xs">
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">
                    {kpis.filter(k => k.title.trim()).length}
                  </div>
                  <div className="text-gray-600">KPIs</div>
                </div>
                
                {validationSummary && (
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      {validationSummary.averageScore}
                    </div>
                    <div className="text-gray-600">SMART Avg</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Category Distribution Summary */}
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">
                {categoryDistribution.businessObjective.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600">Business Objective</div>
              <div className="text-xs text-gray-500">
                {getCategoryRecommendation('Business Objective', categoryDistribution.businessObjective)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {categoryDistribution.individualDevelopment.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600">Individual Development</div>
              <div className="text-xs text-gray-500">
                {getCategoryRecommendation('Individual Development', categoryDistribution.individualDevelopment)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">
                {categoryDistribution.coreValues.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600">Core Values</div>
              <div className="text-xs text-gray-500">
                {getCategoryRecommendation('Core Values', categoryDistribution.coreValues)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Insights Panel */}
      {aiInsights.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Lightbulb className="h-5 w-5" />
              AI Insights & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {aiInsights.map((insight, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="h-2 w-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-green-700">{insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          {showAISuggestions && (
            <TabsTrigger value="ai-suggestions">
              <Sparkles className="mr-2 h-4 w-4" />
              AI Suggestions
            </TabsTrigger>
          )}
          <TabsTrigger value="manual">
            <FileText className="mr-2 h-4 w-4" />
            Manual Entry
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="mr-2 h-4 w-4" />
            Preview & Validate
          </TabsTrigger>
        </TabsList>

        {/* AI Suggestions Tab */}
        {showAISuggestions && (
          <TabsContent value="ai-suggestions">
            <SmartKpiSuggestions
              userId={userProfile.id}
              department={userProfile.department}
              jobTitle={userProfile.jobTitle}
              onAcceptSuggestion={handleAISuggestionAccept}
              onRejectSuggestion={(id) => console.log('Rejected suggestion:', id)}
            />
          </TabsContent>
        )}

        {/* Manual Entry Tab - Fixed z-index issues */}
        <TabsContent value="manual" className="space-y-4">
          {kpis.map((kpi, index) => (
            <Card key={kpi.id || index} className="relative overflow-visible">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">
                      KPI #{index + 1}
                    </CardTitle>
                    {kpi.title && (
                      <Badge variant="outline" className="text-xs">
                        {kpi.category}
                      </Badge>
                    )}
                    {kpi.priority && (
                      <Badge className={`text-xs ${
                        kpi.priority === 'High' ? 'bg-red-100 text-red-800' :
                        kpi.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {kpi.priority}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {validationResults[index] && (
                      <Badge className={`text-xs ${
                        validationResults[index].score >= 80 ? 'bg-green-100 text-green-800' :
                        validationResults[index].score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        SMART: {validationResults[index].score}
                      </Badge>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => duplicateKpi(index)}
                      className="text-red-600 hover:bg-red-50"
                      title="Duplicate this KPI"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    
                    {kpis.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeKpi(index)}
                        className="text-red-600 hover:bg-red-50"
                        title="Remove this KPI"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 overflow-visible">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-visible">
                  {/* KPI Title */}
                  <div className="md:col-span-2">
                    <Label htmlFor={`title-${index}`}>KPI Title *</Label>
                    <Input
                      id={`title-${index}`}
                      value={kpi.title}
                      onChange={(e) => updateKpi(index, { title: e.target.value })}
                      placeholder="Enter specific, measurable KPI title (e.g., 'Increase production efficiency by 15%')"
                      className="mt-1"
                    />
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <Label htmlFor={`description-${index}`}>Description</Label>
                    <Textarea
                      id={`description-${index}`}
                      value={kpi.description}
                      onChange={(e) => updateKpi(index, { description: e.target.value })}
                      placeholder="Detailed explanation of what this KPI measures, why it's important, and how it contributes to business objectives"
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  {/* KPI Type and Category */}
                  <div className="relative z-10">
                    <Label htmlFor={`type-${index}`}>KPI Type *</Label>
                    <Select
                      value={kpi.type.toString()}
                      onValueChange={(value) => updateKpi(index, { type: parseInt(value) })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select KPI type" />
                      </SelectTrigger>
                      <SelectContent 
                        className="z-[9999] select-content-override" 
                        sideOffset={4}
                        position="popper"
                        side="bottom"
                        align="start"
                      >
                        <SelectItem value="1">Type 1: Higher is Better</SelectItem>
                        <SelectItem value="2">Type 2: Lower is Better</SelectItem>
                        <SelectItem value="3">Type 3: Pass/Fail</SelectItem>
                        <SelectItem value="4">Type 4: Scaled Rating</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      {renderKpiTypeHelp(kpi.type)}
                    </p>
                  </div>

                  <div className="relative z-10">
                    <Label htmlFor={`category-${index}`}>Category *</Label>
                    <Select
                      value={kpi.category}
                      onValueChange={(value: any) => updateKpi(index, { category: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]" sideOffset={4}>
                        <SelectItem value="Business Objective">Business Objective (60-80%)</SelectItem>
                        <SelectItem value="Individual Development">Individual Development (15-25%)</SelectItem>
                        <SelectItem value="Core Values">Core Values (5-15%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Target and Unit */}
                  <div>
                    <Label htmlFor={`target-${index}`}>Target *</Label>
                    <Input
                      id={`target-${index}`}
                      type="number"
                      value={kpi.target || ''}
                      onChange={(e) => updateKpi(index, { target: parseFloat(e.target.value) || 0 })}
                      placeholder="Target value"
                      className="mt-1"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`unit-${index}`}>Unit *</Label>
                    <Input
                      id={`unit-${index}`}
                      value={kpi.unit}
                      onChange={(e) => updateKpi(index, { unit: e.target.value })}
                      placeholder="%, pieces, hours, days, etc."
                      className="mt-1"
                    />
                  </div>

                  {/* Weight and Priority */}
                  <div>
                    <Label htmlFor={`weight-${index}`}>Weight (%) *</Label>
                    <Input
                      id={`weight-${index}`}
                      type="number"
                      value={kpi.weight || ''}
                      onChange={(e) => updateKpi(index, { weight: parseFloat(e.target.value) || 0 })}
                      placeholder="Weight percentage"
                      className="mt-1"
                      min="1"
                      max="50"
                      step="0.1"
                    />
                    <Progress value={(kpi.weight / 50) * 100} className="h-1 mt-1" />
                  </div>

                  <div className="relative z-30">
                    <Label htmlFor={`priority-${index}`}>Priority</Label>
                    <Select
                      value={kpi.priority}
                      onValueChange={(value: any) => updateKpi(index, { priority: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-30">
                        <SelectItem value="High">High Priority</SelectItem>
                        <SelectItem value="Medium">Medium Priority</SelectItem>
                        <SelectItem value="Low">Low Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Frequency and Data Source */}
                  <div className="relative z-20">
                    <Label htmlFor={`frequency-${index}`}>Measurement Frequency</Label>
                    <Select
                      value={kpi.frequency}
                      onValueChange={(value: any) => updateKpi(index, { frequency: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-20">
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Quarterly">Quarterly</SelectItem>
                        <SelectItem value="Annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor={`dataSource-${index}`}>Data Source</Label>
                    <Input
                      id={`dataSource-${index}`}
                      value={kpi.dataSource}
                      onChange={(e) => updateKpi(index, { dataSource: e.target.value })}
                      placeholder="System, report, database, or manual tracking"
                      className="mt-1"
                    />
                  </div>

                  {/* Formula/Measurement Method */}
                  <div className="md:col-span-2">
                    <Label htmlFor={`formula-${index}`}>Measurement Method/Formula</Label>
                    <Input
                      id={`formula-${index}`}
                      value={kpi.formula}
                      onChange={(e) => updateKpi(index, { formula: e.target.value })}
                      placeholder="How this KPI will be calculated or measured (e.g., (Actual Output / Target Output) × 100)"
                      className="mt-1"
                    />
                  </div>

                  {/* OGSM Alignment */}
                  <div className="md:col-span-2">
                    <Label htmlFor={`ogsm-${index}`}>OGSM Alignment</Label>
                    <Textarea
                      id={`ogsm-${index}`}
                      value={kpi.ogsmAlignment}
                      onChange={(e) => updateKpi(index, { ogsmAlignment: e.target.value })}
                      placeholder="Explain how this KPI directly supports company OGSM objectives and strategic goals"
                      className="mt-1"
                      rows={2}
                    />
                  </div>

                  {/* Dependencies and Evidence */}
                  <div>
                    <Label htmlFor={`dependencies-${index}`}>Dependencies</Label>
                    <Input
                      id={`dependencies-${index}`}
                      value={kpi.dependencies}
                      onChange={(e) => updateKpi(index, { dependencies: e.target.value })}
                      placeholder="Other teams, systems, or resources needed"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`evidence-${index}`}>Evidence Requirements</Label>
                    <Input
                      id={`evidence-${index}`}
                      value={kpi.evidenceRequirements}
                      onChange={(e) => updateKpi(index, { evidenceRequirements: e.target.value })}
                      placeholder="Reports, documents, or proof needed to verify achievement"
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* SMART Validation Panel for this KPI */}
                {enableSmartValidation && kpi.title && (
                  <div className="border-t pt-4 mt-4">
                    <SmartValidationPanel
                      kpiData={{
                        title: kpi.title,
                        description: kpi.description,
                        target: kpi.target,
                        unit: kpi.unit,
                        measurementMethod: kpi.formula,
                        dataSource: kpi.dataSource,
                        timeline: `${kpi.frequency} measurements for ${cycleYear}`
                      }}
                      showImprovements={true}
                      autoValidate={true}
                      debounceMs={2000}
                      onChange={(validation) => {
                        const newResults = [...validationResults];
                        newResults[index] = validation;
                        setValidationResults(newResults);
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Add KPI Button */}
          {kpis.length < maxKpis && (
            <Button
              onClick={addKpi}
              variant="outline"
              className="w-full border-dashed border-2 py-8 text-gray-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add Another KPI ({kpis.length}/{maxKpis})
            </Button>
          )}
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-red-600" />
                KPI Portfolio Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Overall Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {kpis.filter(k => k.title.trim()).length}
                    </div>
                    <div className="text-sm text-gray-600">Total KPIs</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className={`text-2xl font-bold ${getWeightColor(totalWeight)}`}>
                      {totalWeight.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Total Weight</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {validationSummary ? validationSummary.averageScore : '--'}
                    </div>
                    <div className="text-sm text-gray-600">Avg SMART Score</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {Math.round((categoryDistribution.businessObjective / Math.max(totalWeight, 1)) * 100)}%
                    </div>
                    <div className="text-sm text-gray-600">Business Focus</div>
                  </div>
                </div>

                {/* Category Breakdown */}
                <div>
                  <h3 className="font-medium mb-3">Category Distribution</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">Business Objectives</span>
                        <span className="text-sm">{categoryDistribution.businessObjective.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min((categoryDistribution.businessObjective / 80) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {getCategoryRecommendation('Business Objective', categoryDistribution.businessObjective)}
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">Individual Development</span>
                        <span className="text-sm">{categoryDistribution.individualDevelopment.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min((categoryDistribution.individualDevelopment / 25) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {getCategoryRecommendation('Individual Development', categoryDistribution.individualDevelopment)}
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">Core Values</span>
                        <span className="text-sm">{categoryDistribution.coreValues.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min((categoryDistribution.coreValues / 15) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {getCategoryRecommendation('Core Values', categoryDistribution.coreValues)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* KPI List Preview */}
                <div>
                  <h3 className="font-medium mb-3">KPI Details</h3>
                  <div className="space-y-3">
                    {kpis.filter(kpi => kpi.title.trim()).map((kpi, index) => (
                      <div key={kpi.id || index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium">{kpi.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{kpi.description}</p>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Badge variant="outline" className="text-xs">
                              {kpi.weight}%
                            </Badge>
                            <Badge className={`text-xs ${
                              kpi.category === 'Business Objective' ? 'bg-red-100 text-red-800' :
                              kpi.category === 'Individual Development' ? 'bg-green-100 text-green-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {kpi.category}
                            </Badge>
                            {validationResults[index] && (
                              <Badge className={`text-xs ${
                                validationResults[index].score >= 80 ? 'bg-green-100 text-green-800' :
                                validationResults[index].score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                SMART: {validationResults[index].score}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Target:</span>
                            <div>{kpi.target} {kpi.unit}</div>
                          </div>
                          <div>
                            <span className="font-medium">Type:</span>
                            <div>Type {kpi.type}</div>
                          </div>
                          <div>
                            <span className="font-medium">Frequency:</span>
                            <div>{kpi.frequency}</div>
                          </div>
                          <div>
                            <span className="font-medium">Priority:</span>
                            <div>{kpi.priority}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Validation Alerts */}
      <div className="space-y-2">
        {/* Weight Validation */}
        {Math.abs(totalWeight - 100) > 0.01 && (
          <Alert className={`${
            totalWeight > 100 ? 'border-red-300 bg-red-50' : 
            totalWeight > 90 ? 'border-yellow-300 bg-yellow-50' : 
            'border-red-300 bg-red-50'
          }`}>
            <Calculator className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>
                  {totalWeight > 100 
                    ? `Total weight exceeds 100% by ${(totalWeight - 100).toFixed(1)}%` 
                    : totalWeight > 90
                    ? `Total weight is ${totalWeight.toFixed(1)}% - add ${(100 - totalWeight).toFixed(1)}% more`
                    : `Total weight is only ${totalWeight.toFixed(1)}% - please add more KPIs`
                  }
                </span>
                <Badge className={`${
                  totalWeight > 100 ? 'bg-red-100 text-red-800' :
                  totalWeight > 90 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {totalWeight.toFixed(1)}% / 100%
                </Badge>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* SMART Validation Alert */}
        {validationSummary && validationSummary.needsImprovementCount > 0 && (
          <Alert className="border-yellow-300 bg-yellow-50">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>
                  {validationSummary.needsImprovementCount} KPI(s) need SMART improvement (score &lt; 70)
                </span>
                <Badge className="bg-yellow-100 text-yellow-800">
                  Avg: {validationSummary.averageScore}/100
                </Badge>
              </div>
              {validationSummary.topIssues.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium">Common issues:</p>
                  <ul className="text-sm list-disc list-inside mt-1">
                    {validationSummary.topIssues.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Category Balance Alert */}
        {(categoryDistribution.businessObjective < 60 || categoryDistribution.businessObjective > 80) && (
          <Alert className="border-orange-300 bg-orange-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Business Objective KPIs are {categoryDistribution.businessObjective.toFixed(1)}%. 
              Recommended range is 60-80% for balanced performance management.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* SMART Validation Summary */}
      {validationSummary && (
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-red-600" />
              SMART Validation Summary
              {isValidating && (
                <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {validationSummary.excellentCount}
                </div>
                <div className="text-xs text-gray-600">Excellent (≥90)</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {validationSummary.goodCount}
                </div>
                <div className="text-xs text-gray-600">Good (70-89)</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {validationSummary.needsImprovementCount}
                </div>
                <div className="text-xs text-gray-600">Needs Work (&lt;70)</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">
                  {validationSummary.averageScore}
                </div>
                <div className="text-xs text-gray-600">Average Score</div>
              </div>
            </div>

            {/* Validation Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Overall SMART Quality</span>
                <span>{validationSummary.averageScore}/100</span>
              </div>
              <Progress value={validationSummary.averageScore} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>

        <div className="flex gap-2">
          {showAISuggestions && (
            <Button
              variant="outline"
              onClick={() => setActiveTab('ai-suggestions')}
              className="border-green-300 text-green-700 hover:bg-green-50"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Get AI Help
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={() => setActiveTab('preview')}
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview Portfolio
          </Button>
          
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting || 
              Math.abs(totalWeight - 100) > 5 || // Allow 5% tolerance
              kpis.filter(k => k.title.trim()).length === 0 ||
              isValidating
            }
            className="bg-red-600 hover:bg-red-700 text-white min-w-[140px]"
          >
            {isSubmitting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Submitting...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Submit KPIs ({kpis.filter(k => k.title.trim()).length})
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-xs text-gray-500 text-center p-4 bg-gray-50 rounded">
        <p>
          💡 Tip: Use the AI Suggestions tab for intelligent KPI recommendations based on your role and OGSM objectives. 
          All KPIs are validated in real-time using SMART criteria for optimal quality.
        </p>
      </div>
    </div>
  );
}

export default KpiForm;