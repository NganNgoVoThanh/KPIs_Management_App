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
import { AlertCircle, CheckCircle, Target, Upload, Send, Calculator, Loader2, XCircle, Clock } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { authService } from "@/lib/auth-service"
import { authenticatedFetch } from "@/lib/api-client"
import type { User, KpiDefinition, KpiActual } from "@/lib/types"

export default function EvaluationPage() {
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [kpis, setKpis] = useState<KpiDefinition[]>([])
  const [actuals, setActuals] = useState<Record<string, KpiActual>>({})
  const [selectedKpi, setSelectedKpi] = useState<KpiDefinition | null>(null)
  const [actualValue, setActualValue] = useState("")
  const [selfComment, setSelfComment] = useState("")
  const [evidenceLink, setEvidenceLink] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  const [cycle, setCycle] = useState<any>(null)
  const [isWithinTimeline, setIsWithinTimeline] = useState(true)

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    if (currentUser) {
      setUser(currentUser)
      loadData(currentUser.id)
    }
  }, [])

  const loadData = async (userId: string) => {
    setLoading(true)
    try {
      // 0. Fetch Active Cycle FIRST to optimize subsequent queries
      const cycleResponse = await authenticatedFetch('/api/cycles/active')
      const cycleData = await cycleResponse.json()

      let currentCycle = null;
      let cycleId = '';

      if (cycleData.success && cycleData.data) {
        setCycle(cycleData.data)
        currentCycle = cycleData.data;
        cycleId = currentCycle.id;

        // Check timeline
        const now = new Date();
        const start = new Date(currentCycle.trackingStart);
        const end = new Date(currentCycle.trackingEnd);
        end.setHours(23, 59, 59, 999);
        const isTime = now >= start && now <= end;
        setIsWithinTimeline(isTime);
      }

      // 1. Fetch KPIs and Actuals in parallel, BUT filtered by Cycle ID (Performance Critical)
      const [kpiResponse, actualsResponse] = await Promise.all([
        authenticatedFetch(`/api/kpi?userId=${userId}${cycleId ? `&cycleId=${cycleId}` : ''}`),
        authenticatedFetch(`/api/actuals?userId=${userId}${cycleId ? `&cycleId=${cycleId}` : ''}`)
      ])

      const [kpiData, actualsData] = await Promise.all([
        kpiResponse.json(),
        actualsResponse.json()
      ])

      // 2. Process KPIs
      const approvedKpis = (kpiData.data || []).filter((k: KpiDefinition) =>
        k.status === 'APPROVED' || k.status === 'LOCKED_GOALS'
      )
      setKpis(approvedKpis)

      // 3. Process Actuals
      const actualsMap: Record<string, KpiActual> = {}
      if (actualsData.success && Array.isArray(actualsData.data)) {
        actualsData.data.forEach((actual: KpiActual) => {
          actualsMap[actual.kpiDefinitionId] = actual
        })
      }
      setActuals(actualsMap)

    } catch (error) {
      console.error("Failed to load evaluation data", error)
      toast({
        title: "Error",
        description: "Failed to load evaluation data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
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

    if (!isWithinTimeline) {
      toast({
        title: "Submission Closed",
        description: "You cannot submit evidence outside the tracking period.",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await authenticatedFetch('/api/actuals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kpiDefinitionId: selectedKpi.id,
          actualValue: parseFloat(actualValue),
          selfComment,
          evidenceLink, // Send the link
          evidenceFiles: [] // TODO: Add file upload support
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: "Success",
          description: "Actual results submitted successfully"
        })

        // Reload data
        if (user) loadData(user.id)

        // Reset form
        setSelectedKpi(null)
        setActualValue("")
        setSelfComment("")
        setEvidenceLink("")
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to submit actuals",
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

  if (loading) {
    return (
      <AppLayout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-red-900">Performance Evaluation</h1>
          <p className="text-muted-foreground mt-1">
            Submit your actual results for performance evaluation
          </p>
        </div>

        {!isWithinTimeline && cycle && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md shadow-sm">
            <div className="flex items-center">
              <Clock className="h-6 w-6 text-yellow-600 mr-3" />
              <div>
                <h3 className="text-sm font-bold text-yellow-800 uppercase tracking-wide">
                  Tracking Period Closed
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  The evidence submission window is currently closed.
                  Allowed period: <strong>{new Date(cycle.trackingStart).toLocaleDateString()}</strong> to <strong>{new Date(cycle.trackingEnd).toLocaleDateString()}</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

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
              <h2 className="text-xl font-semibold">Your Approved KPIs</h2>
              {kpis.map(kpi => {
                const actual = actuals[kpi.id]
                const hasActual = !!actual

                return (
                  <Card
                    key={kpi.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow ${selectedKpi?.id === kpi.id ? 'border-red-500 ring-1 ring-red-500' : ''
                      }`}
                    onClick={() => setSelectedKpi(kpi)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base font-bold text-gray-900">{kpi.title}</CardTitle>
                          <CardDescription className="mt-1">
                            Target: <span className="font-semibold text-gray-900">{kpi.target} {kpi.unit}</span> • Weight: <span className="font-semibold text-gray-900">{kpi.weight}%</span>
                          </CardDescription>
                        </div>
                        {hasActual ? (
                          <Badge className={`${actual.status === 'APPROVED'
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : actual.status === 'REJECTED'
                              ? 'bg-red-100 text-red-700 border-red-200'
                              : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>
                            {actual.status === 'APPROVED' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {actual.status === 'REJECTED' && <XCircle className="h-3 w-3 mr-1" />}
                            {actual.status === 'WAITING_LINE_MGR' && <Clock className="h-3 w-3 mr-1" />}
                            {actual.status === 'WAITING_MANAGER' && <Clock className="h-3 w-3 mr-1" />}

                            {actual.status === 'APPROVED' ? 'Approved' :
                              actual.status === 'REJECTED' ? 'Rejected' :
                                actual.status === 'WAITING_LINE_MGR' ? 'Waiting Line Mgr' :
                                  actual.status === 'WAITING_MANAGER' ? 'Waiting HOD' :
                                    'Submitted'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">
                            Action Required
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    {hasActual && (
                      <CardContent className="pt-0">
                        <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Actual: <strong>{actual.actualValue} {kpi.unit}</strong></span>
                            <span className="text-gray-600">Score: <strong>{actual.score}/5</strong></span>
                          </div>
                          <Progress value={actual.percentage} className="h-2" />
                          <p className="text-xs text-muted-foreground text-right">
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
              <h2 className="text-xl font-semibold mb-4">Submit / Update Actuals</h2>
              {selectedKpi ? (
                <Card className="border-t-4 border-t-red-600 shadow-lg">
                  <CardHeader>
                    <CardTitle>{selectedKpi.title}</CardTitle>
                    <CardDescription>
                      Enter your actual achievement for this KPI
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div>
                      <Label htmlFor="actual" className="text-base font-semibold">
                        Actual Value <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          id="actual"
                          type="number"
                          value={actualValue}
                          onChange={(e) => setActualValue(e.target.value)}
                          placeholder="Enter actual value"
                          className="h-12 text-lg font-medium"
                          autoFocus
                        />
                        <div className="px-4 py-2 bg-gray-100 rounded-md flex items-center font-bold text-gray-600 border border-gray-200">
                          {selectedKpi.unit}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                        <Target className="h-4 w-4" /> Target: <strong>{selectedKpi.target} {selectedKpi.unit}</strong>
                      </p>
                    </div>

                    {/* Live Score Calculation */}
                    {actualValue && (
                      <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
                          <Calculator className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-bold text-gray-700">Preview Score</span>
                        </div>
                        {(() => {
                          const { percentage, score } = calculateScore(selectedKpi, parseFloat(actualValue))
                          return (
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Achievement Rate</span>
                                <span className="font-bold text-lg text-gray-900">{percentage.toFixed(0)}%</span>
                              </div>
                              <Progress value={percentage} className="h-3 bg-gray-200" />
                              <div className="flex justify-between items-center pt-2">
                                <span className="text-sm text-gray-600">Projected Score</span>
                                <Badge className={`text-sm px-3 py-1 ${getScoreBandColor(score)}`}>
                                  {score}/5
                                </Badge>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )}

                    <div>
                      <Label htmlFor="comment" className="font-semibold">Self Assessment Comment</Label>
                      <Textarea
                        id="comment"
                        value={selfComment}
                        onChange={(e) => setSelfComment(e.target.value)}
                        placeholder="Describe your achievements, challenges faced, and key learnings..."
                        rows={4}
                        className="mt-2 text-base"
                      />
                    </div>

                    <div>
                      <Label className="font-semibold" htmlFor="evidenceLink">Evidence Link (SharePoint / OneDrive)</Label>
                      <div className="mt-2">
                        <Input
                          id="evidenceLink"
                          placeholder="https://intersnack.sharepoint.com/..."
                          value={evidenceLink}
                          onChange={(e) => setEvidenceLink(e.target.value)}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Paste a link to your evidence folder or file (e.g., SharePoint, OneDrive).
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        variant="outline"
                        size="lg"
                        className="flex-1"
                        onClick={() => {
                          setSelectedKpi(null)
                          setActualValue("")
                          setSelfComment("")
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="lg"
                        onClick={handleSubmitActual}
                        disabled={!actualValue || isSubmitting || !isWithinTimeline}
                        className="flex-1 bg-red-600 hover:bg-red-700 shadow-md font-bold"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Submit Results
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed border-2 bg-gray-50/50">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                      <Target className="h-8 w-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Select a KPI to Update</h3>
                    <p className="text-muted-foreground max-w-xs mx-auto">
                      Click on any approved KPI from the list to enter your latest results and evidence.
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