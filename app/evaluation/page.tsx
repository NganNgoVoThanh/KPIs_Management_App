"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { authService } from "@/lib/auth-service"
import { storageService } from "@/lib/storage-service"
import { kpiService } from "@/lib/kpi-service"
import type { User, KpiDefinition, KpiActual } from "@/lib/types"
import { 
  TrendingUp, 
  Target, 
  Upload, 
  FileText, 
  CheckCircle,
  AlertCircle,
  Send,
  Calculator
} from "lucide-react"

export default function EvaluationPage() {
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [kpis, setKpis] = useState<KpiDefinition[]>([])
  const [actuals, setActuals] = useState<Record<string, KpiActual>>({})
  const [selectedKpi, setSelectedKpi] = useState<KpiDefinition | null>(null)
  const [actualValue, setActualValue] = useState("")
  const [selfComment, setSelfComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    if (currentUser) {
      setUser(currentUser)
      loadKpis(currentUser)
    }
  }, [])

  const loadKpis = (currentUser: User) => {
    const cycle = storageService.getCurrentCycle()
    if (!cycle) return

    // Get user's locked KPIs
    const userKpis = storageService.getKpiDefinitions({
      userId: currentUser.id,
      cycleId: cycle.id
    }).filter(k => k.status === 'LOCKED_GOALS')

    setKpis(userKpis)

    // Load existing actuals
    const existingActuals: Record<string, KpiActual> = {}
    userKpis.forEach(kpi => {
      const kpiActuals = storageService.getKpiActuals({
        kpiDefinitionId: kpi.id
      })
      if (kpiActuals.length > 0) {
        existingActuals[kpi.id] = kpiActuals[0]
      }
    })
    setActuals(existingActuals)
  }

  const calculateScore = (kpi: KpiDefinition, value: number) => {
    let percentage = 0
    
    switch (kpi.type) {
      case 'QUANT_HIGHER_BETTER':
        percentage = (value / kpi.target) * 100
        break
      case 'QUANT_LOWER_BETTER':
        if (value === 0 && kpi.target === 0) {
          percentage = 100
        } else if (value === 0 && kpi.target > 0) {
          percentage = 150
        } else {
          percentage = (kpi.target / value) * 100
        }
        break
      case 'MILESTONE':
        percentage = value * 100
        break
      case 'BOOLEAN':
        percentage = value === 1 ? 100 : 0
        break
      case 'BEHAVIOR':
        percentage = value * 20
        break
    }

    percentage = Math.min(150, percentage)

    let score = 1
    if (percentage >= 120) score = 5
    else if (percentage >= 100) score = 4
    else if (percentage >= 80) score = 3
    else if (percentage >= 60) score = 2

    return { percentage, score }
  }

  const handleSubmitActual = async () => {
    if (!selectedKpi || !actualValue) return

    setIsSubmitting(true)

    try {
      const result = await kpiService.submitActuals(
        selectedKpi.id,
        parseFloat(actualValue),
        selfComment
      )

      if (result.success) {
        toast({
          title: "Success",
          description: result.message
        })

        // Reload data
        if (user) loadKpis(user)
        
        // Reset form
        setSelectedKpi(null)
        setActualValue("")
        setSelfComment("")
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit actual results",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getScoreBandColor = (score: number) => {
    if (score >= 5) return "bg-green-100 text-green-700"
    if (score >= 4) return "bg-red-100 text-red-700"
    if (score >= 3) return "bg-yellow-100 text-yellow-700"
    if (score >= 2) return "bg-orange-100 text-orange-700"
    return "bg-red-100 text-red-700"
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Performance Evaluation</h1>
          <p className="text-muted-foreground mt-1">
            Submit your actual results for performance evaluation
          </p>
        </div>

        {kpis.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No KPIs Ready for Evaluation</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                You don't have any approved KPIs yet. Please wait for your KPIs to be approved before submitting actuals.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* KPI List */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Your KPIs</h2>
              {kpis.map(kpi => {
                const actual = actuals[kpi.id]
                const hasActual = !!actual
                
                return (
                  <Card 
                    key={kpi.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow ${
                      selectedKpi?.id === kpi.id ? 'border-red-500' : ''
                    }`}
                    onClick={() => !hasActual && setSelectedKpi(kpi)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{kpi.title}</CardTitle>
                          <CardDescription>
                            Target: {kpi.target} {kpi.unit} • Weight: {kpi.weight}%
                          </CardDescription>
                        </div>
                        {hasActual ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Submitted
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            Pending
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    {hasActual && (
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Actual: {actual.actualValue} {kpi.unit}</span>
                            <span>Score: {actual.score}/5</span>
                          </div>
                          <Progress value={actual.percentage} className="h-2" />
                          <p className="text-xs text-muted-foreground">
                            {actual.percentage.toFixed(0)}% Achievement
                          </p>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>

            {/* Actual Submission Form */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Submit Actual Results</h2>
              {selectedKpi ? (
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedKpi.title}</CardTitle>
                    <CardDescription>
                      Enter your actual achievement for this KPI
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="actual">
                        Actual Value <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="actual"
                          type="number"
                          value={actualValue}
                          onChange={(e) => setActualValue(e.target.value)}
                          placeholder="Enter actual value"
                        />
                        <div className="px-3 py-2 bg-gray-100 rounded-md">
                          {selectedKpi.unit}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Target: {selectedKpi.target} {selectedKpi.unit}
                      </p>
                    </div>

                    {/* Live Score Calculation */}
                    {actualValue && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Calculator className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium">Score Preview</span>
                        </div>
                        {(() => {
                          const { percentage, score } = calculateScore(selectedKpi, parseFloat(actualValue))
                          return (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Achievement</span>
                                <span className="font-medium">{percentage.toFixed(0)}%</span>
                              </div>
                              <Progress value={percentage} className="h-2" />
                              <div className="flex justify-between">
                                <span className="text-sm">Score</span>
                                <Badge className={getScoreBandColor(score)}>
                                  {score}/5
                                </Badge>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )}

                    <div>
                      <Label htmlFor="comment">Self Assessment Comment</Label>
                      <Textarea
                        id="comment"
                        value={selfComment}
                        onChange={(e) => setSelfComment(e.target.value)}
                        placeholder="Describe your achievements, challenges faced, and key learnings..."
                        rows={4}
                      />
                    </div>

                    <div>
                      <Label>Evidence (Optional)</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Drag and drop files here, or click to browse
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PDF, DOC, XLS, JPG, PNG (Max 10MB)
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedKpi(null)
                          setActualValue("")
                          setSelfComment("")
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmitActual}
                        disabled={!actualValue || isSubmitting}
                        className="flex-1 bg-red-600 hover:bg-red-700"
                      >
                        {isSubmitting ? (
                          <>Processing...</>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Submit for Approval
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Target className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Select a KPI</h3>
                    <p className="text-sm text-muted-foreground text-center">
                      Click on a pending KPI from the list to submit actual results
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}