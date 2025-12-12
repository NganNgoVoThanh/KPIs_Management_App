"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  Edit,
  Trash2,
  History,
  TrendingUp,
  Target,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  MessageSquare,
  Loader2,
  Send,
  Award,
  BarChart3
} from "lucide-react"
import type { KpiDefinition, Approval } from "@/lib/types"
import { authService } from "@/lib/auth-service"
import { authenticatedFetch } from "@/lib/api-client"

export default function KpiDetailPage() {
  const params = useParams()
  const kpiId = params?.id as string
  const router = useRouter()
  const [kpi, setKpi] = useState<KpiDefinition | null>(null)
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("details")

  const currentUser = authService.getCurrentUser()

  useEffect(() => {
    if (!currentUser) {
      router.push("/login")
      return
    }
    loadKpiData()
  }, [kpiId])

  const loadKpiData = async () => {
    setLoading(true)
    try {
      // Load KPI from API
      const response = await authenticatedFetch(`/api/kpi/${kpiId}`)
      const data = await response.json()

      if (!response.ok || !data.success) {
        alert("KPI not found")
        router.push("/kpis")
        return
      }

      setKpi(data.data)

      // Load approvals
      try {
        const approvalsResponse = await authenticatedFetch(`/api/approvals?kpiDefinitionId=${kpiId}`)
        const approvalsData = await approvalsResponse.json()
        if (approvalsData.success) {
          setApprovals(approvalsData.data || [])
        }
      } catch (err) {
        console.error("Error loading approvals:", err)
      }
    } catch (error) {
      console.error("Error loading KPI:", error)
      alert("Failed to load KPI data")
      router.push("/kpis")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    router.push(`/kpis/${kpiId}/edit`)
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this KPI? This action cannot be undone.")) {
      return
    }

    try {
      const response = await authenticatedFetch(`/api/kpi/${kpiId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert("KPI deleted successfully")
        router.push("/kpis")
      } else {
        const data = await response.json()
        alert(`Failed to delete: ${data.error}`)
      }
    } catch (error) {
      console.error("Error deleting KPI:", error)
      alert("Failed to delete KPI")
    }
  }

  const handleSubmit = async () => {
    if (!confirm("Submit this KPI for approval?")) return

    try {
      const response = await authenticatedFetch(`/api/kpi/${kpiId}/submit`, {
        method: 'POST'
      })
      const data = await response.json()

      if (response.ok && data.success) {
        alert(`Success! ${data.message}`)
        loadKpiData()
      } else {
        alert(`Failed: ${data.error}`)
      }
    } catch (error) {
      console.error("Error submitting KPI:", error)
      alert("Failed to submit KPI")
    }
  }

  const handleRequestChange = () => {
    router.push(`/change-requests/create?kpiId=${kpiId}`)
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: "bg-gray-100 text-gray-800",
      SUBMITTED: "bg-blue-100 text-blue-800",
      PENDING_LM: "bg-yellow-100 text-yellow-800",
      PENDING_HOD: "bg-yellow-100 text-yellow-800",
      PENDING_BOD: "bg-yellow-100 text-yellow-800",
      APPROVED: "bg-green-100 text-green-800",
      REJECTED: "bg-red-100 text-red-800",
      LOCKED_GOALS: "bg-purple-100 text-purple-800",
      CHANGE_REQUESTED: "bg-orange-100 text-orange-800"
    }
    return colors[status] || "bg-gray-100 text-gray-800"
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      QUANT_HIGHER_BETTER: "Higher is Better",
      QUANT_LOWER_BETTER: "Lower is Better",
      MILESTONE: "Milestone",
      BOOLEAN: "Yes/No",
      BEHAVIOR: "Behavioral"
    }
    return labels[type] || type
  }

  const canEdit = () => {
    if (!kpi || !currentUser) return false
    return (
      kpi.userId === currentUser.id &&
      ["DRAFT", "REJECTED", "CHANGE_REQUESTED"].includes(kpi.status)
    )
  }

  const canDelete = () => {
    if (!kpi || !currentUser) return false
    return (
      kpi.userId === currentUser.id &&
      ["DRAFT"].includes(kpi.status)
    )
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-red-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading KPI...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!kpi) {
    return (
      <AppLayout>
        <div className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              KPI not found. It may have been deleted.
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{kpi.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              KPI ID: {kpi.id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge className={getStatusColor(kpi.status)}>
            {kpi.status.replace(/_/g, " ")}
          </Badge>

          {(kpi.status === 'DRAFT' || kpi.status === 'REJECTED') && kpi.userId === currentUser?.id && (
            <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
              <Send className="h-4 w-4 mr-2" />
              Submit for Approval
            </Button>
          )}

          {canEdit() && (
            <Button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}

          {canDelete() && (
            <Button
              variant="outline"
              onClick={handleDelete}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}

          {kpi.status === "APPROVED" && (
            <Button
              variant="outline"
              onClick={handleRequestChange}
              className="border-orange-300 text-orange-600 hover:bg-orange-50"
            >
              <FileText className="h-4 w-4 mr-2" />
              Request Change
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="approvals">
            Approvals
            {approvals.filter(a => a.status === "PENDING").length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {approvals.filter(a => a.status === "PENDING").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="actual">Actual Results</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Title</label>
                  <p className="mt-1 text-gray-900">{kpi.title}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="mt-1 text-gray-700">{kpi.description || "No description provided"}</p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Type</label>
                    <p className="mt-1 text-gray-900">{getTypeLabel(kpi.type)}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Unit</label>
                    <p className="mt-1 text-gray-900">{kpi.unit}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Target</label>
                    <p className="mt-1 text-2xl font-bold text-red-600">
                      {kpi.target} <span className="text-sm font-normal text-gray-500">{kpi.unit}</span>
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Weight</label>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      {kpi.weight}<span className="text-sm font-normal text-gray-500">%</span>
                    </p>
                  </div>
                </div>

                {kpi.formula && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Formula</label>
                    <p className="mt-1 text-gray-900 font-mono text-sm bg-gray-50 p-2 rounded">
                      {kpi.formula}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Data Source</label>
                  <p className="mt-1 text-gray-900">{kpi.dataSource || "Not specified"}</p>
                </div>

                {kpi.category && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Category</label>
                    <Badge variant="outline" className="mt-1">{kpi.category}</Badge>
                  </div>
                )}

                {kpi.frequency && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Frequency</label>
                    <p className="mt-1 text-gray-900">{kpi.frequency}</p>
                  </div>
                )}

                {kpi.priority && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Priority</label>
                    <Badge 
                      variant={kpi.priority === "HIGH" ? "destructive" : "outline"}
                      className="mt-1"
                    >
                      {kpi.priority}
                    </Badge>
                  </div>
                )}

                <Separator />

                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="mt-1 text-gray-700 text-sm">
                    {new Date(kpi.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {kpi.submittedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Submitted</label>
                    <p className="mt-1 text-gray-700 text-sm">
                      {new Date(kpi.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {kpi.approvedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Approved</label>
                    <p className="mt-1 text-gray-700 text-sm">
                      {new Date(kpi.approvedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* SMART Score */}
          {kpi.smartScore !== undefined && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">SMART Assessment</CardTitle>
                <CardDescription>
                  AI-powered quality check of this KPI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">SMART Score</span>
                      <span className="text-2xl font-bold text-red-600">{kpi.smartScore}/100</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-600 h-2 rounded-full transition-all"
                        style={{ width: `${kpi.smartScore}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-center">
                    {kpi.smartScore >= 80 ? (
                      <CheckCircle className="h-12 w-12 text-green-500" />
                    ) : kpi.smartScore >= 60 ? (
                      <AlertCircle className="h-12 w-12 text-yellow-500" />
                    ) : (
                      <AlertCircle className="h-12 w-12 text-red-500" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* OGSM Alignment */}
          {kpi.ogsmAlignment && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">OGSM Alignment</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{kpi.ogsmAlignment}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals" className="space-y-4">
          {approvals.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No approvals yet</p>
              </CardContent>
            </Card>
          ) : (
            approvals.map((approval) => (
              <Card key={approval.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={getStatusColor(approval.status)}>
                          Level {approval.level}
                        </Badge>
                        <Badge variant="outline">
                          {approval.status}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-500 mb-2">
                        Approver ID: {approval.approverId}
                      </p>

                      {approval.comment && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="h-4 w-4 text-gray-400 mt-1" />
                            <p className="text-sm text-gray-700">{approval.comment}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-right text-sm text-gray-500">
                      {approval.decidedAt ? (
                        <p>Decided: {new Date(approval.decidedAt).toLocaleDateString()}</p>
                      ) : (
                        <p>Created: {new Date(approval.createdAt).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Actual Results Tab */}
        <TabsContent value="actual" className="space-y-4">
          {actual ? (
            <Card>
              <CardHeader>
                <CardTitle>Actual Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Target</label>
                    <p className="mt-1 text-2xl font-bold text-gray-600">
                      {kpi.target} <span className="text-sm font-normal">{kpi.unit}</span>
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Actual</label>
                    <p className="mt-1 text-2xl font-bold text-red-600">
                      {actual.actualValue} <span className="text-sm font-normal">{kpi.unit}</span>
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Achievement</label>
                    <p className="mt-1 text-2xl font-bold text-green-600">
                      {actual.percentage}%
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <label className="text-sm font-medium text-gray-500">Score</label>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-green-600 h-3 rounded-full transition-all"
                          style={{ width: `${(actual.score / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-gray-900">
                      {actual.score}/5
                    </span>
                  </div>
                </div>

                {actual.selfComment && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-gray-500">Self Assessment</label>
                      <p className="mt-2 text-gray-700">{actual.selfComment}</p>
                    </div>
                  </>
                )}

                {actual.evidenceFiles && actual.evidenceFiles.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-3">
                        Evidence Files ({actual.evidenceFiles.length})
                      </label>
                      <div className="space-y-2">
                        {actual.evidenceFiles.map((file) => (
                          <div 
                            key={file.id}
                            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                          >
                            <FileText className="h-5 w-5 text-gray-400" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{file.fileName}</p>
                              <p className="text-xs text-gray-500">
                                {(file.fileSize / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between pt-4 text-sm text-gray-500">
                  <span>Status: <Badge className={getStatusColor(actual.status)}>{actual.status}</Badge></span>
                  {actual.submittedAt && (
                    <span>Submitted: {new Date(actual.submittedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No actual results submitted yet</p>
                {kpi.status === "APPROVED" && currentUser?.id === kpi.userId && (
                  <Button 
                    onClick={() => router.push(`/evaluation?kpiId=${kpi.id}`)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Submit Actual Results
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Change History</CardTitle>
              <CardDescription>
                Track all changes and requests for this KPI
              </CardDescription>
            </CardHeader>
            <CardContent>
              {changeRequests.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No change history available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {changeRequests.map((cr) => (
                    <div key={cr.id} className="border-l-4 border-orange-500 pl-4 py-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge className="mb-2">{cr.changeType}</Badge>
                          <p className="text-sm text-gray-700 mb-2">{cr.reason}</p>
                          <p className="text-xs text-gray-500">
                            Requested: {new Date(cr.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={cr.status === "APPROVED" ? "default" : "outline"}>
                          {cr.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </AppLayout>
  )
}