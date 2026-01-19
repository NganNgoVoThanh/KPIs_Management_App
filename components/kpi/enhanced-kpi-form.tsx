// components/kpi/enhanced-kpi-form.tsx - PROFESSIONAL UI REDESIGN - COMPLETE
"use client"

import React, { useState, useEffect, useCallback } from 'react';
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
  Copy, Calendar, BookOpen, Shield, TrendingUp, X,
  ChevronDown, ChevronUp, Edit2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { TypeIVScaleEditor } from './type-iv-scale-editor';
import { KpiLibrarySelectorModal } from './kpi-library-selector-modal';
import { KpiCardItem } from './kpi-card-item';
import type { TypeIVScoringRules } from '@/lib/scoring-service';
import { useSMARTValidation, useKPISuggestions, useDebouncedSMARTValidation } from '@/lib/hooks/useAI';
import type { SMARTValidationResult, KPISuggestion } from '@/lib/hooks/useAI';

export interface KpiFormData {
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
  status?: string;
}

export interface UserProfile {
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
  onSubmit: (kpis: KpiFormData[]) => Promise<void> | void;
  onSaveDraft?: (kpis: KpiFormData[]) => Promise<void>;
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
  currentCycle,
  onSaveDraft
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
    frequency: undefined, // Force user selection
    priority: 'Medium',
    startDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    ...initialData
  }]);

  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('manual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [totalWeight, setTotalWeight] = useState(0);
  const [showLibrarySelector, setShowLibrarySelector] = useState(false);
  const [selectedKpiIndex, setSelectedKpiIndex] = useState<number>(0);
  const [smartValidationResults, setSmartValidationResults] = useState<Map<number, SMARTValidationResult>>(new Map());

  // Determine if we are in Single Edit Mode
  const isSingleEditMode = maxKpis === 1;

  // Warning for unsaved changes
  // Auto-save to LocalStorage
  useEffect(() => {
    if (kpis.length > 0) {
      const draft = {
        kpis,
        lastSaved: new Date().toISOString()
      };
      localStorage.setItem('kpi_form_draft', JSON.stringify(draft));
    }
  }, [kpis]);

  // Load from LocalStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('kpi_form_draft');
    if (savedDraft && initialData && Object.keys(initialData).length === 0) {
      try {
        const { kpis: savedKpis } = JSON.parse(savedDraft);
        if (Array.isArray(savedKpis) && savedKpis.length > 0) {
          setKpis(savedKpis);
        }
      } catch (e) {
        console.error("Failed to load draft", e);
      }
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (kpis.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [kpis]);

  // AI Hooks
  const { validate: validateSMART, loading: validatingSmartLoading, result: smartResult } = useDebouncedSMARTValidation(1500);
  const { getSuggestions, loading: suggestionsLoading, suggestions, error: suggestionsError } = useKPISuggestions();

  useEffect(() => {
    // Only sum weight of "Real" KPIs (those with a title)
    // This aligns the visual matching with the validation logic
    const total = kpis
      .filter(k => k.title && k.title.trim().length > 0)
      .reduce((sum, kpi) => sum + (parseFloat(String(kpi.weight)) || 0), 0);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kpis, selectedKpiIndex]);

  // Update SMART validation results when they come back
  useEffect(() => {
    if (smartResult) {
      setSmartValidationResults(prev => new Map(prev).set(selectedKpiIndex, smartResult));
    }
  }, [smartResult, selectedKpiIndex]);

  const handleLibrarySelect = (entries: any[]) => { // Updated to accept array
    const typeMap = {
      'I': 'QUANT_HIGHER_BETTER',
      'II': 'QUANT_LOWER_BETTER',
      'III': 'BOOLEAN',
      'IV': 'MILESTONE'
    };

    const newKpis = entries.map((entry) => ({
      id: crypto.randomUUID(),
      title: entry.kpiName,
      description: entry.description || '',
      type: typeMap[entry.kpiType as keyof typeof typeMap] as KpiFormData['type'],
      unit: entry.unit || '',
      target: parseFloat(entry.yearlyTarget) || 0,
      weight: 0,
      dataSource: entry.dataSource || '',
      category: 'Business Objective' as KpiFormData['category'],
      frequency: 'Quarterly' as KpiFormData['frequency'],
      priority: 'Medium' as KpiFormData['priority'],
      startDate: currentCycle?.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      dueDate: currentCycle?.endDate?.split('T')[0] || '',
      ogsmAlignment: entry.ogsmTarget,
      status: 'DRAFT'
    }));

    setKpis([...kpis, ...newKpis]);
    setShowLibrarySelector(false);
    setActiveTab('manual');
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
        category: 'Business Objective' as KpiFormData['category'],
        frequency: undefined, // Force selection
        priority: 'Medium',
        startDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        status: 'DRAFT'
      }]);
    }
  };

  const removeKpi = useCallback((index: number) => {
    setKpis(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  }, []);

  const duplicateKpi = useCallback((index: number) => {
    setKpis(prev => {
      if (prev.length >= maxKpis) return prev;
      const originalKpi = prev[index];
      const duplicatedKpi: KpiFormData = {
        ...originalKpi,
        id: `kpi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: `${originalKpi.title} (Copy)`,
        weight: 0,
        status: 'DRAFT'
      };
      const newKpis = [...prev];
      newKpis.splice(index + 1, 0, duplicatedKpi);
      return newKpis;
    });
  }, [maxKpis]);

  const updateKpi = useCallback((index: number, updates: Partial<KpiFormData>) => {
    setKpis(prev => {
      const newKpis = [...prev];
      newKpis[index] = { ...newKpis[index], ...updates };
      return newKpis;
    });
  }, []);

  const toggleExpand = useCallback((index: number) => {
    setSelectedKpiIndex(prev => (prev === index ? -1 : index));
  }, []);

  // Enhanced Validation State
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = async () => {
    setSubmitError(null);
    setValidationErrors({});

    // 1. Filter only "Real" KPIs (must have a title)
    // We ignore empty draft rows completely
    const realKpis = kpis.filter(k => k.title && k.title.trim().length > 0);

    if (realKpis.length === 0) {
      const msg = "Please fill in at least one KPI title.";
      setSubmitError(msg);
      toast({ title: "Validation Error", description: msg, variant: "destructive" });
      return;
    }

    // 2. Validate Real KPIs
    const newErrors: Record<string, string[]> = {};
    let hasError = false;

    realKpis.forEach((kpi, index) => {
      const kpiErrors: string[] = [];

      if (!kpi.title.trim()) kpiErrors.push("Title is required");
      // Target validation depends on type
      if (kpi.type === 'QUANT_HIGHER_BETTER' || kpi.type === 'QUANT_LOWER_BETTER') {
        if (!kpi.target || kpi.target <= 0) kpiErrors.push("Target must be > 0");
      } else if (!kpi.target) {
        // for Boolean(1/0) or Milestone(steps), just ensure it has a value
        kpiErrors.push("Target value is required");
      }

      if (!kpi.unit.trim()) kpiErrors.push("Unit is required");
      if (kpi.weight < 5 || kpi.weight > 40) kpiErrors.push("Weight must be 5-40%");

      if (kpiErrors.length > 0) {
        newErrors[kpi.id!] = kpiErrors; // Use ID as key if possible, else index
        hasError = true;
      }
    });

    setValidationErrors(newErrors);

    if (hasError) {
      const msg = "Please fix the highlighted errors in the form before submitting.";
      setSubmitError(msg);
      toast({ title: "Validation Failed", description: msg, variant: "destructive" });
      // Scroll to first error?
      return;
    }

    // 3. Weight Check (on Real KPIs only)
    // SKIP this check if we are in "Single Edit Mode" (maxKpis === 1)
    // In edit mode, we are likely updating just one KPI, so total weight of the form data won't be 100%.
    const isSingleEditMode = maxKpis === 1;
    const currentTotalWeight = realKpis.reduce((sum, k) => sum + (k.weight || 0), 0);

    if (!isSingleEditMode && Math.abs(currentTotalWeight - 100) > 0.1) { // 0.1 tolerance
      const msg = `Total weight must be exactly 100%. Current: ${currentTotalWeight.toFixed(1)}%`;
      setSubmitError(msg);
      toast({ title: "Weight Mismatch", description: msg, variant: "destructive" });
      return;
    }

    const effectiveMinKpis = isSingleEditMode ? 1 : (minKpis || 1);

    if (realKpis.length < effectiveMinKpis) {
      const msg = `You need at least ${effectiveMinKpis} active KPIs. Current: ${realKpis.length}`;
      setSubmitError(msg);
      toast({ title: "Not Enough KPIs", description: msg, variant: "destructive" });
      return;
    }

    // 4. Submit Logic (improved batch handling)
    setIsSubmitting(true);
    try {
      // Pass the filtered 'realKpis' to the onSubmit handler
      // The parent component should handle the actual API calls (batch or sequential)
      await onSubmit(realKpis);
      localStorage.removeItem('kpi_form_draft'); // Clean up on success
      toast({ title: "Success", description: "KPIs submitted successfully" });
    } catch (error) {
      console.error('Form submission error:', error);
      const msg = error instanceof Error ? error.message : 'Failed to submit KPIs';
      setSubmitError(msg);
      toast({ title: "Submission Failed", description: msg, variant: "destructive" });
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (onSaveDraft) {
      setIsDraftSaving(true);
      try {
        // Only save valid rows
        const draftKpis = kpis.filter(k => k.title && k.title.trim().length > 0);
        if (draftKpis.length === 0) {
          setSubmitError("Cannot save empty draft. Please fill at least a title.");
          setIsDraftSaving(false);
          return;
        }
        await onSaveDraft(draftKpis);
        localStorage.removeItem('kpi_form_draft'); // Clean form draft after saving to DB (optional, but good for resetting state)
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : "Failed to save draft");
      } finally {
        setIsDraftSaving(false);
      }
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

            <div className="flex gap-4 items-center">
              <Button
                onClick={() => setShowLibrarySelector(true)}
                className="bg-white/20 hover:bg-white/30 text-white border border-white/40"
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Import from Library
              </Button>
              <Button
                onClick={() => alert("Excel Upload Coming Soon")} // Placeholder for Excel Upload
                className="bg-green-600 hover:bg-green-700 text-white border-0"
              >
                <Copy className="mr-2 h-4 w-4" />
                Upload Excel
              </Button>
            </div>
          </div>


        </div>
      </div>

      {
        submitError && (
          <div className="max-w-7xl mx-auto px-6 mt-6">
            <Alert className="bg-red-50 border-red-300">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-sm text-red-700 whitespace-pre-wrap">
                {submitError}
              </AlertDescription>
            </Alert>
          </div>
        )
      }

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">



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
                {validKpiCount} Draft(s)
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {validKpiCount < minKpis ? `Need ${minKpis - validKpiCount} more` :
                  validKpiCount > maxKpis ? `Remove ${validKpiCount - maxKpis}` : `✓ Valid range (${minKpis}-${maxKpis})`}
              </div>
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
          <TabsList className="grid w-full grid-cols-2 h-12 bg-white border-2 border-gray-200 p-1 rounded-xl shadow-sm">
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
                                  dueDate: '',
                                  status: 'DRAFT'
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
              <KpiCardItem
                key={kpi.id}
                index={index}
                kpi={kpi}
                isExpanded={selectedKpiIndex === index}
                onToggleExpand={toggleExpand}
                onUpdate={updateKpi}
                onDuplicate={duplicateKpi}
                onRemove={removeKpi}
                validationErrors={validationErrors[kpi.id!]}
                maxKpis={maxKpis}
                totalKpis={kpis.length}
              />
            ))}


            {
              kpis.length < maxKpis && (
                <Button
                  onClick={addKpi}
                  variant="outline"
                  size="lg"
                  className="w-full border-dashed border-2 border-gray-300 py-6 hover:border-red-500 hover:bg-red-50 text-gray-700 hover:text-red-700 font-semibold"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Add KPI ({kpis.length}/{maxKpis})
                </Button>
              )
            }
          </TabsContent >


        </Tabs >
      </div >

      {/* FIXED FOOTER ACTIONS */}
      < div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50" >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 md:items-center">
            <div className="text-sm font-medium text-gray-500">
              {kpis.length} Items ({validKpiCount} valid)
            </div>
            <div className={`flex items-center gap-1 text-sm font-bold ${Math.abs(totalWeight - 100) > 0.1 ? 'text-red-600' : 'text-green-600'}`}>
              {Math.abs(totalWeight - 100) > 0.1 ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
              Total Weight: {totalWeight.toFixed(1)}% {Math.abs(totalWeight - 100) > 0.1 && "(Target: 100%)"}
            </div>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1 md:flex-none border-gray-300 text-gray-700 hover:bg-gray-50"
              disabled={isSubmitting || isDraftSaving}
            >
              Cancel
            </Button>
            {onSaveDraft && (
              <Button
                variant="secondary"
                onClick={handleSaveDraft}
                disabled={isSubmitting || isDraftSaving}
                className="flex-1 md:flex-none bg-gray-600 hover:bg-gray-700 text-white font-bold"
              >
                {isDraftSaving ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Save Draft
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || isDraftSaving || (!isSingleEditMode && (Math.abs(totalWeight - 100) > 0.1 || validKpiCount < minKpis))}
              className={`flex-1 md:flex-none text-white shadow-md font-bold px-8 ${!isSingleEditMode && (Math.abs(totalWeight - 100) > 0.1 || validKpiCount < minKpis)
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                }`}
            >
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Submitting...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-5 w-5" />
                  Submit Goals
                </>
              )}
            </Button>
          </div>
        </div>
      </div >

      {/* KPI Library Selector Modal */}
      {
        showLibrarySelector && (
          <KpiLibrarySelectorModal
            onClose={() => setShowLibrarySelector(false)}
            onSelect={handleLibrarySelect}
            userDepartment={userProfile.department}
            userJobTitle={userProfile.jobTitle}
          />
        )
      }
    </div >
  );
}


export default KpiForm;