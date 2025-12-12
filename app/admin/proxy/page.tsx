"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  UserCog,
  RefreshCw,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Shield,
  History,
  AlertTriangle,
  Search,
  Filter
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import type { KpiDefinition, KpiActual, User, ProxyAction } from '@/lib/types'

type ActionType = 'return' | 'approve' | 'reject' | 'reassign'

interface PendingItem {
  id: string
  type: 'KPI' | 'ACTUAL'
  title: string
  owner: string
  ownerName: string
  currentLevel: number
  currentApprover: string
  currentApproverName: string
  status: string
  submittedAt: string
  department: string
}

export default function AdminProxyPage() {
  const [activeTab, setActiveTab] = useState('pending')
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([])
  const [proxyActions, setProxyActions] = useState<ProxyAction[]>([])
  const [statistics, setStatistics] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null)
  const [actionDialog, setActionDialog] = useState<ActionType | null>(null)
  const [actionData, setActionData] = useState({
    reason: '',
    comment: '',
    newApproverId: '',
    level: 1
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [users, setUsers] = useState<User[]>([])
  const { toast } = useToast()

  // Fetch data
  const fetchPendingItems = async () => {
    setLoading(true)
    try {
      // In real app, this would fetch from API
      // For now, using mock data
      const mockItems: PendingItem[] = [
        {
          id: 'kpi-1',
          type: 'KPI',
          title: 'Reduce Internal NCR',
          owner: 'user-1',
          ownerName: 'John Doe',
          currentLevel: 1,
          currentApprover: 'manager-1',
          currentApproverName: 'Jane Manager',
          status: 'PENDING_LM',
          submittedAt: new Date().toISOString(),
          department: 'QA'
        }
      ]
      setPendingItems(mockItems)
    } catch (error) {
      console.error('Failed to fetch pending items:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProxyActions = async () => {
    try {
      const res = await fetch('/api/admin/proxy/actions')
      const data = await res.json()
      if (data.success) {
        setProxyActions(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch proxy actions:', error)
    }
  }

  const fetchStatistics = async () => {
    try {
      const res = await fetch('/api/admin/proxy/statistics')
      const data = await res.json()
      if (data.success) {
        setStatistics(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch statistics:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      if (data.success) {
        setUsers(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  useEffect(() => {
    fetchPendingItems()
    fetchProxyActions()
    fetchStatistics()
    fetchUsers()
  }, [])

  // Handle proxy actions
  const handleReturnToStaff = async () => {
    if (!selectedItem) return

    try {
      const res = await fetch('/api/admin/proxy/return-to-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: selectedItem.type,
          entityId: selectedItem.id,
          staffUserId: selectedItem.owner,
          reason: actionData.reason,
          comment: actionData.comment
        })
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: 'Returned to staff',
          description: 'The form has been returned to the staff member',
        })
        closeDialog()
        fetchPendingItems()
        fetchProxyActions()
        fetchStatistics()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: 'Action failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const handleApproveAsManager = async () => {
    if (!selectedItem) return

    try {
      const res = await fetch('/api/admin/proxy/approve-as-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: selectedItem.type,
          entityId: selectedItem.id,
          level: selectedItem.currentLevel,
          managerId: selectedItem.currentApprover,
          comment: actionData.comment,
          reason: actionData.reason
        })
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: 'Approved as manager',
          description: `Approved at level ${selectedItem.currentLevel}`,
        })
        closeDialog()
        fetchPendingItems()
        fetchProxyActions()
        fetchStatistics()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: 'Action failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const handleRejectAsManager = async () => {
    if (!selectedItem) return

    try {
      const res = await fetch('/api/admin/proxy/reject-as-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: selectedItem.type,
          entityId: selectedItem.id,
          level: selectedItem.currentLevel,
          managerId: selectedItem.currentApprover,
          comment: actionData.comment,
          reason: actionData.reason
        })
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: 'Rejected as manager',
          description: 'The form has been rejected',
        })
        closeDialog()
        fetchPendingItems()
        fetchProxyActions()
        fetchStatistics()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: 'Action failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const handleReassignApprover = async () => {
    if (!selectedItem || !actionData.newApproverId) return

    try {
      const res = await fetch('/api/admin/proxy/reassign-approver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: selectedItem.type,
          entityId: selectedItem.id,
          level: actionData.level,
          newApproverId: actionData.newApproverId,
          reason: actionData.reason,
          comment: actionData.comment
        })
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: 'Approver reassigned',
          description: 'The approval flow has been updated',
        })
        closeDialog()
        fetchPendingItems()
        fetchProxyActions()
        fetchStatistics()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: 'Action failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const executeAction = () => {
    if (!actionData.reason.trim()) {
      toast({
        title: 'Reason required',
        description: 'Please provide a reason for this action',
        variant: 'destructive'
      })
      return
    }

    switch (actionDialog) {
      case 'return':
        handleReturnToStaff()
        break
      case 'approve':
        handleApproveAsManager()
        break
      case 'reject':
        handleRejectAsManager()
        break
      case 'reassign':
        handleReassignApprover()
        break
    }
  }

  const closeDialog = () => {
    setActionDialog(null)
    setSelectedItem(null)
    setActionData({
      reason: '',
      comment: '',
      newApproverId: '',
      level: 1
    })
  }

  const openActionDialog = (item: PendingItem, action: ActionType) => {
    setSelectedItem(item)
    setActionDialog(action)
    setActionData({
      ...actionData,
      level: item.currentLevel
    })
  }

  // Filter pending items
  const filteredItems = pendingItems.filter(item => {
    const matchesSearch = searchQuery.trim() === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.department.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'PENDING_LM': { variant: 'secondary', label: 'Pending LM' },
      'PENDING_HOD': { variant: 'secondary', label: 'Pending HoD' },
      'PENDING_BOD': { variant: 'secondary', label: 'Pending BOD' },
      'APPROVED': { variant: 'default', label: 'Approved' },
      'REJECTED': { variant: 'destructive', label: 'Rejected' }
    }

    const config = variants[status] || { variant: 'secondary', label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getActionTypeIcon = (actionType: string) => {
    switch (actionType) {
      case 'RETURN_TO_STAFF':
        return <ArrowLeft className="h-4 w-4" />
      case 'APPROVE_AS_MANAGER':
        return <CheckCircle className="h-4 w-4" />
      case 'REJECT_AS_MANAGER':
        return <XCircle className="h-4 w-4" />
      case 'REASSIGN_APPROVER':
        return <RefreshCw className="h-4 w-4" />
      default:
        return <UserCog className="h-4 w-4" />
    }
  }

  const getActionTypeLabel = (actionType: string) => {
    return actionType.split('_').map(word => 
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ')
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Proxy Management</h1>
          <p className="text-gray-600 mt-1">
            Manage approval workflows and take actions on behalf of managers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-red-600" />
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">
                  {statistics.totalPending || 0}
                </p>
                <p className="text-sm text-gray-600 mt-1">Pending Items</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">
                  {statistics.totalReturned || 0}
                </p>
                <p className="text-sm text-gray-600 mt-1">Returned to Staff</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {statistics.totalReassigned || 0}
                </p>
                <p className="text-sm text-gray-600 mt-1">Reassigned</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {statistics.totalProxyActions || 0}
                </p>
                <p className="text-sm text-gray-600 mt-1">Total Actions</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Pending Items
            {pendingItems.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingItems.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Action History
          </TabsTrigger>
        </TabsList>

        {/* Pending Items Tab */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>
                Items awaiting approval that require admin intervention
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by title, owner, or department..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PENDING_LM">Pending LM</SelectItem>
                    <SelectItem value="PENDING_HOD">Pending HoD</SelectItem>
                    <SelectItem value="PENDING_BOD">Pending BOD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                  </div>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No pending items found</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Current Approver</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Badge variant={item.type === 'KPI' ? 'default' : 'secondary'}>
                              {item.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{item.title}</TableCell>
                          <TableCell>{item.ownerName}</TableCell>
                          <TableCell>{item.department}</TableCell>
                          <TableCell>{item.currentApproverName}</TableCell>
                          <TableCell>Level {item.currentLevel}</TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {new Date(item.submittedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openActionDialog(item, 'return')}
                                title="Return to staff"
                              >
                                <ArrowLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => openActionDialog(item, 'approve')}
                                title="Approve as manager"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openActionDialog(item, 'reject')}
                                title="Reject as manager"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => openActionDialog(item, 'reassign')}
                                title="Reassign approver"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Action History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Proxy Action History</CardTitle>
              <CardDescription>
                Complete audit trail of all admin proxy actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {proxyActions.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No proxy actions recorded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {proxyActions.map((action) => (
                    <div
                      key={action.id}
                      className="rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getActionTypeIcon(action.actionType)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">
                              {getActionTypeLabel(action.actionType)}
                            </Badge>
                            <Badge variant="secondary">{action.entityType}</Badge>
                            <span className="text-sm text-gray-600">
                              {new Date(action.performedAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 mb-1">
                            <span className="font-medium">Performed by:</span> {action.performedBy}
                          </p>
                          <p className="text-sm text-gray-700 mb-2">
                            <span className="font-medium">Reason:</span> {action.reason}
                          </p>
                          {action.comment && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Comment:</span> {action.comment}
                            </p>
                          )}
                          {action.previousApproverId && action.newApproverId && (
                            <p className="text-sm text-gray-600 mt-1">
                              Reassigned from {action.previousApproverId} to {action.newApproverId}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={actionDialog !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {actionDialog === 'return' && 'Return to Staff'}
              {actionDialog === 'approve' && 'Approve as Manager'}
              {actionDialog === 'reject' && 'Reject as Manager'}
              {actionDialog === 'reassign' && 'Reassign Approver'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog === 'return' && 'Return this form to the staff member for revision'}
              {actionDialog === 'approve' && 'Approve this item on behalf of the current approver'}
              {actionDialog === 'reject' && 'Reject this item on behalf of the current approver'}
              {actionDialog === 'reassign' && 'Assign a new approver for this level'}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 py-4">
              {/* Item Info */}
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Type:</span>{' '}
                    <Badge variant="outline">{selectedItem.type}</Badge>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Status:</span>{' '}
                    {getStatusBadge(selectedItem.status)}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium text-gray-700">Title:</span>{' '}
                    <span className="text-gray-900">{selectedItem.title}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Owner:</span>{' '}
                    {selectedItem.ownerName}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Current Approver:</span>{' '}
                    {selectedItem.currentApproverName}
                  </div>
                </div>
              </div>

              {/* Reassign specific fields */}
              {actionDialog === 'reassign' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="approval-level">Approval Level</Label>
                    <Select 
                      value={actionData.level.toString()} 
                      onValueChange={(val) => setActionData({...actionData, level: parseInt(val)})}
                    >
                      <SelectTrigger id="approval-level">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Level 1 - Line Manager</SelectItem>
                        <SelectItem value="2">Level 2 - Head of Department</SelectItem>
                        <SelectItem value="3">Level 3 - BOD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-approver">New Approver</Label>
                    <Select 
                      value={actionData.newApproverId} 
                      onValueChange={(val) => setActionData({...actionData, newApproverId: val})}
                    >
                      <SelectTrigger id="new-approver">
                        <SelectValue placeholder="Select new approver" />
                      </SelectTrigger>
                      <SelectContent>
                        {users
                          .filter(u => ['LINE_MANAGER', 'HEAD_OF_DEPT', 'BOD'].includes(u.role))
                          .map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name} - {user.role}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Reason (Required) */}
              <div className="space-y-2">
                <Label htmlFor="reason">Reason (Required)</Label>
                <Textarea
                  id="reason"
                  value={actionData.reason}
                  onChange={(e) => setActionData({...actionData, reason: e.target.value})}
                  placeholder="Explain why this action is necessary..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Comment (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="comment">Comment (Optional)</Label>
                <Textarea
                  id="comment"
                  value={actionData.comment}
                  onChange={(e) => setActionData({...actionData, comment: e.target.value})}
                  placeholder="Add any additional notes..."
                  rows={2}
                  className="resize-none"
                />
              </div>

              {/* Warning */}
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                <div className="flex gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
                  <div className="text-sm text-orange-900">
                    <p className="font-medium">Important:</p>
                    <p className="mt-1">
                      This action will be recorded in the audit trail. Make sure you have proper
                      authorization to perform this administrative action.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={executeAction}
              variant={actionDialog === 'reject' ? 'destructive' : 'default'}
            >
              {actionDialog === 'return' && <><ArrowLeft className="mr-2 h-4 w-4" />Return</>}
              {actionDialog === 'approve' && <><CheckCircle className="mr-2 h-4 w-4" />Approve</>}
              {actionDialog === 'reject' && <><XCircle className="mr-2 h-4 w-4" />Reject</>}
              {actionDialog === 'reassign' && <><RefreshCw className="mr-2 h-4 w-4" />Reassign</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}