// components/approvals/approval-dialog.tsx - FIXED: No mockdata, 2-level approval
"use client"

import { useState, useEffect } from "react"
import type { KpiDefinition, User } from "@/lib/types"
import { getApprovalWorkflow, getApprovalHistory, formatApprovalLevel } from "@/lib/approval-utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface ApprovalDialogProps {
  kpi: KpiDefinition | null
  isOpen: boolean
  onClose: () => void
  onApprove: (kpiId: string, comment?: string) => void
  onReject: (kpiId: string, comment: string) => void
}

export function ApprovalDialog({ kpi, isOpen, onClose, onApprove, onReject }: ApprovalDialogProps) {
  const [comment, setComment] = useState("")
  const [action, setAction] = useState<"approve" | "reject" | null>(null)
  const [owner, setOwner] = useState<User | null>(null)
  const [approvers, setApprovers] = useState<Record<string, User>>({})

  useEffect(() => {
    if (!kpi) return

    // Fetch KPI owner
    const fetchOwner = async () => {
      try {
        const response = await fetch(`/api/users/${kpi.userId}`)
        if (response.ok) {
          const data = await response.json()
          setOwner(data)
        }
      } catch (error) {
        console.error('Error fetching owner:', error)
      }
    }

    // Fetch approvers
    const fetchApprovers = async () => {
      const history = getApprovalHistory(kpi.id)
      const approverIds = [...new Set(history.map(h => h.approverId))]
      
      const approversData: Record<string, User> = {}
      for (const id of approverIds) {
        try {
          const response = await fetch(`/api/users/${id}`)
          if (response.ok) {
            const data = await response.json()
            approversData[id] = data
          }
        } catch (error) {
          console.error(`Error fetching approver ${id}:`, error)
        }
      }
      setApprovers(approversData)
    }

    fetchOwner()
    fetchApprovers()
  }, [kpi])

  if (!kpi) return null

  const workflow = getApprovalWorkflow(kpi.id)
  const history = getApprovalHistory(kpi.id)

  const handleSubmit = () => {
    if (action === "approve") {
      onApprove(kpi.id, comment || undefined)
    } else if (action === "reject") {
      if (!comment.trim()) {
        alert("Please provide a reason for rejection")
        return
      }
      onReject(kpi.id, comment)
    }
    setComment("")
    setAction(null)
    onClose()
  }

  const handleCancel = () => {
    setComment("")
    setAction(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action === "approve" && <CheckCircle className="h-5 w-5 text-green-600" />}
            {action === "reject" && <XCircle className="h-5 w-5 text-red-600" />}
            {!action && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
            {action ? `${action === "approve" ? "Approve" : "Reject"} KPI` : "KPI Approval Details"}
          </DialogTitle>
          <DialogDescription>
            {action
              ? `You are about to ${action} this KPI. Please provide your feedback.`
              : "Review the KPI details and approval history before making a decision."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* KPI Details */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{kpi.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {owner?.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("") || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">{owner?.name || 'Loading...'}</span>
                <Badge variant="outline">{owner?.role.replace(/_/g, " ") || 'N/A'}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <span className="text-sm text-muted-foreground">Type</span>
                <p className="font-medium">{kpi.type.replace(/_/g, " ")}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Target</span>
                <p className="font-medium">
                  {kpi.target} {kpi.unit}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Weight</span>
                <p className="font-medium">{kpi.weight}%</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Data Source</span>
                <p className="font-medium">{kpi.dataSource || 'N/A'}</p>
              </div>
            </div>

            {kpi.formula && (
              <div>
                <span className="text-sm text-muted-foreground">Formula</span>
                <p className="font-mono text-sm bg-muted/50 p-2 rounded">{kpi.formula}</p>
              </div>
            )}

            {kpi.description && (
              <div>
                <span className="text-sm text-muted-foreground">Description</span>
                <p className="text-sm mt-1">{kpi.description}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Approval History - 2 levels only */}
          <div className="space-y-4">
            <h4 className="font-semibold">Approval History (2 Levels)</h4>
            <div className="space-y-3">
              {[1, 2].map((level) => {
                const approval = history.find((h) => h.level === level)
                const isCurrent = workflow.currentLevel === level
                const approver = approval ? approvers[approval.approverId] : null

                return (
                  <div key={level} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 mt-1">
                      {approval?.status === "APPROVED" && <CheckCircle className="h-5 w-5 text-green-600" />}
                      {approval?.status === "REJECTED" && <XCircle className="h-5 w-5 text-red-600" />}
                      {(!approval || approval.status === "PENDING") && isCurrent && (
                        <Clock className="h-5 w-5 text-yellow-600" />
                      )}
                      {(!approval || approval.status === "PENDING") && !isCurrent && (
                        <div className="h-3 w-3 bg-gray-300 rounded-full" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className={`font-medium ${isCurrent ? "text-primary" : ""}`}>
                          {formatApprovalLevel(level as 1 | 2)}
                        </p>
                        {approval && (
                          <Badge
                            variant={
                              approval.status === "APPROVED"
                                ? "default"
                                : approval.status === "REJECTED"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {approval.status}
                          </Badge>
                        )}
                      </div>
                      {approver && <p className="text-sm text-muted-foreground">{approver.name}</p>}
                      {approval?.comment && (
                        <p className="text-sm mt-2 p-2 bg-muted/50 rounded">"{approval.comment}"</p>
                      )}
                      {approval?.decidedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(approval.decidedAt), { addSuffix: true })}
                        </p>
                      )}
                      {isCurrent && !approval && (
                        <p className="text-sm text-yellow-600 font-medium">Awaiting approval</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Action Section */}
          {!workflow.isComplete && !action && (
            <div className="flex gap-2">
              <Button onClick={() => setAction("approve")} className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button variant="destructive" onClick={() => setAction("reject")} className="flex-1">
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          )}

          {/* Comment Section */}
          {action && (
            <>
              <Alert variant={action === "reject" ? "destructive" : "default"}>
                <AlertDescription>
                  {action === "reject" 
                    ? "⚠️ Rejection comment is REQUIRED. Please explain why this KPI needs revision."
                    : "Optional: Add feedback or comments for the staff member."}
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="comment">
                  {action === "approve" ? "Approval Comment (Optional)" : "Rejection Reason (Required) *"}
                </Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    action === "approve"
                      ? "Add any feedback or comments..."
                      : "Please explain why this KPI is being rejected..."
                  }
                  rows={3}
                  className={action === "reject" && !comment.trim() ? "border-red-500" : ""}
                />
                {action === "reject" && !comment.trim() && (
                  <p className="text-xs text-red-600">This field is required for rejection</p>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {action ? "Cancel" : "Close"}
          </Button>
          {action && (
            <Button 
              onClick={handleSubmit} 
              variant={action === "approve" ? "default" : "destructive"}
              disabled={action === "reject" && !comment.trim()}
            >
              {action === "approve" ? "Approve KPI" : "Reject KPI"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}