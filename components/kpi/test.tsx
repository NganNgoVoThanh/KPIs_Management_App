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
import { 
  Sparkles, 
  Target, 
  CheckCircle, 
  AlertCircle,
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
  XCircle,
  Copy
} from 'lucide-react';

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

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

interface ValidationResult {
  score: number;
  level: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  feedback: string;
  improvements: string[];
}

// Mock AI Components
const SmartKpiSuggestions: React.FC<{ onAcceptSuggestion: (s: any) => void }> = ({ onAcceptSuggestion }) => (
  <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
    <CardContent className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-red-600" />
        <h3 className="font-semibold text-red-900">AI-Powered KPI Suggestions</h3>
      </div>
      <p className="text-sm text-gray-600">AI suggestions based on your role and department will appear here.</p>
    </CardContent>
  </Card>
);

const SmartValidationPanel: React.FC<{ 
  kpiData: any; 
  onChange?: (validation: ValidationResult) => void;
  showImprovements?: boolean;
  autoValidate?: boolean;
  debounceMs?: number;
}> = ({ kpiData, onChange }) => {
  useEffect(() => {
    if (kpiData.title && kpiData.target > 0) {
      setTimeout(() => {
        onChange?.({
          score: 85,
          level: 'Good',
          feedback: 'This KPI is well-defined and measurable.',
          improvements: []
        });
      }, 500);
    }
  }, [kpiData.title, kpiData.target, onChange]);

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <span className="text-sm font-medium text-green-800">SMART Validation</span>
      </div>
      <p className="text-xs text-green-700">Automatically validated</p>
    </div>
  );
};

