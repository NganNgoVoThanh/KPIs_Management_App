"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, Building2, Settings, FileText, Calendar, Shield, Database, Trash2, RefreshCw, CheckCircle, XCircle, AlertTriangle, BarChart3 } from "lucide-react"
import { authenticatedFetch } from "@/lib/api-client"
import { useToast } from "@/components/ui/use-toast"
import type { User, OrgUnit, Cycle } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CyclesManager } from "@/components/admin/cycles-manager"

// Mock data with proper types
// Mock data removed (mockUsers)

// Mock data removed (mockOrgUnits, mockCycles)

interface DebugInfo {
  summary: {
    totalKpis: number
    waitingLineManager: number
    totalApprovals: number
    pendingApprovals: number
  }
  kpis: any[]
  approvals: any[]
  mismatchCheck: {
    kpisWaitingWithoutApproval: any[]
    approvalsWithoutKpi: any[]
  }
}

interface ResetResult {
  success: boolean
  results?: {
    kpisDeleted: number
    approvalsDeleted: number
    notificationsDeleted: number
  }
  error?: string
}

export default function AdminPage() {
  const { toast } = useToast()
  // Default to debug or org-units since we removed generic users tab
  const [activeTab, setActiveTab] = useState("debug")
  const [loading, setLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [resetResult, setResetResult] = useState<ResetResult | null>(null)
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([])
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [showOrgDialog, setShowOrgDialog] = useState(false)
  const [newOrgUnit, setNewOrgUnit] = useState({
    name: "",
    type: "DEPARTMENT",
    parentId: "null" // "null" string to handle Select value
  })

  // Reusable fetch function
  const fetchOrgUnits = async () => {
    try {
      const res = await authenticatedFetch('/api/org-units')
      const data = await res.json()
      if (data.success) setOrgUnits(data.data)
    } catch (error) {
      console.error("Failed to fetch org units", error)
    }
  }

  const fetchCycles = async () => {
    try {
      const res = await authenticatedFetch('/api/cycles')
      const data = await res.json()
      if (data.success) {
        if (Array.isArray(data.data)) setCycles(data.data)
        else if (Array.isArray(data)) setCycles(data)
      }
    } catch (error) {
      console.error("Failed to fetch cycles", error)
    }
  }

  useEffect(() => {
    fetchOrgUnits()
    fetchCycles()
  }, [])

  const handleCreateOrgUnit = async () => {
    if (!newOrgUnit.name) {
      toast({
        title: "Validation Error",
        description: "Organization Name is required",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const payload = {
        name: newOrgUnit.name,
        type: newOrgUnit.type,
        parentId: newOrgUnit.parentId === "null" ? null : newOrgUnit.parentId
      }

      const res = await authenticatedFetch('/api/org-units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (data.success) {
        toast({ title: "Success", description: "Organization Unit created successfully" })
        setShowOrgDialog(false)
        setNewOrgUnit({ name: "", type: "DEPARTMENT", parentId: "null" })
        fetchOrgUnits() // Reload list
      } else {
        throw new Error(data.error || "Failed to create")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const loadDebugInfo = async () => {
    setLoading(true)
    try {
      const response = await authenticatedFetch('/api/debug/approvals')
      const data = await response.json()

      if (data.success) {
        setDebugInfo(data.debug)
        toast({
          title: 'Debug info loaded',
          description: 'Successfully loaded system diagnostics',
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to load debug info',
        })
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to load debug info',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResetData = async (options: { kpis?: boolean; approvals?: boolean; notifications?: boolean }) => {
    if (!confirm('⚠️ Are you sure you want to reset data? This will:\n\n' +
      (options.kpis !== false ? '- Reset all KPIs to DRAFT status\n' : '') +
      (options.approvals !== false ? '- Cancel all pending approvals\n' : '') +
      (options.notifications !== false ? '- Soft delete all notifications\n' : '') +
      '\nThis action cannot be undone!')) {
      return
    }

    setLoading(true)
    setResetResult(null)

    try {
      const params = new URLSearchParams()
      if (options.kpis === false) params.append('kpis', 'false')
      if (options.approvals === false) params.append('approvals', 'false')
      if (options.notifications === false) params.append('notifications', 'false')

      const url = `/api/debug/reset-data${params.toString() ? '?' + params.toString() : ''}`

      const response = await authenticatedFetch(url, { method: 'POST' })
      const data = await response.json()

      setResetResult(data)

      if (data.success) {
        toast({
          title: 'Success',
          description: `Reset complete! ${data.results.kpisDeleted} KPIs, ${data.results.approvalsDeleted} approvals, ${data.results.notificationsDeleted} notifications`,
        })
        // Reload debug info after reset
        setTimeout(loadDebugInfo, 1000)
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to reset data',
        })
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to reset data',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">System Administration</h1>
          <p className="text-muted-foreground mt-1">Manage users, organization structure, and system settings</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="debug" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Debug Tools
            </TabsTrigger>
            {/* Users Tab Removed - Use /admin/users instead */}
            <TabsTrigger value="org-units" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Org Units
            </TabsTrigger>
            <TabsTrigger value="cycles" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Cycles
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="debug" className="space-y-6">
            <h2 className="text-xl font-semibold">Debug & Testing Tools</h2>

            {/* Reset Data Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Reset Test Data
                </CardTitle>
                <CardDescription>
                  Reset data to test approval workflows from scratch. Choose what to reset below.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> These actions cannot be undone. Make sure you have backups if needed.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    onClick={() => handleResetData({ kpis: true, approvals: true, notifications: true })}
                    disabled={loading}
                    variant="destructive"
                    className="h-auto py-4 flex-col items-start"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      <span className="font-semibold">Reset Everything</span>
                    </div>
                    <span className="text-xs font-normal opacity-90">
                      KPIs + Approvals + Notifications
                    </span>
                  </Button>

                  <Button
                    onClick={() => handleResetData({ kpis: true, approvals: true, notifications: false })}
                    disabled={loading}
                    variant="outline"
                    className="h-auto py-4 flex-col items-start"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4" />
                      <span className="font-semibold">KPIs & Approvals</span>
                    </div>
                    <span className="text-xs font-normal text-muted-foreground">
                      Keep notifications intact
                    </span>
                  </Button>

                  <Button
                    onClick={() => handleResetData({ kpis: false, approvals: false, notifications: true })}
                    disabled={loading}
                    variant="outline"
                    className="h-auto py-4 flex-col items-start"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4" />
                      <span className="font-semibold">Notifications Only</span>
                    </div>
                    <span className="text-xs font-normal text-muted-foreground">
                      Clear all notifications
                    </span>
                  </Button>
                </div>

                {resetResult && (
                  <Alert className={resetResult.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
                    {resetResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription>
                      {resetResult.success ? (
                        <div className="space-y-2">
                          <p className="font-semibold text-green-700">Reset completed successfully!</p>
                          <div className="text-sm text-green-600 space-y-1">
                            <div>• KPIs reset to DRAFT: <strong>{resetResult.results?.kpisDeleted}</strong></div>
                            <div>• Approvals cancelled: <strong>{resetResult.results?.approvalsDeleted}</strong></div>
                            <div>• Notifications deleted: <strong>{resetResult.results?.notificationsDeleted}</strong></div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-red-700">{resetResult.error || 'Failed to reset data'}</p>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* System Diagnostics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  System Diagnostics
                </CardTitle>
                <CardDescription>
                  View detailed information about KPIs, approvals, and potential issues
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={loadDebugInfo}
                  disabled={loading}
                  className="w-full"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Load System Diagnostics
                </Button>

                {debugInfo && (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">{debugInfo.summary.totalKpis}</div>
                          <p className="text-xs text-muted-foreground">Total KPIs</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold text-orange-600">{debugInfo.summary.waitingLineManager}</div>
                          <p className="text-xs text-muted-foreground">Waiting for Manager</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">{debugInfo.summary.totalApprovals}</div>
                          <p className="text-xs text-muted-foreground">Total Approvals</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold text-blue-600">{debugInfo.summary.pendingApprovals}</div>
                          <p className="text-xs text-muted-foreground">Pending Approvals</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Mismatch Warnings */}
                    {(debugInfo.mismatchCheck.kpisWaitingWithoutApproval.length > 0 ||
                      debugInfo.mismatchCheck.approvalsWithoutKpi.length > 0) && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <p className="font-semibold mb-2">Data Mismatch Detected!</p>
                            {debugInfo.mismatchCheck.kpisWaitingWithoutApproval.length > 0 && (
                              <p className="text-sm">
                                {debugInfo.mismatchCheck.kpisWaitingWithoutApproval.length} KPIs waiting but have no pending approval record
                              </p>
                            )}
                            {debugInfo.mismatchCheck.approvalsWithoutKpi.length > 0 && (
                              <p className="text-sm">
                                {debugInfo.mismatchCheck.approvalsWithoutKpi.length} pending approvals with no matching KPI
                              </p>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}

                    {/* KPIs Details */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">KPIs by Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {debugInfo.kpis.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No KPIs found</p>
                          ) : (
                            debugInfo.kpis.map((kpi: any) => (
                              <div key={kpi.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{kpi.title}</p>
                                  <p className="text-xs text-muted-foreground">Owner: {kpi.user?.email || 'N/A'}</p>
                                </div>
                                <Badge variant={
                                  kpi.status === 'APPROVED' ? 'default' :
                                    kpi.status === 'REJECTED' ? 'destructive' :
                                      kpi.status === 'DRAFT' ? 'secondary' :
                                        'outline'
                                }>
                                  {kpi.status}
                                </Badge>
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Approvals Details */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Pending Approvals</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {debugInfo.approvals.filter((a: any) => a.status === 'PENDING').length === 0 ? (
                            <p className="text-sm text-muted-foreground">No pending approvals</p>
                          ) : (
                            debugInfo.approvals.filter((a: any) => a.status === 'PENDING').map((approval: any) => (
                              <div key={approval.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div className="flex-1">
                                  <p className="font-medium text-sm">
                                    {approval.entity?.title || `Entity ${approval.entityId}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Approver: {approval.approver?.email || 'N/A'}
                                  </p>
                                </div>
                                <Badge>Level {approval.level}</Badge>
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Test Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>Approval Flow Test Instructions</CardTitle>
                <CardDescription>Follow these steps to test the complete approval workflow</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-3 text-sm">
                  <li>
                    <strong>Reset data</strong> using one of the buttons above
                  </li>
                  <li>
                    <strong>Login as STAFF</strong> (e.g., ngan.ngo@intersnack.com.vn)
                    <ul className="list-disc list-inside ml-6 mt-1 text-muted-foreground">
                      <li>Create a new KPI</li>
                      <li>Submit it for approval</li>
                      <li>Check status changes to WAITING_LINE_MGR</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Login as LINE_MANAGER</strong>
                    <ul className="list-disc list-inside ml-6 mt-1 text-muted-foreground">
                      <li>Go to Approvals page</li>
                      <li>Verify pending approval appears</li>
                      <li>Approve or Reject (Level 1)</li>
                    </ul>
                  </li>
                  <li>
                    <strong>If approved at Level 1, login as MANAGER</strong>
                    <ul className="list-disc list-inside ml-6 mt-1 text-muted-foreground">
                      <li>Go to Approvals page</li>
                      <li>Approve or Reject (Level 2)</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Check Notifications</strong> for all roles
                    <ul className="list-disc list-inside ml-6 mt-1 text-muted-foreground">
                      <li>STAFF should see approval/rejection notifications</li>
                      <li>Managers should see new approval requests</li>
                    </ul>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users TabContent Removed */}

          <TabsContent value="org-units" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Organization Structure</h2>
              <Button onClick={() => setShowOrgDialog(true)}>Add Org Unit</Button>
            </div>

            <div className="grid gap-4">
              {orgUnits.length === 0 ? <p className="text-muted-foreground p-4">No organizations found.</p> : orgUnits.map((unit) => (
                <Card key={unit.id}>
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{unit.name}</h3>
                      <p className="text-sm text-muted-foreground">Type: <Badge variant="outline">{unit.type}</Badge></p>
                    </div>
                    {unit.parent && (
                      <div className="text-xs text-muted-foreground text-right">
                        Parent: <br /> <strong>{unit.parent.name}</strong>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Create Org Unit Dialog */}
            <Dialog open={showOrgDialog} onOpenChange={setShowOrgDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Organization Unit</DialogTitle>
                  <DialogDescription>Create a new department, team, or division.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      placeholder="e.g. Marketing Dept"
                      value={newOrgUnit.name}
                      onChange={(e) => setNewOrgUnit({ ...newOrgUnit, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={newOrgUnit.type}
                        onValueChange={(val) => setNewOrgUnit({ ...newOrgUnit, type: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="COMPANY">Company</SelectItem>
                          <SelectItem value="DIVISION">Division</SelectItem>
                          <SelectItem value="DEPARTMENT">Department</SelectItem>
                          <SelectItem value="TEAM">Team</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Parent Unit</Label>
                      <Select
                        value={newOrgUnit.parentId}
                        onValueChange={(val) => setNewOrgUnit({ ...newOrgUnit, parentId: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="None (Top Level)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="null">None (Top Level)</SelectItem>
                          {orgUnits.map(org => (
                            <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowOrgDialog(false)}>Cancel</Button>
                  <Button onClick={handleCreateOrgUnit} disabled={loading}>
                    {loading ? "Creating..." : "Create Unit"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="cycles" className="space-y-4">
            <CyclesManager />
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">KPI Templates</h2>
              <Button>Create Template</Button>
            </div>

            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Template management coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Role Permissions</h2>
              <Button>Manage Permissions</Button>
            </div>

            <Card>
              <CardContent className="p-6 text-center">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Permission management coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <h2 className="text-xl font-semibold">System Settings</h2>

            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>Configure system-wide settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input id="company-name" defaultValue="Intersnack Vietnam" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Email Settings</CardTitle>
                  <CardDescription>Configure notification settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-server">SMTP Server</Label>
                    <Input id="smtp-server" placeholder="smtp.company.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="from-email">From Email</Label>
                    <Input id="from-email" placeholder="noreply@intersnack.com.vn" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}