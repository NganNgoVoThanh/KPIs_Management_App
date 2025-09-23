"use client"

import type { KpiDefinition } from "@/lib/types"
import { getApprovalWorkflow, getApprovalHistory, formatApprovalLevel } from "@/lib/approval-utils"
import { mockUsers } from "@/lib/mockdata"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatDistanceToNow } from "date-fns"
import { CheckCircle, XCircle, Clock, UserIcon, Target, Calendar } from "lucide-react"

interface ApprovalCardProps {
  kpi: KpiDefinition
  onApprove: (kpiId: string, comment?: string) => void
  onReject: (kpiId: string, comment: string) => void
  onViewDetails: (kpiId: string) => void
}

export function ApprovalCard({ kpi, onApprove, onReject, onViewDetails }: ApprovalCardProps) {
  const workflow = getApprovalWorkflow(kpi.id)
  const history = getApprovalHistory(kpi.id)
  const owner = mockUsers.find((u) => u.id === kpi.userId)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING_LM":
      case "PENDING_HOD":
      case "PENDING_BOD":
        return "bg-yellow-500"
      case "APPROVED":
        return "bg-green-500"
      case "REJECTED":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING_LM":
        return "Pending Line Manager"
      case "PENDING_HOD":
        return "Pending Head of Dept"
      case "PENDING_BOD":
        return "Pending BOD"
      case "APPROVED":
        return "Approved"
      case "REJECTED":
        return "Rejected"
      default:
        return status
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{kpi.title}</CardTitle>
            <CardDescription className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <UserIcon className="h-4 w-4" />
                {owner?.name}
              </span>
              <span className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                {kpi.target} {kpi.unit}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {kpi.submittedAt ? formatDistanceToNow(kpi.submittedAt, { addSuffix: true }) : "Not submitted"}
              </span>
            </CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <div className={`h-2 w-2 rounded-full ${getStatusColor(kpi.status)}`} />
            {getStatusLabel(kpi.status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Type:</span>
            <p className="font-medium">{kpi.type.replace("_", " ")}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Weight:</span>
            <p className="font-medium">{kpi.weight}%</p>
          </div>
          <div>
            <span className="text-muted-foreground">Data Source:</span>
            <p className="font-medium">{kpi.dataSource}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Current Level:</span>
            <p className="font-medium">
              {workflow.currentLevel ? formatApprovalLevel(workflow.currentLevel) : "Complete"}
            </p>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="font-medium text-sm">Approval Progress</h4>
          <div className="space-y-2">
            {[1, 2, 3].map((level) => {
              const approval = history.find((h) => h.level === level)
              const isCurrent = workflow.currentLevel === level
              const isPending = !approval || approval.status === "PENDING"
              const isApproved = approval?.status === "APPROVED"
              const isRejected = approval?.status === "REJECTED"

              return (
                <div key={level} className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full border-2">
                    {isApproved && <CheckCircle className="h-4 w-4 text-green-600" />}
                    {isRejected && <XCircle className="h-4 w-4 text-red-600" />}
                    {isPending && isCurrent && <Clock className="h-4 w-4 text-yellow-600" />}
                    {isPending && !isCurrent && <div className="h-2 w-2 bg-gray-300 rounded-full" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isCurrent ? "text-primary" : ""}`}>
                      {formatApprovalLevel(level as 1 | 2 | 3)}
                    </p>
                    {approval && approval.comment && (
                      <p className="text-xs text-muted-foreground mt-1">"{approval.comment}"</p>
                    )}
                    {approval && approval.decidedAt && (
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(approval.decidedAt, { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <Separator />

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onViewDetails(kpi.id)} className="flex-1">
            View Details
          </Button>
          {!workflow.isComplete && (
            <>
              <Button onClick={() => onApprove(kpi.id)} className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button variant="destructive" onClick={() => onReject(kpi.id, "Needs revision")} className="flex-1">
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
