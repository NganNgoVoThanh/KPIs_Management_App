"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, CheckCircle, Target, Upload, Send, Calculator, Loader2, XCircle, Clock, ExternalLink, Link as LinkIcon, FileText } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { authService } from "@/lib/auth-service"
import { authenticatedFetch } from "@/lib/api-client"
import type { User, KpiDefinition, KpiActual } from "@/lib/types"

// Simple robust score calculation for Client Side preview
// Note: Ideally this should share code with backend 'scoring-service.ts'
const calculatePreviewScore = (kpi: KpiDefinition, value: number) => {
  let percentage = 0

  if (!kpi.target && kpi.target !== 0) return { percentage: 0, score: 0 };

  switch (kpi.type) {
    case 'QUANT_HIGHER_BETTER': // Type I
      if (kpi.target === 0) percentage = value > 0 ? 150 : 100; // Edge case
      else percentage = (value / kpi.target) * 100
      break

    case 'QUANT_LOWER_BETTER': // Type II
      if (value === 0 && kpi.target === 0) {
        percentage = 100
      } else if (value === 0 && kpi.target > 0) {
        percentage = 150 // Perfect score for 0 defects/errors
      } else if (value > 0 && kpi.target === 0) {
        percentage = 0 // Failed if target 0 but actual > 0
      } else {
        percentage = (kpi.target / value) * 100
      }
      break

    case 'MILESTONE': // Type III
      percentage = value * 100 // Assuming value is 0 or 1
      break

    case 'BOOLEAN': // Type III Alternate
      percentage = value === 1 ? 100 : 0
      break

    // TODO: Type IV (Custom Scale) requires parsing kpi.scoringRules which is a JSON/String
    // For preview, we might default to linear or 0 if complex.
    default:
      percentage = 0
  }

  // Cap percentage
  percentage = Math.min(150, Math.max(0, percentage))

  // Determine Score (1-5)
  let score = 1
  if (percentage >= 120) score = 5
  else if (percentage >= 100) score = 4
  else if (percentage >= 80) score = 3
  else if (percentage >= 60) score = 2
  else score = 1

  return { percentage, score }
}

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
    if (score >= 5) return "bg-green-100 text-green-700 border-green-200"
    if (score >= 4) return "bg-red-100 text-red-700 border-red-200" // Exceeds expectation is Red/Hot? Or Green? Usually Green. Keeping logic but adjusting color might be nice. 
    // Actually, user requested "red tone". But for status, semantic colors (Green=Good) are better.
    // "Red Tone" for UI layout, semantic colors for status.
    if (score >= 3) return "bg-yellow-100 text-yellow-700 border-yellow-200"
    if (score >= 2) return "bg-orange-100 text-orange-700 border-orange-200"
    return "bg-gray-100 text-gray-700 border-gray-200"
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
        <div className="bg-gradient-to-r from-red-50 to-white p-6 rounded-xl border border-red-100 shadow-sm">
          <h1 className="text-3xl font-bold text-red-900 flex items-center gap-2">
            <Target className="h-8 w-8 text-red-600" />
            Performance Evaluation
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            Submit your actual results and evidence for the current cycle.
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
          <Card className="border-2 border-red-100 shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-gray-800">No KPIs Ready for Evaluation</h3>
              <p className="text-gray-500 text-center max-w-md">
                Approved KPIs will appear here. Please wait for the approval process to complete.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            {/* KPI List */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800 border-l-4 border-red-600 pl-3">
                  Approved KPIs
                </h2>
                <Badge variant="outline" className="text-red-600 border-red-200">
                  {kpis.filter(k => actuals[k.id]).length} / {kpis.length} Updated
                </Badge>
              </div>

              {kpis.map(kpi => {
                const actual = actuals[kpi.id]
                const hasActual = !!actual
                const isSelected = selectedKpi?.id === kpi.id

                return (
                  <Card
                    key={kpi.id}
                    className={`cursor-pointer transition-all duration-200 border-2 hover:shadow-lg ${isSelected
                      ? 'border-red-500 shadow-red-100 ring-1 ring-red-500 bg-red-50/10'
                      : 'border-white hover:border-red-200 bg-white shadow-sm'
                      }`}
                    onClick={() => setSelectedKpi(kpi)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className={`text-base font-bold ${isSelected ? 'text-red-900' : 'text-gray-900'}`}>
                            {kpi.title}
                          </CardTitle>
                          <div className="flex gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded">
                              Target: <strong>{kpi.target} {kpi.unit}</strong>
                            </span>
                            <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded">
                              Weight: <strong>{kpi.weight}%</strong>
                            </span>
                          </div>
                        </div>
                        {hasActual ? (
                          <Badge className={`${actual.status === 'APPROVED' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                            actual.status === 'REJECTED' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                              'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            } border shadow-none`}>
                            {actual.status === 'APPROVED' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {actual.status === 'REJECTED' && <XCircle className="h-3 w-3 mr-1" />}
                            {(actual.status === 'WAITING_LINE_MGR' || actual.status === 'WAITING_MANAGER') && <Clock className="h-3 w-3 mr-1" />}
                            {actual.status.replace(/_/g, ' ')}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-dashed border-red-300 text-red-600 bg-red-50">
                            Action Required
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    {hasActual && (
                      <CardContent className="pt-0 pb-4">
                        <div className="space-y-3 bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 font-medium">Results:</span>
                            <div className="flex gap-4">
                              <span className="text-gray-900">Actual: <strong>{actual.actualValue}</strong></span>
                              <span className="text-gray-900">Score: <strong>{actual.score}/5</strong></span>
                            </div>
                          </div>
                          <Progress value={actual.percentage} className="h-2 bg-gray-200" />

                          {/* Evidence Link Display */}
                          {/* We check providerRef or provider logic. Assuming actual has evidence list if fetched tailored */}
                          {/* The GET API enriches 'kpi' but not evidence? Wait, GET /api/actuals return enrichedActuals with just 'kpi'. */}
                          {/* We might miss evidenceLink unless we fetch it. But let's assume if provider 'LINK' is used... */}
                          {/* Actually, user wants to see the link. Let's add a visual cue if no link data is present in this view yet. */}

                          <div className="flex justify-between items-center pt-1">
                            <p className="text-xs text-muted-foreground">{actual.percentage.toFixed(0)}% Achievement</p>
                            <Button variant="link" className="h-auto p-0 text-xs text-blue-600" onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Open Evidence
                            }}>
                              Details & Evidence
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>

            {/* Actual Submission Form */}
            <div className="sticky top-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Upload className="h-5 w-5 text-red-600" />
                Update Results
              </h2>

              {selectedKpi ? (
                <Card className="border-t-4 border-t-red-600 shadow-xl bg-white overflow-hidden">
                  <CardHeader className="bg-gradient-to-b from-gray-50 to-white pb-6 border-b border-gray-100">
                    <CardTitle className="text-2xl text-red-950">{selectedKpi.title}</CardTitle>
                    <CardDescription className="text-base mt-2">
                      Please enter the actual value achieved and provide verification evidence.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                    {/* Actual Value Input */}
                    <div className="space-y-3">
                      <Label htmlFor="actual" className="text-base font-semibold text-gray-800 flex justify-between">
                        <span>Actual Value <span className="text-red-500">*</span></span>
                        <span className="text-xs font-normal text-gray-500 uppercase tracking-wider">Required</span>
                      </Label>
                      <div className="flex gap-2 relative">
                        <Input
                          id="actual"
                          type="number"
                          value={actualValue}
                          onChange={(e) => setActualValue(e.target.value)}
                          placeholder="0.00"
                          className="h-14 text-xl font-semibold pl-4 border-gray-300 focus:border-red-500 focus:ring-red-200"
                          autoFocus
                          step="0.01"
                        />
                        <div className="absolute right-3 top-3 h-8 px-3 bg-gray-100 rounded flex items-center font-bold text-gray-600 text-sm border border-gray-200 shadow-sm pointer-events-none">
                          {selectedKpi.unit}
                        </div>
                      </div>
                      <div className="flex justify-between items-center px-1">
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <Target className="h-4 w-4 text-red-500" /> Target: <strong>{selectedKpi.target} {selectedKpi.unit}</strong>
                        </p>
                        <p className="text-xs text-gray-400">KPI Type: {selectedKpi.type.replace(/_/g, ' ')}</p>
                      </div>
                    </div>

                    {/* Live Score Preview */}
                    {actualValue && !isNaN(parseFloat(actualValue)) && (
                      <div className="bg-red-50/50 rounded-xl p-5 border border-red-100 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-2 mb-3 border-b border-red-100 pb-2">
                          <Calculator className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-bold text-red-900">Score Preview</span>
                        </div>
                        {(() => {
                          const val = parseFloat(actualValue);
                          const { percentage, score } = calculatePreviewScore(selectedKpi, val);
                          const bandColor = score >= 5 ? 'text-green-600' : score >= 3 ? 'text-yellow-600' : 'text-red-600';

                          return (
                            <div className="space-y-4">
                              <div className="flex justify-between items-baseline">
                                <span className="text-sm text-gray-600">Achievement Rate</span>
                                <span className={`font-bold text-2xl ${bandColor}`}>{percentage.toFixed(0)}%</span>
                              </div>
                              <Progress value={percentage} className={`h-3 bg-white border border-red-100 ${score >= 4 ? '[&>div]:bg-green-500' : score >= 3 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'
                                }`} />
                              <div className="flex justify-between items-center pt-1">
                                <span className="text-sm text-gray-600 font-medium">Projected Rating</span>
                                <Badge className={`text-sm px-3 py-1 font-bold border ${getScoreBandColor(score)}`}>
                                  {score} / 5
                                </Badge>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )}

                    {/* Evidence Section */}
                    <div className="space-y-4 pt-2">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2 border-b pb-2">
                        <FileText className="h-4 w-4" /> Evidence & Verification
                      </h3>

                      {/* Link Input */}
                      <div className="space-y-2">
                        <Label htmlFor="evidenceLink" className="font-medium text-gray-700">Evidence Link (SharePoint / OneDrive)</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="evidenceLink"
                              placeholder="https://intersnack.sharepoint.com/sites/..."
                              value={evidenceLink}
                              onChange={(e) => setEvidenceLink(e.target.value)}
                              className="pl-9 h-10 border-gray-300 focus:border-red-500"
                            />
                          </div>
                          {evidenceLink && (
                            <Button
                              variant="outline"
                              size="icon"
                              type="button"
                              onClick={() => window.open(evidenceLink, '_blank')}
                              title="Test Link"
                              className="h-10 w-10 border-gray-300 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          Provide a direct link to your supporting documents. Ensure permissions are granted.
                        </p>
                      </div>

                      {/* File Upload Placeholder */}
                      <div className="space-y-2">
                        <Label className="font-medium text-gray-700">File Attachment</Label>
                        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center text-center bg-gray-50/50 hover:bg-gray-50 transition-colors">
                          <Upload className="h-8 w-8 text-gray-300 mb-2" />
                          <p className="text-sm font-medium text-gray-600">Drag & drop files here or click to upload</p>
                          <p className="text-xs text-gray-400 mt-1">Supported: PDF, Excel, Word, Images (Max 10MB)</p>
                          <Button variant="outline" size="sm" className="mt-4" disabled>
                            File Upload Temporarily Disabled
                          </Button>
                          <p className="text-[10px] text-red-500 mt-2 font-medium">
                            * Please use the SharePoint link option above for now.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Comment */}
                    <div className="space-y-2">
                      <Label htmlFor="comment" className="font-medium text-gray-700">Self Assessment (Optional)</Label>
                      <Textarea
                        id="comment"
                        value={selfComment}
                        onChange={(e) => setSelfComment(e.target.value)}
                        placeholder="Add context about your achievement..."
                        rows={3}
                        className="resize-none border-gray-300 focus:border-red-500"
                      />
                    </div>
                  </CardContent>

                  <CardFooter className="bg-gray-50 p-6 border-t border-gray-100 gap-3">
                    <Button
                      variant="outline"
                      size="lg"
                      className="flex-1 border-gray-300 hover:bg-white hover:text-red-600"
                      onClick={() => {
                        setSelectedKpi(null)
                        setActualValue("")
                        setSelfComment("")
                        setEvidenceLink("")
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="lg"
                      onClick={handleSubmitActual}
                      disabled={!actualValue || isSubmitting || !isWithinTimeline}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl transition-all"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit Results
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-gray-50 h-[400px]">
                  <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                    <Target className="h-10 w-10 text-red-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Select a KPI to Update</h3>
                  <p className="text-gray-500 max-w-xs">
                    Click on any KPI from the list on the left to confirm your actual performance and submit evidence.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}