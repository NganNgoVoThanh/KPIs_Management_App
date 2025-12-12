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
  detectScaleDirection,
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
  const [scale, setScale] = useState<TypeIVScaleEntry[]>(
    value?.scale || [
      { targetLevel: 0, description: '', scoreLevel: 0 },
      { targetLevel: 0, description: '', scoreLevel: 0 }
    ]
  )
  const [validation, setValidation] = useState<{ valid: boolean; message: string }>({ 
    valid: false, 
    message: 'Please configure scale entries' 
  })

  const detectedDirection = scale.length >= 2 ? detectScaleDirection(scale) : 'ASCENDING'

  useEffect(() => {
    const result = validateTypeIVScale(scale)
    setValidation(result)
    
    if (result.valid) {
      onChange({ direction: detectedDirection, scale })
    }
  }, [scale])

  const addScaleEntry = () => {
    if (scale.length >= 10) {
      alert('Maximum 10 scale entries allowed')
      return
    }

    const newEntry: TypeIVScaleEntry = {
      targetLevel: 0,
      description: '',
      scoreLevel: 0
    }
    setScale([...scale, newEntry])
  }

  const removeScaleEntry = (index: number) => {
    if (scale.length <= 2) {
      alert('Minimum 2 scale entries required')
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
    ? calculateTypeIV(actualValue, { direction: detectedDirection, scale })
    : null

  return (
    <Card className={`border-2 border-red-200 ${className}`}>
      <CardHeader className="bg-red-50">
        <CardTitle className="flex items-center gap-2 text-red-700">
          <Wand2 className="h-5 w-5" />
          Type IV: Custom Scoring Scale (Milestone-based)
        </CardTitle>
        <CardDescription>
          Define target levels and corresponding scores. System auto-detects ascending/descending direction.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-6">
        {/* Auto-detected Direction Display */}
        {scale.length >= 2 && validation.valid && (
          <Alert className="bg-red-50 border-red-300">
            <Info className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-900">
              <strong>Auto-detected direction:</strong>{' '}
              <Badge variant="outline" className="ml-2">
                {detectedDirection === 'ASCENDING' ? 'Same Direction (Higher = Better)' : 'Opposite Direction (Lower = Better)'}
              </Badge>
              <div className="text-xs mt-1">
                {detectedDirection === 'ASCENDING' 
                  ? 'Higher result → Higher score (e.g., Revenue, Production)'
                  : 'Lower result → Higher score (e.g., Costs, Defects, Delays)'}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Scale Entries Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Scale Entries ({scale.length}/10)</Label>
            <Badge variant="outline" className="text-xs">
              {scale.length >= 2 && validation.valid
                ? detectedDirection === 'ASCENDING' 
                  ? 'Target ↑ → Score ↑' 
                  : 'Target ↓ → Score ↑'
                : 'Need min 2 entries'}
            </Badge>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-600 px-2">
            <div className="col-span-1">#</div>
            <div className="col-span-3">Target Level</div>
            <div className="col-span-5">Description</div>
            <div className="col-span-2">Score (0-100)</div>
            <div className="col-span-1"></div>
          </div>

          {/* Scale Entry Rows */}
          <div className="space-y-2">
            {scale.map((entry, index) => (
              <div 
                key={index} 
                className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 rounded-lg border"
              >
                <div className="col-span-1 text-sm font-medium text-gray-600">
                  {index + 1}
                </div>
                
                <div className="col-span-3">
                  <Input
                    type="number"
                    value={entry.targetLevel}
                    onChange={(e) => updateScaleEntry(index, 'targetLevel', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="h-9 text-sm"
                    step="any"
                  />
                </div>

                <div className="col-span-5">
                  <Input
                    type="text"
                    value={entry.description}
                    onChange={(e) => updateScaleEntry(index, 'description', e.target.value)}
                    placeholder="Description"
                    className="h-9 text-sm"
                  />
                </div>

                <div className="col-span-2">
                  <Input
                    type="number"
                    value={entry.scoreLevel}
                    onChange={(e) => updateScaleEntry(index, 'scoreLevel', parseFloat(e.target.value) || 0)}
                    placeholder="0-100"
                    className="h-9 text-sm"
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
                    disabled={scale.length <= 2}
                    className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
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
            disabled={scale.length >= 5}
            className="w-full border-dashed"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Scale Entry ({scale.length}/5)
          </Button>
        </div>

        {/* Validation Status */}
        {!validation.valid && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validation.message}</AlertDescription>
          </Alert>
        )}

        {validation.valid && (
          <Alert className="border-green-300 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Scale is valid • Direction: <strong>{detectedDirection === 'ASCENDING' ? 'Same Direction' : 'Opposite Direction'}</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Real-time Preview */}
        {previewResult && validation.valid && (
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-purple-900">
                Preview: Score Calculation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-600">Actual Value</div>
                  <div className="text-lg font-bold text-purple-900">{actualValue}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Score (1-5)</div>
                  <div className="text-lg font-bold text-purple-900">
                    {previewResult.score}/5
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Points</div>
                  <div className="text-lg font-bold text-purple-900">
                    {previewResult.percentage}
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-purple-200">
                <Badge variant="outline" className="bg-white">
                  {previewResult.band}
                </Badge>
                <p className="text-xs text-gray-700 mt-2">{previewResult.explanation}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Text */}
        <Alert className="bg-red-50 border-red-200">
        </Alert>
      </CardContent>
    </Card>
  )
}