
// components/kpi/type-iv-scale-editor.tsx - FIXED: Removed Auto Populate
"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Trash2, Wand2, AlertCircle, CheckCircle, Info } from 'lucide-react'
import {
  validateTypeIVScale,
  calculateTypeIV,
  type TypeIVScaleEntry,
  type TypeIVScoringRules
} from '@/lib/scoring-service'

interface TypeIVScaleEditorProps {
  value?: TypeIVScoringRules
  onChange: (rules: TypeIVScoringRules) => void
  actualValue?: number
  className?: string
}

export function TypeIVScaleEditor({
  value,
  onChange,
  actualValue,
  className = ''
}: TypeIVScaleEditorProps) {
  // Initialize with new structure
  const initialScale = value?.scale?.length ? value.scale : [
    { from: 0, to: 0, scoreLevel: 0 }
  ];

  // Map to internal state to handle potentially missing fields if migrating from old version
  const [scale, setScale] = useState<TypeIVScaleEntry[]>(
    initialScale.map(s => ({
      from: (s as any).targetLevel ?? s.from ?? 0, // Fallback for migration
      to: s.to ?? 0,
      scoreLevel: s.scoreLevel ?? 0
    }))
  )

  const [validation, setValidation] = useState<{ valid: boolean; message: string }>({
    valid: false,
    message: 'Please configure scale entries'
  })

  useEffect(() => {
    const result = validateTypeIVScale(scale)
    setValidation(result)

    if (result.valid) {
      onChange({ scale })
    }
  }, [scale])

  const addScaleEntry = () => {
    if (scale.length >= 10) {
      alert('Maximum 10 scale entries allowed')
      return
    }

    const newEntry: TypeIVScaleEntry = {
      from: 0,
      to: 0,
      scoreLevel: 0
    }
    setScale([...scale, newEntry])
  }

  const removeScaleEntry = (index: number) => {
    if (scale.length <= 1) {
      alert('Minimum 1 scale entry required')
      return
    }
    setScale(scale.filter((_, i) => i !== index))
  }

  const updateScaleEntry = (index: number, field: keyof TypeIVScaleEntry, value: any) => {
    const newScale = [...scale]
    newScale[index] = {
      ...newScale[index],
      [field]: value
    }
    setScale(newScale)
  }

  const previewResult = actualValue !== undefined && validation.valid
    ? calculateTypeIV(actualValue, { scale })
    : null

  return (
    <Card className={`border-2 border-red-200 ${className}`}>
      <CardHeader className="bg-red-50">
        <CardTitle className="flex items-center gap-2 text-red-700">
          <Wand2 className="h-5 w-5" />
          Type IV: Custom Range Scale
        </CardTitle>
        <CardDescription>
          Define score ranges (From - To). If the actual value falls within a range, that score is applied.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-6">
        {/* Help Text */}
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-xs">
            <strong>Tip:</strong> Enter ranges like "From 23 To 22" for descending logic, or "From 10 To 20" for ascending. Logic checks if actual value is included in the range.
            High scores overlap low scores? The system picks the HIGHEST valid score.
          </AlertDescription>
        </Alert>

        {/* Scale Entries Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">defined Ranges ({scale.length}/10)</Label>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 text-xs font-bold text-gray-700 px-2 uppercase tracking-wide">
            <div className="col-span-1 min-w-[30px]">#</div>
            <div className="col-span-4 text-center">From (Start)</div>
            <div className="col-span-4 text-center">To (End)</div>
            <div className="col-span-2 text-center">Score</div>
            <div className="col-span-1"></div>
          </div>

          {/* Scale Entry Rows */}
          <div className="space-y-2">
            {scale.map((entry, index) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 rounded-lg border hover:border-red-200 transition-colors"
              >
                <div className="col-span-1 text-sm font-bold text-gray-500 pl-2">
                  {index + 1}
                </div>

                <div className="col-span-4">
                  <Input
                    type="number"
                    value={isNaN(entry.from) ? '' : entry.from}
                    onChange={(e) => updateScaleEntry(index, 'from', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    placeholder="From"
                    step="any"
                    className="h-10 text-center font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                <div className="col-span-4">
                  <Input
                    type="number"
                    value={isNaN(entry.to) ? '' : entry.to}
                    onChange={(e) => updateScaleEntry(index, 'to', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    placeholder="To"
                    step="any"
                    className="h-10 text-center font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                <div className="col-span-2">
                  <Input
                    type="number"
                    value={isNaN(entry.scoreLevel) ? '' : entry.scoreLevel}
                    onChange={(e) => updateScaleEntry(index, 'scoreLevel', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    placeholder="100"
                    className="h-10 text-center font-bold text-red-700 bg-red-50 border-red-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min="0"
                    max="100"
                  />
                </div>

                <div className="col-span-1 flex justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeScaleEntry(index)}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Entry Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addScaleEntry}
            disabled={scale.length >= 10}
            className="w-full border-dashed border-2 py-4 text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Range
          </Button>
        </div>

        {/* Validation Status */}
        {!validation.valid && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{validation.message}</AlertDescription>
          </Alert>
        )}

        {/* Real-time Preview */}
        {previewResult && validation.valid && (
          <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase">Actual Value</div>
                <div className="text-2xl font-bold text-gray-900">{actualValue}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-gray-500 uppercase">Calculated Score</div>
                <div className="text-2xl font-bold text-red-600">{previewResult.score}/5</div>
                <div className="text-xs text-red-600 font-medium">({previewResult.percentage} points)</div>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-600 bg-white p-2 rounded border">
              {previewResult.explanation}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