export function KpiForm({
  initialData = {},
  onSubmit,
  onCancel,
  userProfile,
  showAISuggestions = true,
  enableSmartValidation = true,
  maxKpis = 5,
  cycleYear = new Date().getFullYear(),
  className
}: KpiFormProps) {
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

  const [activeTab, setActiveTab] = useState('manual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationResults, setValidationResults] = useState<(ValidationResult | null)[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [totalWeight, setTotalWeight] = useState(0);

  useEffect(() => {
    const total = kpis.reduce((sum, kpi) => sum + (parseFloat(String(kpi.weight)) || 0), 0);
    setTotalWeight(total);
  }, [kpis]);

  const validateFormBeforeSubmit = (): ValidationError[] => {
    const errors: ValidationError[] = [];
    const validKpis = kpis.filter(kpi => kpi.title.trim());

    if (Math.abs(totalWeight - 100) > 0.01) {
      errors.push({
        field: 'totalWeight',
        message: `Total weight must be exactly 100% (current: ${totalWeight.toFixed(1)}%)`,
        severity: 'error'
      });
    }

    if (validKpis.length < 3) {
      errors.push({
        field: 'kpiCount',
        message: `You must create at least 3 KPIs (current: ${validKpis.length})`,
        severity: 'error'
      });
    }

    if (validKpis.length > 5) {
      errors.push({
        field: 'kpiCount',
        message: `Maximum 5 KPIs allowed (current: ${validKpis.length})`,
        severity: 'error'
      });
    }

    validKpis.forEach((kpi, idx) => {
      if (kpi.weight <= 5) {
        errors.push({
          field: `kpi-${idx}-weight`,
          message: `KPI "${kpi.title}" weight is too low (${kpi.weight}%). Must be greater than 5%`,
          severity: 'error'
        });
      }
      if (kpi.weight >= 40) {
        errors.push({
          field: `kpi-${idx}-weight`,
          message: `KPI "${kpi.title}" weight is too high (${kpi.weight}%). Must be less than 40%`,
          severity: 'error'
        });
      }
    });

    validKpis.forEach((kpi, idx) => {
      if (!kpi.unit.trim()) {
        errors.push({
          field: `kpi-${idx}-unit`,
          message: `KPI "${kpi.title}" is missing a unit of measurement`,
          severity: 'error'
        });
      }
      if (kpi.target <= 0) {
        errors.push({
          field: `kpi-${idx}-target`,
          message: `KPI "${kpi.title}" must have a target value greater than 0`,
          severity: 'error'
        });
      }
    });

    return errors;
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

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const errors = validateFormBeforeSubmit();
      setValidationErrors(errors);

      if (errors.length > 0) {
        const errorMessages = errors.map(e => e.message).join('\n\n');
        alert(`Cannot submit due to the following errors:\n\n${errorMessages}`);
        setIsSubmitting(false);
        return;
      }

      const validKpis = kpis.filter(kpi => 
        kpi.title.trim() && 
        kpi.target > 0 && 
        kpi.weight > 0 &&
        kpi.unit.trim()
      );

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
    return 'text-red-600';
  };

  const validKpiCount = kpis.filter(k => k.title.trim()).length;
  const canAddMore = kpis.length < maxKpis;

  return (
    <div className={`min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 p-6 ${className || ''}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-red-300 bg-gradient-to-r from-red-50 to-orange-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-red-900 text-2xl">
                  <Target className="h-7 w-7 text-red-600" />
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
              
              <div className="text-right">
                <div className="text-4xl font-bold">
                  <span className={getWeightColor(totalWeight)}>{totalWeight.toFixed(1)}%</span>
                  <span className="text-gray-400 text-xl">/100%</span>
                </div>
                <div className="text-sm text-gray-600 mb-2">Total Weight</div>
                
                <div className="flex items-center gap-4 text-xs">
                  <div className="text-center">
                    <div className={`text-lg font-bold ${
                      validKpiCount >= 3 && validKpiCount <= 5 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {validKpiCount}
                    </div>
                    <div className="text-gray-600">KPIs (3-5)</div>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert className="border-red-400 bg-red-50">
            <XCircle className="h-5 w-5 text-red-600" />
            <AlertDescription>
              <div className="font-semibold text-red-900 mb-2 text-lg">
                Found {validationErrors.length} error(s) that must be fixed:
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
                {validationErrors.map((error, idx) => (
                  <li key={idx}>{error.message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Validation Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className={`border-2 ${
            Math.abs(totalWeight - 100) <= 0.01 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className={`h-5 w-5 ${
                    Math.abs(totalWeight - 100) <= 0.01 ? 'text-green-600' : 'text-red-600'
                  }`} />
                  <span className="font-medium">Total Weight</span>
                </div>
                <div className={`text-2xl font-bold ${getWeightColor(totalWeight)}`}>
                  {totalWeight.toFixed(1)}%
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-600">
                {Math.abs(totalWeight - 100) <= 0.01 ? 'âœ“ Perfect' : `Need ${Math.abs(100 - totalWeight).toFixed(1)}% ${totalWeight > 100 ? 'less' : 'more'}`}
              </div>
            </CardContent>
          </Card>

          <Card className={`border-2 ${
            validKpiCount >= 3 && validKpiCount <= 5 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className={`h-5 w-5 ${
                    validKpiCount >= 3 && validKpiCount <= 5 ? 'text-green-600' : 'text-red-600'
                  }`} />
                  <span className="font-medium">KPI Count</span>
                </div>
                <div className={`text-2xl font-bold ${
                  validKpiCount >= 3 && validKpiCount <= 5 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {validKpiCount}
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-600">
                {validKpiCount < 3 ? `Need ${3 - validKpiCount} more KPI(s)` : 
                 validKpiCount > 5 ? `Remove ${validKpiCount - 5} KPI(s)` : 'âœ“ Perfect (3-5)'}
              </div>
            </CardContent>
          </Card>

          <Card className={`border-2 ${
            kpis.filter(k => k.title.trim() && (k.weight <= 5 || k.weight >= 40)).length === 0 
              ? 'border-green-300 bg-green-50' 
              : 'border-red-300 bg-red-50'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className={`h-5 w-5 ${
                    kpis.filter(k => k.title.trim() && (k.weight <= 5 || k.weight >= 40)).length === 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`} />
                  <span className="font-medium">Weight Range</span>
                </div>
                <div className={`text-2xl font-bold ${
                  kpis.filter(k => k.title.trim() && (k.weight <= 5 || k.weight >= 40)).length === 0 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {kpis.filter(k => k.title.trim() && (k.weight <= 5 || k.weight >= 40)).length}
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-600">
                {kpis.filter(k => k.title.trim() && (k.weight <= 5 || k.weight >= 40)).length === 0 
                  ? 'âœ“ All weights valid (5-40%)' 
                  : 'Invalid weight(s) found'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-red-100">
            <TabsTrigger value="ai-suggestions" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
              <Sparkles className="mr-2 h-4 w-4" />
              AI Suggestions
            </TabsTrigger>
            <TabsTrigger value="manual" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
              <FileText className="mr-2 h-4 w-4" />
              Manual Entry
            </TabsTrigger>
            <TabsTrigger value="preview" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai-suggestions">
            <SmartKpiSuggestions onAcceptSuggestion={(s) => console.log(s)} />
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            {/* Horizontal KPI Cards */}
            <div className="space-y-3">
              {kpis.map((kpi, index) => (
                <Card key={kpi.id} className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      {/* Header Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-red-600 text-white font-semibold">
                            KPI #{index + 1}
                          </Badge>
                          {kpi.title && (
                            <Badge variant="outline" className="border-red-300 text-red-700">
                              {kpi.category}
                            </Badge>
                          )}
                          {kpi.weight > 0 && (
                            <Badge className={`${
                              kpi.weight > 5 && kpi.weight < 40 
                                ? 'bg-green-100 text-green-800 border-green-300' 
                                : 'bg-red-100 text-red-800 border-red-300'
                            }`}>
                              {kpi.weight}%
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {canAddMore && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => duplicateKpi(index)}
                              className="text-blue-600 hover:bg-blue-50"
                              title="Duplicate this KPI"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                          
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

                      {/* Form Fields in Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* KPI Title */}
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium text-gray-700">KPI Title *</Label>
                          <Input
                            value={kpi.title}
                            onChange={(e) => updateKpi(index, { title: e.target.value })}
                            placeholder="Enter KPI title"
                            className="mt-1 border-red-200 focus:border-red-400"
                          />
                        </div>

                        {/* Target */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Target *</Label>
                          <Input
                            type="number"
                            value={kpi.target || ''}
                            onChange={(e) => updateKpi(index, { target: parseFloat(e.target.value) || 0 })}
                            placeholder="Target"
                            className="mt-1 border-red-200 focus:border-red-400"
                            step="0.01"
                          />
                        </div>

                        {/* Unit */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Unit *</Label>
                          <Input
                            value={kpi.unit}
                            onChange={(e) => updateKpi(index, { unit: e.target.value })}
                            placeholder="%, pieces, hours"
                            className="mt-1 border-red-200 focus:border-red-400"
                          />
                        </div>

                        {/* Weight */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Weight (%) *</Label>
                          <Input
                            type="number"
                            value={kpi.weight || ''}
                            onChange={(e) => updateKpi(index, { weight: parseFloat(e.target.value) || 0 })}
                            placeholder="5-40%"
                            className="mt-1 border-red-200 focus:border-red-400"
                            min="5"
                            max="40"
                            step="0.1"
                          />
                          <div className="flex items-center gap-2 mt-1">
                            <Progress 
                              value={Math.min((kpi.weight / 40) * 100, 100)} 
                              className="h-1 flex-1" 
                            />
                            <span className={`text-xs font-medium ${
                              kpi.weight > 5 && kpi.weight < 40 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {kpi.weight > 0 ? `${kpi.weight}%` : '0%'}
                            </span>
                          </div>
                        </div>

                        {/* Type */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700">KPI Type *</Label>
                          <Select
                            value={kpi.type.toString()}
                            onValueChange={(value) => updateKpi(index, { type: parseInt(value) })}
                          >
                            <SelectTrigger className="mt-1 border-red-200 focus:border-red-400">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Type 1: Higher Better</SelectItem>
                              <SelectItem value="2">Type 2: Lower Better</SelectItem>
                              <SelectItem value="3">Type 3: Pass/Fail</SelectItem>
                              <SelectItem value="4">Type 4: Scaled Rating</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Category */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Category *</Label>
                          <Select
                            value={kpi.category}
                            onValueChange={(value: any) => updateKpi(index, { category: value })}
                          >
                            <SelectTrigger className="mt-1 border-red-200 focus:border-red-400">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Business Objective">Business Objective</SelectItem>
                              <SelectItem value="Individual Development">Individual Development</SelectItem>
                              <SelectItem value="Core Values">Core Values</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Priority */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Priority</Label>
                          <Select
                            value={kpi.priority}
                            onValueChange={(value: any) => updateKpi(index, { priority: value })}
                          >
                            <SelectTrigger className="mt-1 border-red-200 focus:border-red-400">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="High">High</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="Low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Frequency */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Frequency</Label>
                          <Select
                            value={kpi.frequency}
                            onValueChange={(value: any) => updateKpi(index, { frequency: value })}
                          >
                            <SelectTrigger className="mt-1 border-red-200 focus:border-red-400">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Monthly">Monthly</SelectItem>
                              <SelectItem value="Quarterly">Quarterly</SelectItem>
                              <SelectItem value="Annually">Annually</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Description */}
                        <div className="md:col-span-2 lg:col-span-4">
                          <Label className="text-sm font-medium text-gray-700">Description</Label>
                          <Textarea
                            value={kpi.description}
                            onChange={(e) => updateKpi(index, { description: e.target.value })}
                            placeholder="Detailed explanation of this KPI"
                            className="mt-1 border-red-200 focus:border-red-400"
                            rows={2}
                          />
                        </div>
                      </div>

                      {/* SMART Validation */}
                      {enableSmartValidation && kpi.title && kpi.target > 0 && (
                        <SmartValidationPanel
                          kpiData={kpi}
                          onChange={(validation) => {
                            const newResults = [...validationResults];
                            newResults[index] = validation;
                            setValidationResults(newResults);
                          }}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Add KPI Button */}
            {canAddMore && (
              <Button
                onClick={addKpi}
                variant="outline"
                className="w-full border-dashed border-2 border-red-300 py-8 text-red-600 hover:text-red-700 hover:border-red-400 hover:bg-red-50"
              >
                <Plus className="mr-2 h-5 w-5" />
                Add Another KPI ({kpis.length}/{maxKpis})
              </Button>
            )}

            {!canAddMore && (
              <Alert className="border-orange-300 bg-orange-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Maximum limit of {maxKpis} KPIs reached. Remove an existing KPI to add a new one.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="preview">
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-900">
                  <BarChart3 className="h-5 w-5 text-red-600" />
                  KPI Portfolio Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {kpis.filter(k => k.title.trim()).map((kpi) => (
                    <div key={kpi.id} className="border-l-4 border-l-red-500 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg text-gray-900">{kpi.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{kpi.description}</p>
                        </div>
                        <div className="flex gap-2 ml-4 flex-shrink-0">
                          <Badge variant="outline" className="border-red-300 text-red-700">
                            {kpi.weight}%
                          </Badge>
                          <Badge className="bg-red-100 text-red-800">
                            {kpi.category}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Target:</span>
                          <div className="text-red-600 font-semibold">{kpi.target} {kpi.unit}</div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Type:</span>
                          <div>Type {kpi.type}</div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Frequency:</span>
                          <div>{kpi.frequency}</div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Priority:</span>
                          <div>{kpi.priority}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-red-200">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            Cancel
          </Button>

          <div className="flex gap-3">
            {showAISuggestions && (
              <Button
                variant="outline"
                onClick={() => setActiveTab('ai-suggestions')}
                className="border-green-300 text-green-700 hover:bg-green-50"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                AI Help
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={() => setActiveTab('preview')}
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || validationErrors.length > 0}
              className="bg-red-600 hover:bg-red-700 text-white min-w-[160px] shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Submitting...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Submit KPIs ({validKpiCount})
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Footer Requirements */}
        <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
          <CardContent className="p-6">
            <p className="font-semibold text-red-900 mb-3 text-center text-lg">
              ðŸ“‹ Submission Requirements
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-red-200">
                <CheckCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                  Math.abs(totalWeight - 100) <= 0.01 ? 'text-green-600' : 'text-gray-400'
                }`} />
                <div>
                  <div className="font-medium text-gray-900">Total Weight = 100%</div>
                  <div className="text-sm text-gray-600">Current: {totalWeight.toFixed(1)}%</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-red-200">
                <CheckCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                  validKpiCount >= 3 && validKpiCount <= 5 ? 'text-green-600' : 'text-gray-400'
                }`} />
                <div>
                  <div className="font-medium text-gray-900">3-5 KPIs Required</div>
                  <div className="text-sm text-gray-600">Current: {validKpiCount} KPIs</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-red-200">
                <CheckCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                  kpis.filter(k => k.title.trim() && (k.weight <= 5 || k.weight >= 40)).length === 0 
                    ? 'text-green-600' 
                    : 'text-gray-400'
                }`} />
                <div>
                  <div className="font-medium text-gray-900">Each Weight: 5% - 40%</div>
                  <div className="text-sm text-gray-600">
                    {kpis.filter(k => k.title.trim() && (k.weight <= 5 || k.weight >= 40)).length === 0 
                      ? 'All valid' 
                      : `${kpis.filter(k => k.title.trim() && (k.weight <= 5 || k.weight >= 40)).length} invalid`}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default KpiForm;