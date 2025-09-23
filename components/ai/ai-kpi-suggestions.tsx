"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, CheckCircle, AlertCircle, Plus } from "lucide-react"
import { AIService, type AIKPISuggestion } from "@/lib/ai-services"

interface AIKPISuggestionsProps {
  department: string
  role: string
  onSelectSuggestion: (suggestion: AIKPISuggestion) => void
}

export function AIKPISuggestions({ department, role, onSelectSuggestion }: AIKPISuggestionsProps) {
  const [suggestions, setSuggestions] = useState<AIKPISuggestion[]>([])
  const [loading, setLoading] = useState(false)

  const generateSuggestions = async () => {
    setLoading(true)
    try {
      const aiSuggestions = await AIService.generateKPISuggestions(department, role)
      setSuggestions(aiSuggestions)
    } catch (error) {
      console.error("Failed to generate AI suggestions:", error)
    } finally {
      setLoading(false)
    }
  }

  const getSMARTScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-600"
    if (score >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">AI KPI Suggestions</h3>
          <p className="text-sm text-muted-foreground">Get AI-powered KPI recommendations for {department}</p>
        </div>
        <Button onClick={generateSuggestions} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Generate Suggestions
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="grid gap-4">
          {suggestions.map((suggestion, index) => (
            <Card key={index} className="border-l-4 border-l-emerald-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{suggestion.name}</CardTitle>
                    <CardDescription className="mt-1">{suggestion.description}</CardDescription>
                  </div>
                  <Badge variant="outline" className={getSMARTScoreColor(suggestion.smartAnalysis.score)}>
                    SMART: {suggestion.smartAnalysis.score}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Target:</span> {suggestion.target} {suggestion.unit}
                  </div>
                  <div>
                    <span className="font-medium">Weight:</span> {suggestion.weight}%
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Formula:</span> {suggestion.formula}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">SMART Analysis:</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(suggestion.smartAnalysis).map(([key, value]) => {
                      if (key === "score" || key === "suggestions") return null
                      return (
                        <Badge key={key} variant={value ? "default" : "secondary"} className="text-xs">
                          {value ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </Badge>
                      )
                    })}
                  </div>
                </div>

                {suggestion.smartAnalysis.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">AI Suggestions:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {suggestion.smartAnalysis.suggestions.map((tip, tipIndex) => (
                        <li key={tipIndex} className="flex items-start gap-2">
                          <span className="text-emerald-500 mt-1">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground mb-3">
                    <span className="font-medium">Rationale:</span> {suggestion.rationale}
                  </p>
                  <Button size="sm" onClick={() => onSelectSuggestion(suggestion)} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Use This KPI
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
