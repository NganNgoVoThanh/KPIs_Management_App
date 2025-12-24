"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { authService } from "@/lib/auth-service"
import { authenticatedFetch } from "@/lib/api-client"
import type { User, KpiDefinition, Approval } from "@/lib/types"
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  FileText,
  TrendingUp,
  User as UserIcon,
  Calendar,
  Target
} from "lucide-react"
// ⭐ IMPORT COMPONENT ADMIN PROXY
import { AdminProxyActions } from "@/components/admin/admin-proxy-actions"

export default function ApprovalsPage() {
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState("pending")
  const [approvalQueue, setApprovalQueue] = useState<any>({
    pending: [],
    approved: [],
    rejected: []
  })
  const [selectedApproval, setSelectedApproval] = useState<any>(null)
  const [comment, setComment] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [dialogAction, setDialogAction] = useState<'APPROVE' | 'REJECT' | null>(null)
  // ⭐ STATE CHO ADMIN PROXY VIEW
  const [showAdminProxy, setShowAdminProxy] = useState(false)
  const [selectedForProxy, setSelectedForProxy] = useState<any>(null)

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    if (currentUser) {
      setUser(currentUser)
      loadApprovals(currentUser)
    }
  }, [])

  const loadApprovals = async (currentUser: User) => {
    try {
      // Fetch ALL approvals from API
      const response = await authenticatedFetch('/api/approvals?status=ALL')
      const data = await response.json()

      console.log('[APPROVALS-PAGE] API response:', data)

      if (data.success) {
        // Transform API response to match component format
        const transformedData = data.data.map((item: any) => ({
          entity: item.entity,
          approval: {
            id: item.id,
            entityType: item.entityType,
            entityId: item.entityId,
            approverId: item.approverId,
            status: item.status,
            level: item.level,
            comment: item.comment,
            decidedAt: item.decidedAt,
            createdAt: item.createdAt
          },
          submitter: item.submitter,
          approver: item.approver,
          daysPending: item.daysPending
        }))

        // Group approvals by status
        const grouped = {
          pending: transformedData.filter((item: any) => item.approval.status === 'PENDING'),
          approved: transformedData.filter((item: any) => item.approval.status === 'APPROVED'),
          rejected: transformedData.filter((item: any) => item.approval.status === 'REJECTED')
        }

        console.log('[APPROVALS-PAGE] Grouped approvals:', grouped)
        setApprovalQueue(grouped)
      } else {
        console.error('Failed to load approvals:', data.error)
        setApprovalQueue({ pending: [], approved: [], rejected: [] })
      }
    } catch (error) {
      console.error('Error loading approvals:', error)
      setApprovalQueue({ pending: [], approved: [], rejected: [] })
    }
  }

  const handleApprovalAction = (approval: any, action: 'APPROVE' | 'REJECT') => {
    setSelectedApproval(approval)
    setDialogAction(action)
    setShowDialog(true)
    setComment("")
  }

  // ⭐ HANDLER CHO ADMIN PROXY
  const handleAdminProxyView = (approval: any) => {
    setSelectedForProxy(approval)
    setShowAdminProxy(true)
  }

  const processApproval = async () => {
    if (!selectedApproval || !dialogAction) return

    setIsProcessing(true)

    try {
      // Determine correct HTTP method and endpoint
      const isApprove = dialogAction === 'APPROVE'
      const method = isApprove ? 'POST' : 'PATCH'

      // Get KPI ID from either entity.id, approval.entityId, or entityId
      const kpiId = selectedApproval.entity?.id || selectedApproval.approval?.entityId || selectedApproval.entityId

      if (!kpiId) {
        console.error('[APPROVE-ERROR] No KPI ID found in selectedApproval:', selectedApproval)
        toast({
          title: "Error",
          description: "Cannot find KPI ID. Please refresh and try again.",
          variant: "destructive"
        })
        setIsProcessing(false)
        return
      }

      console.log(`[APPROVE] Processing ${dialogAction} for KPI ${kpiId}`)

      // Call API to approve/reject
      const response = await authenticatedFetch(`/api/kpi/${kpiId}/approve`, {
        method: method,
        body: JSON.stringify({
          comment: comment || null
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        // Show success message
        toast({
          title: "Success",
          description: result.message || `KPI ${dialogAction.toLowerCase()}d successfully`
        })

        // Clean up dialog state FIRST
        setShowDialog(false)
        setSelectedApproval(null)
        setComment("")
        setDialogAction(null)
        setIsProcessing(false)

        // Reload approvals AFTER dialog is closed to prevent race condition
        if (user) {
          console.log('[APPROVE] Reloading approvals after action')
          await loadApprovals(user)
        }
      } else {
        // Error case - keep dialog open, just stop processing
        toast({
          title: "Error",
          description: result.error || 'Failed to process approval',
          variant: "destructive"
        })
        setIsProcessing(false)
      }
    } catch (error) {
      console.error('Approval processing error:', error)
      toast({
        title: "Error",
        description: "Failed to process approval",
        variant: "destructive"
      })
      setIsProcessing(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const ApprovalCard = ({ item }: { item: any }) => {
    const { entity, approval, submitter, approver, daysPending } = item
    const isKpi = approval.entityType === 'KPI'
    const isProxyApproval = user?.role === 'ADMIN' && approver && approver.id !== user.id

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {isKpi ? <Target className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
                {entity.title || 'Actual Results'}
              </CardTitle>
              <CardDescription className="mt-1">
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <UserIcon className="h-3 w-3" />
                    {submitter.name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(approval.createdAt)}
                  </span>
                  {isProxyApproval && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                      Assigned to: {approver.name}
                    </Badge>
                  )}
                </div>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {daysPending > 3 && (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {daysPending} days pending
                </Badge>
              )}
              <Badge variant="outline">
                Level {approval.level}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* KPI Details */}
          {isKpi && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Type</p>
                <p className="font-medium">{entity.type?.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Target</p>
                <p className="font-medium">{entity.target} {entity.unit}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Weight</p>
                <p className="font-medium">{entity.weight}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Data Source</p>
                <p className="font-medium">{entity.dataSource || 'N/A'}</p>
              </div>
            </div>
          )}
          
          {/* Actual Details */}
          {!isKpi && entity.actualValue !== undefined && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Achievement</span>
                <span className="font-medium">
                  {entity.actualValue} / {entity.target} {entity.unit}
                </span>
              </div>
              <Progress value={entity.percentage || 0} className="h-2" />
              <div className="flex justify-between text-xs">
                <span>{entity.percentage?.toFixed(0) || 0}% Complete</span>
                <span>Score: {entity.score || 0}/5</span>
              </div>
            </div>
          )}
          
          {/* Description */}
          {entity.description && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm">{entity.description}</p>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-2">
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => handleApprovalAction(item, 'APPROVE')}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => handleApprovalAction(item, 'REJECT')}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            {/* ⭐ NÚT ADMIN ACTIONS - CHỈ HIỆN CHO ADMIN */}
            {user?.role === 'ADMIN' && (
              <Button
                variant="outline"
                onClick={() => handleAdminProxyView(item)}
                className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"
              >
                Admin Actions
              </Button>
            )}
          </div>

          {/* ⭐ ADMIN PROXY PANEL - INLINE */}
          {user?.role === 'ADMIN' && showAdminProxy && selectedForProxy?.approval.entityId === approval.entityId && (
            <div className="mt-4">
              <AdminProxyActions
                entityType={approval.entityType}
                entityId={entity.id}
                staffUserId={entity.userId}
                staffName={submitter.name}
                onActionComplete={() => {
                  setShowAdminProxy(false)
                  setSelectedForProxy(null)
                  if (user) loadApprovals(user)
                  toast({
                    title: "Action completed",
                    description: "The admin action has been processed successfully"
                  })
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Approvals</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve KPIs and performance evaluations
          </p>
          {/* ⭐ ADMIN BADGE */}
          {user?.role === 'ADMIN' && (
            <Badge className="mt-2 bg-yellow-100 text-yellow-800 border-yellow-300">
              Admin Mode: Proxy actions available
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {approvalQueue.pending.length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold text-green-600">
                    {approvalQueue.approved.length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">
                    {approvalQueue.rejected.length}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({approvalQueue.pending.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved ({approvalQueue.approved.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({approvalQueue.rejected.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {approvalQueue.pending.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No pending approvals</h3>
                  <p className="text-sm text-muted-foreground">
                    You're all caught up!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {approvalQueue.pending.map((item: any, index: number) => (
                  <ApprovalCard key={index} item={item} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {approvalQueue.approved.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No approved items</h3>
                  <p className="text-sm text-muted-foreground">
                    Approved items will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {approvalQueue.approved.map((item: any, index: number) => {
                  const { entity, approval, submitter, approver } = item
                  const isKpi = approval.entityType === 'KPI'

                  return (
                    <Card key={index} className="border-green-200 bg-green-50/30">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              {isKpi ? <Target className="h-5 w-5 text-green-600" /> : <TrendingUp className="h-5 w-5 text-green-600" />}
                              {entity?.title || 'Actual Results'}
                            </CardTitle>
                            <CardDescription className="mt-2 space-y-1">
                              <div className="flex items-center gap-4 text-sm">
                                <span className="flex items-center gap-1">
                                  <UserIcon className="h-3 w-3" />
                                  Submitted by: {submitter?.name || 'Unknown'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Approved: {formatDate(approval.decidedAt)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-green-700 font-medium">
                                  Approved by: {approver?.name || 'Unknown'} ({approver?.email || 'N/A'})
                                </span>
                              </div>
                            </CardDescription>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge className="bg-green-600 text-white">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approved
                            </Badge>
                            <Badge variant="outline" className="border-green-600 text-green-700">
                              Level {approval.level}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* KPI Details */}
                        {isKpi && entity && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm bg-white/50 p-3 rounded-lg">
                            <div>
                              <p className="text-muted-foreground">Type</p>
                              <p className="font-medium">{entity.type?.replace(/_/g, ' ')}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Target</p>
                              <p className="font-medium">{entity.target} {entity.unit}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Weight</p>
                              <p className="font-medium">{entity.weight}%</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Data Source</p>
                              <p className="font-medium text-xs">{entity.dataSource || 'N/A'}</p>
                            </div>
                          </div>
                        )}

                        {/* Approval Comment */}
                        {approval.comment && (
                          <div className="bg-white/70 rounded-lg p-3 border border-green-200">
                            <p className="text-xs font-medium text-green-700 mb-1">Approval Comment:</p>
                            <p className="text-sm text-gray-700">{approval.comment}</p>
                          </div>
                        )}

                        {/* Description if exists */}
                        {entity?.description && (
                          <div className="bg-white/50 rounded-lg p-3">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Description:</p>
                            <p className="text-sm">{entity.description}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {approvalQueue.rejected.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No rejected items</h3>
                  <p className="text-sm text-muted-foreground">
                    Rejected items will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {approvalQueue.rejected.map((item: any, index: number) => {
                  const { entity, approval, submitter, approver } = item
                  const isKpi = approval.entityType === 'KPI'

                  return (
                    <Card key={index} className="border-red-200 bg-red-50/30">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              {isKpi ? <Target className="h-5 w-5 text-red-600" /> : <TrendingUp className="h-5 w-5 text-red-600" />}
                              {entity?.title || 'Actual Results'}
                            </CardTitle>
                            <CardDescription className="mt-2 space-y-1">
                              <div className="flex items-center gap-4 text-sm">
                                <span className="flex items-center gap-1">
                                  <UserIcon className="h-3 w-3" />
                                  Submitted by: {submitter?.name || 'Unknown'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Rejected: {formatDate(approval.decidedAt)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-red-700 font-medium">
                                  Rejected by: {approver?.name || 'Unknown'} ({approver?.email || 'N/A'})
                                </span>
                              </div>
                            </CardDescription>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Rejected
                            </Badge>
                            <Badge variant="outline" className="border-red-600 text-red-700">
                              Level {approval.level}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* KPI Details */}
                        {isKpi && entity && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm bg-white/50 p-3 rounded-lg">
                            <div>
                              <p className="text-muted-foreground">Type</p>
                              <p className="font-medium">{entity.type?.replace(/_/g, ' ')}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Target</p>
                              <p className="font-medium">{entity.target} {entity.unit}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Weight</p>
                              <p className="font-medium">{entity.weight}%</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Data Source</p>
                              <p className="font-medium text-xs">{entity.dataSource || 'N/A'}</p>
                            </div>
                          </div>
                        )}

                        {/* Rejection Reason - ALWAYS SHOW */}
                        <div className="bg-red-100 rounded-lg p-4 border-2 border-red-300">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 text-red-700 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-red-900 mb-1">Rejection Reason:</p>
                              <p className="text-sm text-red-800">
                                {approval.comment || 'No reason provided'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Description if exists */}
                        {entity?.description && (
                          <div className="bg-white/50 rounded-lg p-3">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Description:</p>
                            <p className="text-sm">{entity.description}</p>
                          </div>
                        )}

                        {/* Action hint for staff */}
                        {submitter?.id === user?.id && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-xs text-blue-800">
                              <strong>Next Step:</strong> You can revise this KPI based on the feedback and resubmit it for approval.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Approval Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {dialogAction === 'APPROVE' ? 'Approve' : 'Reject'} {selectedApproval?.approval.entityType}
              </DialogTitle>
              <DialogDescription>
                Please provide your feedback for this {dialogAction === 'APPROVE' ? 'approval' : 'rejection'}.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="comment">
                  Comment {dialogAction === 'REJECT' && <span className="text-red-500">*</span>}
                </Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    dialogAction === 'APPROVE' 
                      ? "Optional: Add any comments or feedback..."
                      : "Required: Please explain the reason for rejection..."
                  }
                  rows={4}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={processApproval}
                disabled={isProcessing || (dialogAction === 'REJECT' && !comment)}
                className={dialogAction === 'APPROVE' ? 'bg-green-600 hover:bg-green-700' : ''}
                variant={dialogAction === 'REJECT' ? 'destructive' : 'default'}
              >
                {isProcessing ? 'Processing...' : dialogAction === 'APPROVE' ? 'Approve' : 'Reject'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}