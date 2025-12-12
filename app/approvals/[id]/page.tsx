"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  User,
  Calendar,
  Target,
  TrendingUp
} from "lucide-react"
import type { KpiDefinition, Approval } from "@/lib/types"
import { storageService } from "@/lib/storage-service"
import { authService } from "@/lib/auth-service"

export default function ApprovalDetailPage() {
  const params = useParams()
  const approvalId = params?.id as string
  const router = useRouter()
  const [kpi, setKpi] = useState<KpiDefinition | null>(null)
  const [approval, setApproval] = useState<Approval | null>(null)
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const currentUser = authService.getCurrentUser()

  useEffect(() => {
    loadApprovalData()
  }, [approvalId])

  const loadApprovalData = () => {
    setLoading(true)
    try {
      // Load KPI
      const kpiData = storageService.getKpiDefinitionById(approvalId)
      if (!kpiData) {
        alert("KPI not found")
        router.push("/approvals")
        return
      }
      setKpi(kpiData)

      // Find pending approval for current user
      const approvals = storageService.getApprovals(approvalId, "KPI")
      const userApproval = approvals.find(
        a => a.approverId === currentUser?.id && a.status === 'PENDING'
      )
      
      if (!userApproval) {
        alert("No pending approval found for you")
        router.push("/approvals")
        return
      }
      
      setApproval(userApproval)
    } catch (error) {
      console.error("Error loading approval:", error)
      alert("Failed to load approval data")
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!kpi || !approval) return

    if (!confirm(`Are you sure you want to approve this KPI at Level ${approval.level}?`)) {
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/kpis/${kpi.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: comment.trim() || null })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve')
      }

      alert(data.message || 'KPI approved successfully')
      router.push('/approvals')
    } catch (error: any) {
      console.error("Error approving KPI:", error)
      alert(error.message || 'Failed to approve KPI')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!kpi || !approval) return

    if (!comment || comment.trim().length === 0) {
      alert("Please provide a reason for rejection")
      return
    }

    if (!confirm(`Are you sure you want to reject this KPI? The owner will need to revise and resubmit.`)) {
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/kpis/${kpi.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: comment.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject')
      }

      alert(data.message || 'KPI rejected successfully')
      router.push('/approvals')
    } catch (error: any) {
      console.error("Error rejecting KPI:", error)
      alert(error.message || 'Failed to reject KPI')
    } finally {
      setSubmitting(false)
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading approval...</p>
        </div>
      </div>
    )
  }

  if (!kpi || !approval) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Approval not found or not accessible.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const kpiOwner = storageService.getUsers().find(u => u.id === kpi.userId)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
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
            <h1 className="text-3xl font-bold text-gray-900">KPI Approval</h1>
            <p className="text-sm text-gray-500 mt-1">
              Level {approval.level} Approval Required
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-lg px-4 py-2">
          Level {approval.level} of 3
        </Badge>
      </div>

      {/* Alert */}
      <Alert className="border-yellow-300 bg-yellow-50">
        <Clock className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          This KPI requires your approval. Please review carefully before making a decision.
        </AlertDescription>
      </Alert>

      {/* KPI Owner Info */}
      <Card className="border-2 border-red-100">
        <CardHeader className="bg-red-50">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-red-600" />
            KPI Owner Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <p className="mt-1 text-gray-900 font-medium">{kpiOwner?.name || 'Unknown'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="mt-1 text-gray-700">{kpiOwner?.email || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Department</label>
              <p className="mt-1 text-gray-700">{kpiOwner?.department || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Target className="h-6 w-6 text-red-600" />
            KPI Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-500">Title</label>
            <h3 className="mt-1 text-2xl font-bold text-gray-900">{kpi.title}</h3>
          </div>

          {kpi.description && (
            <div>
              <label className="text-sm font-medium text-gray-500">Description</label>
              <p className="mt-1 text-gray-700">{kpi.description}</p>
            </div>
          )}

          <Separator />

          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Type</label>
              <p className="mt-1 text-gray-900 font-medium">{getTypeLabel(kpi.type)}</p>
            </div>

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

            <div>
              <label className="text-sm font-medium text-gray-500">Data Source</label>
              <p className="mt-1 text-gray-700 text-sm">{kpi.dataSource || 'Not specified'}</p>
            </div>
          </div>

          {kpi.formula && (
            <>
              <Separator />
              <div>
                <label className="text-sm font-medium text-gray-500">Formula</label>
                <p className="mt-1 text-gray-900 font-mono text-sm bg-gray-50 p-3 rounded">
                  {kpi.formula}
                </p>
              </div>
            </>
          )}

          {kpi.smartScore !== undefined && (
            <>
              <Separator />
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-3">SMART Assessment</label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-red-600 h-3 rounded-full transition-all"
                        style={{ width: `${kpi.smartScore}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-red-600">{kpi.smartScore}/100</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Approval Action */}
      <Card className="border-2 border-gray-200">
        <CardHeader className="bg-gray-50">
          <CardTitle>Your Decision</CardTitle>
          <CardDescription>
            Provide your feedback and approve or reject this KPI
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label htmlFor="comment">
              Comment {" "}
              <span className="text-gray-500 font-normal">(Required for rejection, optional for approval)</span>
            </Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Enter your feedback, suggestions, or reasons..."
              rows={4}
              className="mt-2"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={submitting}
            >
              Cancel
            </Button>

            <Button
              variant="outline"
              onClick={handleReject}
              disabled={submitting}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>

            <Button
              onClick={handleApprove}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}