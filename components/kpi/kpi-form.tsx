"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import type { KpiTemplate, KpiType } from "@/lib/types"
import { 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle,
  Target,
  TrendingUp,
  Info
} from "lucide-react"

interface KpiFormData {
  title: string
  type: KpiType
  unit: string
  target: number
  weight: number
  dataSource: string
  formula?: string
  description?: string
}

interface KpiFormProps {
  template?: KpiTemplate
  onSubmit: (kpis: KpiFormData[]) => void
  onCancel: () => void
}

export function KpiForm({ template, onSubmit, onCancel }: KpiFormProps) {
  const [kpis, setKpis] = useState<KpiFormData[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [totalWeight, setTotalWeight] = useState(0)

  useEffect(() => {
    if (template) {
      // Initialize KPIs from template
      const templateKpis = template.kpiFields.map(field => ({
        title: field.title,
        type: field.type,
        unit: field.unit,
        target: field.targetRange?.recommended || 0,
        weight: field.weight,
        dataSource: field.dataSource || '',
        formula: field.formula,
        description: field.description
      }))
      setKpis(templateKpis)
    } else {
      // Start with one empty KPI
      setKpis([createEmptyKpi()])
    }
  }, [template])

  useEffect(() => {
    // Calculate total weight
    const total = kpis.reduce((sum, kpi) => sum + (kpi.weight || 0), 0)
    setTotalWeight(total)
  }, [kpis])

  const createEmptyKpi = (): KpiFormData => ({
    title: '',
    type: 'QUANT_HIGHER_BETTER',
    unit: '',
    target: 0,
    weight: 0,
    dataSource: '',
    formula: '',
    description: ''
  })

  const handleKpiChange = (index: number, field: keyof KpiFormData, value: any) => {
    const newKpis = [...kpis]
    newKpis[index] = { ...newKpis[index], [field]: value }
    setKpis(newKpis)
    
    // Clear error for this field
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[`${index}-${field}`]
      return newErrors
    })
  }

  const addKpi = () => {
    setKpis([...kpis, createEmptyKpi()])
  }

  const removeKpi = (index: number) => {
    setKpis(kpis.filter((_, i) => i !== index))
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    kpis.forEach((kpi, index) => {
      if (!kpi.title) {
        newErrors[`${index}-title`] = 'Title is required'
      }
      if (!kpi.unit) {
        newErrors[`${index}-unit`] = 'Unit is required'
      }
      if (kpi.target <= 0) {
        newErrors[`${index}-target`] = 'Target must be greater than 0'
      }
      if (kpi.weight <= 0 || kpi.weight > 100) {
        newErrors[`${index}-weight`] = 'Weight must be between 1 and 100'
      }
    })
    
    if (totalWeight !== 100) {
      newErrors['totalWeight'] = 'Total weight must equal 100%'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(kpis)
    }
  }

  const getKpiTypeLabel = (type: KpiType): string => {
    const labels: Record<KpiType, string> = {
      'QUANT_HIGHER_BETTER': 'Quantitative - Higher is Better',
      'QUANT_LOWER_BETTER': 'Quantitative - Lower is Better',
      'MILESTONE': 'Milestone Based',
      'BOOLEAN': 'Yes/No Achievement',
      'BEHAVIOR': 'Behavioral/Competency'
    }
    return labels[type]
  }

  const getSmartScore = (kpi: KpiFormData): number => {
    let score = 0
    if (kpi.title && kpi.title.length > 5) score += 20 // Specific
    if (kpi.unit && kpi.target > 0) score += 20 // Measurable
    if (kpi.target > 0 && kpi.target < 1000000) score += 20 // Achievable
    if (kpi.dataSource) score += 20 // Relevant
    if (kpi.title) score += 20 // Time-bound (assumed from cycle)
    return score
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Create KPIs</h1>
        <p className="text-muted-foreground mt-2">
          {template ? `Using template: ${template.name}` : 'Create custom KPIs'}
        </p>
      </div>

      {/* Weight Progress */}
      <Card className={totalWeight === 100 ? "border-green-200" : "border-red-200"}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5" />
            Total Weight
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total weight of all KPIs</span>
              <span className={`font-bold ${totalWeight === 100 ? 'text-green-600' : 'text-red-600'}`}>
                {totalWeight}%
              </span>
            </div>
            <Progress 
              value={Math.min(100, totalWeight)} 
              className={`h-2 ${totalWeight === 100 ? '[&>div]:bg-green-600' : '[&>div]:bg-red-600'}`}
            />
            {totalWeight !== 100 && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Total weight must equal 100%. Current: {totalWeight}%
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Forms */}
      <div className="space-y-4">
        {kpis.map((kpi, index) => {
          const smartScore = getSmartScore(kpi)
          
          return (
            <Card key={index} className="kpi-card">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">KPI #{index + 1}</CardTitle>
                    <CardDescription>Define your performance indicator</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={smartScore >= 80 ? "default" : "outline"}>
                      SMART: {smartScore}%
                    </Badge>
                    {kpis.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeKpi(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor={`title-${index}`}>
                      KPI Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id={`title-${index}`}
                      value={kpi.title}
                      onChange={(e) => handleKpiChange(index, 'title', e.target.value)}
                      placeholder="e.g., Reduce Internal NCR Cases"
                      className={errors[`${index}-title`] ? 'border-red-500' : ''}
                    />
                    {errors[`${index}-title`] && (
                      <p className="text-xs text-red-500 mt-1">{errors[`${index}-title`]}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`type-${index}`}>
                      Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={kpi.type}
                      onValueChange={(value) => handleKpiChange(index, 'type', value)}
                    >
                      <SelectTrigger id={`type-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="QUANT_HIGHER_BETTER">Higher is Better</SelectItem>
                        <SelectItem value="QUANT_LOWER_BETTER">Lower is Better</SelectItem>
                        <SelectItem value="MILESTONE">Milestone</SelectItem>
                        <SelectItem value="BOOLEAN">Yes/No</SelectItem>
                        <SelectItem value="BEHAVIOR">Behavioral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor={`unit-${index}`}>
                      Unit <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id={`unit-${index}`}
                      value={kpi.unit}
                      onChange={(e) => handleKpiChange(index, 'unit', e.target.value)}
                      placeholder="e.g., cases, %, score"
                      className={errors[`${index}-unit`] ? 'border-red-500' : ''}
                    />
                    {errors[`${index}-unit`] && (
                      <p className="text-xs text-red-500 mt-1">{errors[`${index}-unit`]}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`target-${index}`}>
                      Target <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id={`target-${index}`}
                      type="number"
                      value={kpi.target}
                      onChange={(e) => handleKpiChange(index, 'target', parseFloat(e.target.value))}
                      placeholder="0"
                      className={errors[`${index}-target`] ? 'border-red-500' : ''}
                    />
                    {errors[`${index}-target`] && (
                      <p className="text-xs text-red-500 mt-1">{errors[`${index}-target`]}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`weight-${index}`}>
                      Weight (%) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id={`weight-${index}`}
                      type="number"
                      value={kpi.weight}
                      onChange={(e) => handleKpiChange(index, 'weight', parseFloat(e.target.value))}
                      placeholder="0"
                      min="1"
                      max="100"
                      className={errors[`${index}-weight`] ? 'border-red-500' : ''}
                    />
                    {errors[`${index}-weight`] && (
                      <p className="text-xs text-red-500 mt-1">{errors[`${index}-weight`]}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`dataSource-${index}`}>Data Source</Label>
                    <Input
                      id={`dataSource-${index}`}
                      value={kpi.dataSource}
                      onChange={(e) => handleKpiChange(index, 'dataSource', e.target.value)}
                      placeholder="e.g., eQMS System"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`formula-${index}`}>Formula (Optional)</Label>
                    <Input
                      id={`formula-${index}`}
                      value={kpi.formula}
                      onChange={(e) => handleKpiChange(index, 'formula', e.target.value)}
                      placeholder="e.g., (Actual / Target) × 100"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor={`description-${index}`}>Description (Optional)</Label>
                    <Textarea
                      id={`description-${index}`}
                      value={kpi.description}
                      onChange={(e) => handleKpiChange(index, 'description', e.target.value)}
                      placeholder="Describe the KPI objective and measurement criteria..."
                      rows={3}
                    />
                  </div>
                </div>

                {/* SMART Indicators */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">SMART Criteria</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      {kpi.title ? <CheckCircle className="h-3 w-3 text-green-600" /> : <AlertCircle className="h-3 w-3 text-gray-400" />}
                      <span>Specific</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {kpi.unit && kpi.target > 0 ? <CheckCircle className="h-3 w-3 text-green-600" /> : <AlertCircle className="h-3 w-3 text-gray-400" />}
                      <span>Measurable</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {kpi.target > 0 ? <CheckCircle className="h-3 w-3 text-green-600" /> : <AlertCircle className="h-3 w-3 text-gray-400" />}
                      <span>Achievable</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {kpi.dataSource ? <CheckCircle className="h-3 w-3 text-green-600" /> : <AlertCircle className="h-3 w-3 text-gray-400" />}
                      <span>Relevant</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>Time-bound</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Add KPI Button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={addKpi}
          className="border-red-200 hover:bg-red-50"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Another KPI
        </Button>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={totalWeight !== 100}
          className="bg-red-600 hover:bg-red-700"
        >
          Create {kpis.length} KPI{kpis.length > 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  )
}