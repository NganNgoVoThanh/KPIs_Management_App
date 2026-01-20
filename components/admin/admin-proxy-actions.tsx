"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { authenticatedFetch } from "@/lib/api-client"

interface AdminProxyActionsProps {
  entityType: 'KPI' | 'ACTUAL'
  entityId: string
  staffUserId: string
  staffName: string
  currentLevel?: number
  currentApproverId?: string
  defaultTab?: 'return' | 'approve' | 'reassign'
  onActionComplete?: () => void
}

export function AdminProxyActions({
  entityType,
  entityId,
  staffUserId,
  staffName,
  currentLevel = 1,
  currentApproverId = "",
  defaultTab = 'return',
  hideTabs = false,
  onActionComplete
}: AdminProxyActionsProps & { hideTabs?: boolean }) {
  const { toast } = useToast()
  const [reason, setReason] = useState("")
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)

  const handleReturnToStaff = async () => {
    if (!reason.trim()) {
      toast({ title: "Validation Error", description: "Please provide a reason", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const response = await authenticatedFetch('/api/admin/proxy/return-to-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          entityId,
          staffUserId,
          reason,
          comment
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast({ title: "Success", description: data.message || "Change request sent successfully" })
        setReason("")
        setComment("")
        onActionComplete?.()
      } else {
        toast({ title: "Error", description: data.error || "Action failed", variant: "destructive" })
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4 border border-yellow-300 bg-yellow-50/50 rounded-lg p-4">
      <div className="flex items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          🛡️ Admin Proxy: Change Request
        </h3>
        <p className="text-xs text-muted-foreground ml-auto">
          Return to staff for revision
        </p>
      </div>

      <div className="mt-3 space-y-3">
        <div className="bg-blue-50 border border-blue-100 rounded p-2 text-xs text-blue-800">
          Return {entityType} to <strong>{staffName}</strong> for revision. This will cancel all currently pending approvals.
        </div>

        {/* Reason Field */}
        <div>
          <Label className="text-xs mb-1 block">Reason <span className="text-red-500">*</span></Label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for returning this request..."
            className="h-8 text-xs"
          />
        </div>

        {/* Comment Field */}
        <div>
          <Label className="text-xs mb-1 block">Private Comment (Optional)</Label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Internal notes for admin record..."
            className="min-h-[60px] text-xs resize-none"
          />
        </div>

        <Button
          onClick={handleReturnToStaff}
          disabled={loading}
          size="sm"
          className="w-full bg-orange-600 hover:bg-orange-700 text-white"
        >
          {loading ? "Processing..." : "Send Change Request"}
        </Button>
      </div>
    </div >
  )
}