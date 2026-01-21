"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  RefreshCw,
  Search,
  Filter,
  ShieldAlert
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { AdminProxyActions } from '@/components/admin/admin-proxy-actions'

interface PendingItem {
  id: string // Approval ID
  entityId: string // Entity ID (KPI ID)
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
  const [loading, setLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const { toast } = useToast()

  // Fetch data
  const fetchPendingItems = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/approvals?status=PENDING')
      const data = await res.json()

      if (data.success && Array.isArray(data.data)) {
        const mappedItems: PendingItem[] = data.data.map((item: any) => ({
          id: item.id,
          entityId: item.entityId,
          type: item.entityType,
          title: item.entity?.title || item.entityTitle || 'Unknown Title',
          owner: item.submitter?.id || '',
          ownerName: item.submitter?.name || 'Unknown',
          currentLevel: item.level,
          currentApprover: item.approverId,
          currentApproverName: item.approver?.name || 'Unknown',
          status: 'PENDING',
          submittedAt: item.createdAt,
          department: item.submitter?.department || 'Unknown'
        }))

        setPendingItems(mappedItems)
      }
    } catch (error) {
      console.error('Failed to fetch pending items:', error)
      toast({
        title: "Error",
        description: "Failed to load pending approvals",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingItems()
  }, [])

  // Derived state for filters
  const filteredItems = pendingItems.filter(item => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.ownerName.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesDept = deptFilter === 'all' || item.department === deptFilter
    const matchesLevel = levelFilter === 'all' || item.currentLevel.toString() === levelFilter
    const matchesType = typeFilter === 'all' || item.type === typeFilter

    return matchesSearch && matchesDept && matchesLevel && matchesType
  })

  // Get unique departments for filter
  const departments = Array.from(new Set(pendingItems.map(i => i.department).filter(Boolean)))

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Admin Proxy Management</h1>
          <p className="text-muted-foreground mt-1">
            Oversee and intervene in approval workflows
          </p>
        </div>
        <Button onClick={fetchPendingItems} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
          <TabsTrigger value="history">Action History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Pending Queue</CardTitle>
              <CardDescription>
                Items waiting for manager approval. Use filters to find specific items.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search title, owner..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Select value={deptFilter} onValueChange={setDeptFilter}>
                    <SelectTrigger className="w-[180px]">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        <SelectValue placeholder="Department" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={levelFilter} onValueChange={setLevelFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="1">Level 1</SelectItem>
                      <SelectItem value="2">Level 2</SelectItem>
                      <SelectItem value="3">Level 3</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="KPI">KPI</SelectItem>
                      <SelectItem value="ACTUAL">Actual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Pending With</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No pending items found matching filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{item.type}</Badge>
                              {item.title}
                            </div>
                          </TableCell>
                          <TableCell>{item.ownerName}</TableCell>
                          <TableCell>{item.department}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">L{item.currentLevel}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="font-medium text-xs">{item.currentApproverName}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[150px]">{item.currentApprover || 'N/A'}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                              onClick={() => setSelectedItem(item)}
                            >
                              <ShieldAlert className="h-3 w-3 mr-1" />
                              Proxy Action
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 text-xs text-muted-foreground text-center">
                Showing {filteredItems.length} of {pendingItems.length} items
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Proxy History</CardTitle>
              <CardDescription>Log of administrative interventions.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProxyHistoryTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Admin Proxy Action</DialogTitle>
            <DialogDescription>
              Acting on <strong>{selectedItem?.title}</strong> (Owner: {selectedItem?.ownerName})
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <AdminProxyActions
              entityType={selectedItem.type}
              entityId={selectedItem.entityId}
              staffUserId={selectedItem.owner}
              staffName={selectedItem.ownerName}
              currentLevel={selectedItem.currentLevel}
              currentApproverId={selectedItem.currentApprover}
              // Default to Change Request as user requested focus on this feature
              defaultTab="return"
              onActionComplete={() => {
                setSelectedItem(null)
                fetchPendingItems()
                // Also refresh history if that tab is active (we can add a refresh trigger later)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ProxyHistoryTable() {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/proxy/history')
      const data = await res.json()
      if (data.success) {
        setHistory(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch history', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={fetchHistory} disabled={loading}>
          <RefreshCw className={`h-3 w-3 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Log
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Performed By</TableHead>
              <TableHead>Target Entity</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No history found.
                </TableCell>
              </TableRow>
            ) : (
              history.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-xs">
                    {new Date(item.performedAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      item.actionType === 'RETURN_TO_STAFF' ? 'border-orange-500 text-orange-700 bg-orange-50' :
                        item.actionType === 'APPROVE_AS_MANAGER' ? 'border-green-500 text-green-700 bg-green-50' :
                          'border-blue-500 text-blue-700 bg-blue-50'
                    }>
                      {item.actionType.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {item.performer?.name || item.performedBy}
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {item.entityType} <span className="text-muted-foreground">ID: ...{item.entityId.substring(0, 5)}</span>
                  </TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate" title={item.reason}>
                    {item.reason}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
