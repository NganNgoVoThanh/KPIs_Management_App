"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { authService } from "@/lib/auth-service"
import { authenticatedFetch } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Calendar, Users, Target, BarChart3, Play, Pause, Loader2 } from "lucide-react"
import type { Cycle } from "@/lib/types"

export default function CyclesPage() {
  const [activeTab, setActiveTab] = useState("active")
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [updatingCycleId, setUpdatingCycleId] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newCycleName, setNewCycleName] = useState("")
  const [cycleType, setCycleType] = useState<'YEARLY' | 'SEMI_ANNUAL' | 'QUARTERLY' | 'MONTHLY'>('YEARLY')
  const [periodStart, setPeriodStart] = useState(() => {
    const year = new Date().getFullYear()
    return `${year}-01-01`
  })
  const [periodEnd, setPeriodEnd] = useState(() => {
    const year = new Date().getFullYear()
    return `${year}-12-31`
  })
  const [minKpis, setMinKpis] = useState(3)
  const [maxKpis, setMaxKpis] = useState(5)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    setUser(currentUser)
    loadCycles()
  }, [])

  const loadCycles = async () => {
    setLoading(true)
    try {
      const response = await authenticatedFetch('/api/cycles')
      const data = await response.json()

      if (data.success) {
        setCycles(data.data || [])
      } else {
        console.error('Failed to load cycles:', data.error)
        setCycles([])
      }
    } catch (error) {
      console.error('Error loading cycles:', error)
      setCycles([])
    } finally {
      setLoading(false)
    }
  }

  const handleActivateCycle = async (cycleId: string) => {
    if (!confirm('Activate this cycle? Users will be able to create KPIs.')) return

    setUpdatingCycleId(cycleId)
    try {
      const response = await authenticatedFetch(`/api/cycles/${cycleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert('Cycle activated successfully!')
        loadCycles()
      } else {
        alert(`Failed to activate: ${data.error}`)
      }
    } catch (error) {
      console.error('Error activating cycle:', error)
      alert('Failed to activate cycle')
    } finally {
      setUpdatingCycleId(null)
    }
  }

  const handleCloseCycle = async (cycleId: string) => {
    if (!confirm('Close this cycle? Users will no longer be able to create KPIs.')) return

    setUpdatingCycleId(cycleId)
    try {
      const response = await authenticatedFetch(`/api/cycles/${cycleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CLOSED' })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert('Cycle closed successfully!')
        loadCycles()
      } else {
        alert(`Failed to close: ${data.error}`)
      }
    } catch (error) {
      console.error('Error closing cycle:', error)
      alert('Failed to close cycle')
    } finally {
      setUpdatingCycleId(null)
    }
  }

  const handleCreateCycle = async () => {
    if (!newCycleName.trim()) {
      alert('Please enter a cycle name')
      return
    }

    if (!periodStart || !periodEnd) {
      alert('Please select start and end dates')
      return
    }

    if (new Date(periodEnd) <= new Date(periodStart)) {
      alert('End date must be after start date')
      return
    }

    if (minKpis < 1 || maxKpis < minKpis) {
      alert('Please enter valid KPI limits (Min >= 1, Max >= Min)')
      return
    }

    setCreating(true)
    try {
      const response = await authenticatedFetch('/api/cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCycleName,
          type: cycleType,
          periodStart: new Date(periodStart).toISOString(),
          periodEnd: new Date(periodEnd).toISOString(),
          settings: {
            minKpisPerUser: minKpis,
            maxKpisPerUser: maxKpis
          }
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert('Cycle created successfully!')
        setShowCreateDialog(false)
        // Reset form
        setNewCycleName('')
        const year = new Date().getFullYear()
        setPeriodStart(`${year}-01-01`)
        setPeriodEnd(`${year}-12-31`)
        setCycleType('YEARLY')
        setMinKpis(3)
        setMaxKpis(5)
        loadCycles()
      } else {
        alert(`Failed to create: ${data.error}`)
      }
    } catch (error) {
      console.error('Error creating cycle:', error)
      alert('Failed to create cycle')
    } finally {
      setCreating(false)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'default'
      case 'CLOSED':
        return 'secondary'
      case 'DRAFT':
        return 'outline'
      case 'ARCHIVED':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Active'
      case 'CLOSED':
        return 'Closed'
      case 'DRAFT':
        return 'Draft'
      case 'ARCHIVED':
        return 'Archived'
      default:
        return status
    }
  }

  const filteredCycles = cycles.filter(cycle => {
    switch (activeTab) {
      case 'active':
        return cycle.status === 'ACTIVE'
      case 'closed':
        return cycle.status === 'CLOSED'
      case 'draft':
        return cycle.status === 'DRAFT'
      case 'all':
        return true
      default:
        return true
    }
  })

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <div className="space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Performance Review Cycles</h1>
              <p className="text-muted-foreground">
                Manage performance evaluation cycles
              </p>
            </div>
            {user?.role === 'ADMIN' && (
              <Button onClick={() => setShowCreateDialog(true)} className="bg-red-600 hover:bg-red-700">
                <Plus className="mr-2 h-4 w-4" />
                Create New Cycle
              </Button>
            )}
          </div>

          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cycles</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cycles.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {cycles.filter(c => c.status === 'ACTIVE').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {cycles.filter(c => c.status === 'CLOSED').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Drafts</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {cycles.filter(c => c.status === 'DRAFT').length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="closed">Closed</TabsTrigger>
              <TabsTrigger value="draft">Drafts</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {filteredCycles.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No cycles yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      {activeTab === 'active' && 'No active cycles available.'}
                      {activeTab === 'closed' && 'No closed cycles available.'}
                      {activeTab === 'draft' && 'No draft cycles available.'}
                      {activeTab === 'all' && 'No cycles have been created yet.'}
                    </p>
                    <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Cycle
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredCycles.map((cycle) => (
                    <Card key={cycle.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{cycle.name}</CardTitle>
                          <Badge variant={getStatusBadgeVariant(cycle.status)}>
                            {getStatusLabel(cycle.status)}
                          </Badge>
                        </div>
                        <CardDescription>
                          {cycle.type === 'YEARLY' && 'Annual Cycle'}
                          {cycle.type === 'SEMI_ANNUAL' && 'Semi-Annual Cycle'}
                          {cycle.type === 'QUARTERLY' && 'Quarterly Cycle'}
                          {cycle.type === 'MONTHLY' && 'Monthly Cycle'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="mr-2 h-4 w-4" />
                            {new Date(cycle.periodStart).toLocaleDateString('en-US')} - {new Date(cycle.periodEnd).toLocaleDateString('en-US')}
                          </div>
                          {cycle.settings && (
                            <div className="text-sm text-muted-foreground">
                              <div>Min KPIs: {cycle.settings.minKpisPerUser || 'N/A'}</div>
                              <div>Max KPIs: {cycle.settings.maxKpisPerUser || 'N/A'}</div>
                            </div>
                          )}
                        </div>

                        {user?.role === 'ADMIN' && (
                          <div className="flex items-center gap-2 mt-4">
                            {cycle.status === 'DRAFT' && (
                              <Button
                                onClick={() => handleActivateCycle(cycle.id)}
                                disabled={updatingCycleId === cycle.id}
                                className="w-full bg-green-600 hover:bg-green-700"
                                size="sm"
                              >
                                {updatingCycleId === cycle.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Play className="h-4 w-4 mr-2" />
                                    Activate
                                  </>
                                )}
                              </Button>
                            )}
                            {cycle.status === 'ACTIVE' && (
                              <Button
                                onClick={() => handleCloseCycle(cycle.id)}
                                disabled={updatingCycleId === cycle.id}
                                variant="outline"
                                className="w-full"
                                size="sm"
                              >
                                {updatingCycleId === cycle.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Pause className="h-4 w-4 mr-2" />
                                    Close
                                  </>
                                )}
                              </Button>
                            )}
                            {cycle.status === 'CLOSED' && (
                              <Button
                                onClick={() => handleActivateCycle(cycle.id)}
                                disabled={updatingCycleId === cycle.id}
                                className="w-full bg-red-600 hover:bg-red-700"
                                size="sm"
                              >
                                {updatingCycleId === cycle.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Play className="h-4 w-4 mr-2" />
                                    Re-activate
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground mt-3">
                          Created: {new Date(cycle.createdAt).toLocaleDateString('en-US')}
                        </div>
                      </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Cycle Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateDialog(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Create New Cycle</h2>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {/* Cycle Name */}
              <div>
                <label className="block text-sm font-medium mb-2">Cycle Name *</label>
                <input
                  type="text"
                  value={newCycleName}
                  onChange={(e) => setNewCycleName(e.target.value)}
                  placeholder="e.g., Q1 2025 Performance Review"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  disabled={creating}
                />
              </div>

              {/* Cycle Type */}
              <div>
                <label className="block text-sm font-medium mb-2">Cycle Type *</label>
                <select
                  value={cycleType}
                  onChange={(e) => setCycleType(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  disabled={creating}
                >
                  <option value="YEARLY">Yearly (Annual)</option>
                  <option value="SEMI_ANNUAL">Semi-Annual (6 months)</option>
                  <option value="QUARTERLY">Quarterly (3 months)</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>

              {/* Period Start */}
              <div>
                <label className="block text-sm font-medium mb-2">Period Start *</label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  disabled={creating}
                />
              </div>

              {/* Period End */}
              <div>
                <label className="block text-sm font-medium mb-2">Period End *</label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  disabled={creating}
                />
              </div>

              {/* KPI Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Min KPIs *</label>
                  <input
                    type="number"
                    value={minKpis}
                    onChange={(e) => setMinKpis(parseInt(e.target.value) || 0)}
                    min="1"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    disabled={creating}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Max KPIs *</label>
                  <input
                    type="number"
                    value={maxKpis}
                    onChange={(e) => setMaxKpis(parseInt(e.target.value) || 0)}
                    min={minKpis}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    disabled={creating}
                  />
                </div>
              </div>

              {/* Info Note */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                <p className="font-medium mb-1">ℹ️ Note:</p>
                <p>Cycle will be created with status <strong>DRAFT</strong>. You need to activate it later for users to create KPIs.</p>
              </div>
            </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false)
                    // Reset all fields
                    setNewCycleName('')
                    const year = new Date().getFullYear()
                    setPeriodStart(`${year}-01-01`)
                    setPeriodEnd(`${year}-12-31`)
                    setCycleType('YEARLY')
                    setMinKpis(3)
                    setMaxKpis(5)
                  }}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateCycle}
                  disabled={creating || !newCycleName.trim()}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Cycle'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}