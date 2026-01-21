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
  Target,
  ChevronDown,
  ChevronUp,
  Building,
  Briefcase
} from "lucide-react"
// ⭐ IMPORT COMPONENT ADMIN PROXY
import { AdminProxyActions } from "@/components/admin/admin-proxy-actions"

// ⭐ REUSABLE APPROVAL CARD COMPONENT
interface ApprovalCardProps {
  item: any
  user: User | null
  onAction: (item: any, action: 'APPROVE' | 'REJECT') => void
  onProxyAction?: (item: any) => void
}

const ApprovalCard = ({ item, user, onAction, onProxyAction }: ApprovalCardProps) => {
  const { entity, approval, submitter, approver, daysPending } = item
  const isKpi = approval.entityType === 'KPI'
  const status = approval.status || 'PENDING'
  const isProxyApproval = user?.role === 'ADMIN' && approver && approver.id !== user.id

  // Date formatter
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // --- APPROVED STATE ---
  if (status === 'APPROVED') {
    return (
      <Card className="hover:shadow-md transition-shadow border-green-200 bg-green-50/30">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {isKpi ? <Target className="h-5 w-5 text-green-600" /> : <TrendingUp className="h-5 w-5 text-green-600" />}
                {entity.title || 'Actual Results'}
              </CardTitle>
              <CardDescription className="mt-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <UserIcon className="h-3 w-3" />
                    Submitted by: {submitter?.name || 'Unknown'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Approved: {formatDate(approval.decidedAt || approval.updatedAt)}
                  </span>
                  <span className="flex items-center gap-1 text-green-700 font-medium">
                    <CheckCircle className="h-3 w-3" />
                    By: {approver?.name || 'Unknown'}
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
        <CardContent className="space-y-4">
          <EntityDetails entity={entity} isKpi={isKpi} />

          {/* Approval Comment */}
          {approval.comment && (
            <div className="bg-white/70 rounded-lg p-3 border border-green-200">
              <p className="text-xs font-medium text-green-700 mb-1">Approval Comment:</p>
              <p className="text-sm text-gray-700">{approval.comment}</p>
            </div>
          )}

          {/* Actions: View Details & Admin Change Request */}
          {isKpi && (user?.role === 'LINE_MANAGER' || user?.role === 'MANAGER' || user?.role === 'ADMIN') && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => window.location.href = `/kpis/${entity.id}`}
                variant="outline"
              >
                <FileText className="h-3 w-3 mr-1" />
                View KPI Details
              </Button>
              {user?.role === 'ADMIN' && (
                <Button
                  size="sm"
                  onClick={() => window.location.href = `/change-requests/create?kpiId=${entity.id}`}
                  className="bg-orange-600 hover:bg-orange-700 ml-auto"
                >
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Request Change
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // --- REJECTED STATE ---
  if (status === 'REJECTED') {
    return (
      <Card className="hover:shadow-md transition-shadow border-red-200 bg-red-50/30">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {isKpi ? <Target className="h-5 w-5 text-red-600" /> : <TrendingUp className="h-5 w-5 text-red-600" />}
                {entity.title || 'Actual Results'}
              </CardTitle>
              <CardDescription className="mt-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <UserIcon className="h-3 w-3" />
                    Submitted by: {submitter?.name || 'Unknown'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Rejected: {formatDate(approval.decidedAt || approval.updatedAt)}
                  </span>
                  <span className="flex items-center gap-1 text-red-700 font-medium">
                    <XCircle className="h-3 w-3" />
                    By: {approver?.name || 'Unknown'}
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
        <CardContent className="space-y-4">
          <EntityDetails entity={entity} isKpi={isKpi} />

          {/* Rejection Reason */}
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

          {/* Actions: View Details */}
          {isKpi && (user?.role === 'LINE_MANAGER' || user?.role === 'MANAGER' || user?.role === 'ADMIN') && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => window.location.href = `/kpis/${entity.id}`}
                variant="outline"
              >
                <FileText className="h-3 w-3 mr-1" />
                View KPI Details
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // --- PENDING STATE (DEFAULT) ---
  return (
    <Card className="hover:shadow-md transition-shadow bg-white">
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
                  {submitter?.name || 'Unknown'}
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
        <EntityDetails entity={entity} isKpi={isKpi} />

        {/* Actions for Pending */}
        <div className="flex gap-2 justify-end">
          {user?.role === 'ADMIN' && onProxyAction && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onProxyAction(item)}
              className="border-orange-500 text-orange-700 hover:bg-orange-50 mr-auto"
            >
              Change Request
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onAction(item, 'REJECT')}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700"
            size="sm"
            onClick={() => onAction(item, 'APPROVE')}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Helper component to avoid repetition
const EntityDetails = ({ entity, isKpi }: { entity: any, isKpi: boolean }) => (
  <>
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

    {entity.description && (
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-sm">{entity.description}</p>
      </div>
    )}
  </>
)

// ⭐ USER GROUP COMPONENT
interface UserApprovalGroupProps {
  submitter: any
  items: any[]
  user: User | null
  onAction: (item: any, action: 'APPROVE' | 'REJECT') => void
  onProxyAction?: (item: any) => void
}

const UserApprovalGroup = ({ submitter, items, user, onAction, onProxyAction }: UserApprovalGroupProps) => {
  const [isExpanded, setIsExpanded] = useState(false)

  // Calculate stats
  const kpiCount = items.filter(i => i.approval.entityType === 'KPI').length
  const actualCount = items.filter(i => i.approval.entityType === 'ACTUAL').length
  const oldestPending = Math.max(...items.map(i => i.daysPending || 0))

  // Determine status color for header based on items status (mixed, all approved, all rejected)
  // But usually this group is within a specific status tab.
  // We'll stick to the requested RED/GRAY theme for the container.

  return (
    <Card className={`border-l-4 transition-all duration-200 ${isExpanded ? 'border-l-red-600 shadow-md ring-1 ring-red-100' : 'border-l-gray-300 hover:shadow-sm'}`}>
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center border-2 ${isExpanded ? 'bg-red-100 border-red-200 text-red-700' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
              <UserIcon className="h-6 w-6" />
            </div>

            <div>
              <h3 className={`text-lg font-bold ${isExpanded ? 'text-red-900' : 'text-gray-900'}`}>
                {submitter?.name || 'Unknown User'}
              </h3>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                <div className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>{submitter?.jobTitle || 'N/A'}</span>
                </div>
                <div className="w-1 h-1 bg-gray-300 rounded-full hidden sm:block"></div>
                <div className="flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5" />
                  <span>{submitter?.department || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end text-sm">
              <span className="font-semibold text-gray-900">{items.length} Item{items.length !== 1 ? 's' : ''}</span>
              <span className="text-xs text-muted-foreground">
                {kpiCount} KPIs • {actualCount} Evaluations
              </span>
            </div>

            {oldestPending > 3 && (
              <Badge variant="destructive" className="hidden sm:flex">
                <Clock className="h-3 w-3 mr-1" />
                {oldestPending}d overdue
              </Badge>
            )}

            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
              {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {items.map((item, idx) => (
            <ApprovalCard
              key={idx}
              item={item}
              user={user}
              onAction={onAction}
              onProxyAction={onProxyAction}
            />
          ))}
        </div>
      )}
    </Card>
  )
}

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

  // ⭐ STATE FOR FILTER
  const [departmentFilter, setDepartmentFilter] = useState("ALL")
  const [searchKeyword, setSearchKeyword] = useState("")
  const [departments, setDepartments] = useState<string[]>([])
  const [filteredQueue, setFilteredQueue] = useState<any>({
    pending: [],
    approved: [],
    rejected: []
  })

  // Extract Departments on Load
  useEffect(() => {
    if (approvalQueue.pending.length > 0 || approvalQueue.approved.length > 0 || approvalQueue.rejected.length > 0) {
      const allItems = [...approvalQueue.pending, ...approvalQueue.approved, ...approvalQueue.rejected]
      const uniqueDeps = Array.from(new Set(allItems.map((item: any) => item.submitter?.department).filter(Boolean))) as string[]
      setDepartments(uniqueDeps.sort())
    }
  }, [approvalQueue])

  // Apply Filters
  useEffect(() => {
    const applyFilters = (items: any[]) => {
      return items.filter((item: any) => {
        // Filter by Department
        if (departmentFilter !== "ALL" && item.submitter?.department !== departmentFilter) {
          return false
        }
        // Filter by Keyword (Name or Title)
        if (searchKeyword) {
          const lowerKey = searchKeyword.toLowerCase()
          const matchedName = item.submitter?.name?.toLowerCase().includes(lowerKey)
          const matchedTitle = item.entity?.title?.toLowerCase().includes(lowerKey)
          if (!matchedName && !matchedTitle) return false
        }
        return true
      })
    }

    setFilteredQueue({
      pending: applyFilters(approvalQueue.pending),
      approved: applyFilters(approvalQueue.approved),
      rejected: applyFilters(approvalQueue.rejected)
    })
  }, [approvalQueue, departmentFilter, searchKeyword])

  const renderGroupedList = (items: any[], emptyMessage: string, EmptyIcon: any) => {
    if (items.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <EmptyIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{emptyMessage}</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters or check back later.
            </p>
          </CardContent>
        </Card>
      )
    }

    // Group items by submitter
    const grouped = items.reduce((acc: any, item: any) => {
      const submitterId = item.submitter?.id || 'unknown';
      if (!acc[submitterId]) {
        acc[submitterId] = {
          submitter: item.submitter,
          items: []
        };
      }
      acc[submitterId].items.push(item);
      return acc;
    }, {});

    return (
      <div className="space-y-4">
        {Object.values(grouped).map((group: any) => (
          <UserApprovalGroup
            key={group.submitter?.id || 'unknown'}
            submitter={group.submitter}
            items={group.items}
            user={user}
            onAction={handleApprovalAction}
            onProxyAction={handleAdminProxyView}
          />
        ))}
      </div>
    )
  }

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
            createdAt: item.createdAt,
            updatedAt: item.updatedAt // Ensure we have this if fetching from API, fallback to createdAt if missing logic
          },
          submitter: item.submitter,
          approver: item.approver,
          daysPending: item.daysPending
        }))

        // ⭐ DEDUPLICATION LOGIC: Group by Entity and keep only the LATEST approval record
        const latestMap = new Map();
        transformedData.forEach((item: any) => {
          const key = `${item.approval.entityType}_${item.approval.entityId}`;
          const existing = latestMap.get(key);

          if (!existing) {
            latestMap.set(key, item);
          } else {
            // Compare dates to keep the newest one (using createdAt or updatedAt if available)
            // Prioritize 'decidedAt' if status is final, else 'createdAt'
            const dateA = new Date(item.approval.createdAt).getTime();
            const dateB = new Date(existing.approval.createdAt).getTime();
            if (dateA > dateB) {
              latestMap.set(key, item);
            }
          }
        });

        const uniqueData = Array.from(latestMap.values());

        // Group approvals by status using the Unique List
        const grouped = {
          pending: uniqueData.filter((item: any) => item.approval.status === 'PENDING'),
          approved: uniqueData.filter((item: any) => item.approval.status === 'APPROVED'),
          rejected: uniqueData.filter((item: any) => item.approval.status === 'REJECTED')
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

      // Get Entity ID (KPI ID or Actual ID)
      const entityId = selectedApproval.entity?.id || selectedApproval.approval?.entityId || selectedApproval.entityId
      const entityType = selectedApproval.approval?.entityType || selectedApproval.entityType || 'KPI'

      if (!entityId) {
        console.error('[APPROVE-ERROR] No Entity ID found in selectedApproval:', selectedApproval)
        toast({
          title: "Error",
          description: "Cannot find Entity ID. Please refresh and try again.",
          variant: "destructive"
        })
        setIsProcessing(false)
        return
      }

      console.log(`[APPROVE] Processing ${dialogAction} for ${entityType} ${entityId}`)

      // Call API to approve/reject
      // Dynamically choose endpoint based on entity type
      const endpoint = entityType === 'ACTUAL'
        ? `/api/actuals/${entityId}/approve`
        : `/api/kpi/${entityId}/approve`

      const response = await authenticatedFetch(endpoint, {
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



  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Approvals</h1>
            <p className="text-muted-foreground mt-1">
              Review and manage KPI approvals and evaluations
            </p>
            {/* ⭐ ADMIN BADGE */}
            {user?.role === 'ADMIN' && (
              <Badge className="mt-2 bg-red-100 text-red-800 border-red-300">
                Admin Mode
              </Badge>
            )}
          </div>
        </div>

        {/* ⭐ FILTER SECTION */}
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search" className="mb-2 block text-sm font-medium">Search</Label>
              <div className="relative">
                <input
                  id="search"
                  type="text"
                  placeholder="Search by name or KPI title..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="department" className="mb-2 block text-sm font-medium">Department</Label>
              <select
                id="department"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm bg-white"
              >
                <option value="ALL">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-t-4 border-t-yellow-500 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {filteredQueue.pending.length}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-green-500 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Approved</p>
                  <p className="text-3xl font-bold text-green-600">
                    {filteredQueue.approved.length}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-red-500 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Rejected</p>
                  <p className="text-3xl font-bold text-red-600">
                    {filteredQueue.rejected.length}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
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
            {renderGroupedList(filteredQueue.pending, "No pending approvals", CheckCircle)}
          </TabsContent>



          <TabsContent value="approved" className="space-y-4">
            {renderGroupedList(filteredQueue.approved, "No approved items found", FileText)}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {renderGroupedList(filteredQueue.rejected, "No rejected items found", XCircle)}
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
                <Label htmlFor="comment" className="mb-4 block">
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
      </div >
    </AppLayout >
  )
}