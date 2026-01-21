"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, FileText, Loader2, AlertCircle, Send } from "lucide-react"
import { authService } from "@/lib/auth-service"
import { authenticatedFetch } from "@/lib/api-client"
import { useToast } from "@/components/ui/use-toast"
import type { KpiDefinition } from "@/lib/types"

function CreateChangeRequestContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const kpiId = searchParams.get("kpiId")
  const { toast } = useToast()

  const [kpi, setKpi] = useState<KpiDefinition | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [changeType, setChangeType] = useState<string>("")
  const [reason, setReason] = useState("")

  const currentUser = authService.getCurrentUser()

  useEffect(() => {
    if (!currentUser) {
      router.push("/login")
      return
    }

    // Only ADMIN can create change requests
    if (currentUser.role !== "ADMIN") {
      toast({
        variant: "destructive",
        title: "Unauthorized",
        description: "Only administrators can create change requests",
      })
      router.push("/kpis")
      return
    }

    if (!kpiId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "KPI ID is required",
      })
      router.push("/kpis")
      return
    }

    loadKpiData()
  }, [kpiId])

  const loadKpiData = async () => {
    if (!kpiId) return

    setLoading(true)
    try {
      const response = await authenticatedFetch(`/api/kpi/${kpiId}`)
      const data = await response.json()

      if (!response.ok || !data.success) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "KPI not found",
        })
        router.push("/kpis")
        return
      }

      setKpi(data.data)
    } catch (error) {
      console.error("Error loading KPI:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load KPI data",
      })
      router.push("/kpis")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!changeType) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a change type",
      })
      return
    }

    if (!reason.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please provide a reason for the change request",
      })
      return
    }

    setSubmitting(true)
    try {
      const response = await authenticatedFetch("/api/change-requests", {
        method: "POST",
        body: JSON.stringify({
          kpiDefinitionId: kpiId,
          changeType,
          reason: reason.trim(),
          requesterType: "ADMIN",
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Success",
          description: "Change request sent to user successfully",
        })
        router.push(`/kpis/${kpiId}`)
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || "Failed to create change request",
        })
      }
    } catch (error: any) {
      console.error("Error creating change request:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create change request",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-red-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
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
            <AlertDescription>KPI not found</AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Request KPI Change</h1>
            <p className="text-sm text-gray-500 mt-1">
              Send a change request to the KPI owner
            </p>
          </div>
        </div>

        {/* KPI Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">KPI Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Title</label>
              <p className="mt-1 text-gray-900">{kpi.title}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Owner</label>
              <p className="mt-1 text-gray-900">{kpi.user?.email || "Unknown"}</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Target</label>
                <p className="mt-1 text-gray-900">{kpi.target} {kpi.unit}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Weight</label>
                <p className="mt-1 text-gray-900">{kpi.weight}%</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <p className="mt-1 text-gray-900">{kpi.status}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Request Form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Change Request Details</CardTitle>
              <CardDescription>
                Specify what needs to be changed and why
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Change Type */}
              <div className="space-y-2">
                <Label htmlFor="changeType">Change Type *</Label>
                <Select value={changeType} onValueChange={setChangeType}>
                  <SelectTrigger id="changeType">
                    <SelectValue placeholder="Select change type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TARGET_ADJUSTMENT">Target Adjustment</SelectItem>
                    <SelectItem value="WEIGHT_ADJUSTMENT">Weight Adjustment</SelectItem>
                    <SelectItem value="DESCRIPTION_UPDATE">Description Update</SelectItem>
                    <SelectItem value="FORMULA_CHANGE">Formula Change</SelectItem>
                    <SelectItem value="UNIT_CHANGE">Unit Change</SelectItem>
                    <SelectItem value="DATA_SOURCE_CHANGE">Data Source Change</SelectItem>
                    <SelectItem value="OTHER">Other Changes</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  Select the type of change you want to request
                </p>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Change Request *</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why this change is needed. The KPI owner will receive this message and must make the requested changes."
                  rows={6}
                  className="resize-none"
                />
                <p className="text-sm text-gray-500">
                  Provide clear instructions for the user on what needs to be changed and why
                </p>
              </div>

              {/* Info Alert */}
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  <strong>Note:</strong> The KPI owner will receive a notification and must update their KPI according to your request.
                  The KPI status will be changed to CHANGE_REQUESTED.
                </AlertDescription>
              </Alert>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !changeType || !reason.trim()}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Change Request
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </AppLayout>
  )
}

export default function CreateChangeRequestPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-red-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </AppLayout>
    }>
      <CreateChangeRequestContent />
    </Suspense>
  )
}
