"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  Target,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  BarChart3,
  Award,
  FileText,
  Eye,
  Edit,
  Trash2,
  Download,
  RefreshCw,
  ArrowRight,
  TrendingDown
} from "lucide-react"
import { authService } from "@/lib/auth-service"
import { storageService } from "@/lib/storage-service"
import type { KpiDefinition } from "@/lib/types"

export default function KpisPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [kpis, setKpis] = useState<KpiDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [showCreatedAlert, setShowCreatedAlert] = useState(false)

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) {
      router.push("/login")
      return
    }
    setUser(currentUser)
    loadKpis(currentUser.id)
    
    if (searchParams?.get("created") === "true") {
      setShowCreatedAlert(true)
      setTimeout(() => setShowCreatedAlert(false), 5000)
    }
  }, [router, searchParams])

  const loadKpis = (userId: string) => {
    setLoading(true)
    try {
      const userKpis = storageService.getKpiDefinitions({ userId })
      setKpis(userKpis)
    } catch (error) {
      console.error("Error loading KPIs:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "DRAFT": return <FileText className="h-4 w-4 text-gray-500" />
      case "SUBMITTED": return <Clock className="h-4 w-4 text-blue-500" />
      case "PENDING_LM": return <Clock className="h-4 w-4 text-yellow-500" />
      case "PENDING_HOD": return <Clock className="h-4 w-4 text-yellow-600" />
      case "PENDING_BOD": return <Clock className="h-4 w-4 text-orange-500" />
      case "APPROVED": return <CheckCircle className="h-4 w-4 text-green-500" />
      case "REJECTED": return <XCircle className="h-4 w-4 text-red-500" />
      case "LOCKED_GOALS": return <Award className="h-4 w-4 text-blue-600" />
      default: return <AlertCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT": return "bg-gray-100 text-gray-700 border-gray-300"
      case "SUBMITTED": return "bg-blue-100 text-blue-700 border-blue-300"
      case "PENDING_LM": return "bg-yellow-100 text-yellow-700 border-yellow-300"
      case "PENDING_HOD": return "bg-yellow-100 text-yellow-800 border-yellow-400"
      case "PENDING_BOD": return "bg-orange-100 text-orange-700 border-orange-300"
      case "APPROVED": return "bg-green-100 text-green-700 border-green-300"
      case "REJECTED": return "bg-red-100 text-red-700 border-red-300"
      case "LOCKED_GOALS": return "bg-blue-100 text-blue-800 border-blue-400"
      default: return "bg-gray-100 text-gray-600 border-gray-300"
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Business Objective": return "border-l-red-500 bg-red-50/50"
      case "Individual Development": return "border-l-green-500 bg-green-50/50"
      case "Core Values": return "border-l-purple-500 bg-purple-50/50"
      default: return "border-l-gray-500 bg-gray-50/50"
    }
  }

  const filteredKpis = kpis.filter(kpi => {
    const matchesSearch = kpi.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         kpi.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || kpi.status === statusFilter
    const matchesCategory = categoryFilter === "all" || kpi.category === categoryFilter
    return matchesSearch && matchesStatus && matchesCategory
  })

  const kpiStats = {
    total: kpis.length,
    draft: kpis.filter(k => k.status === "DRAFT").length,
    pending: kpis.filter(k => k.status.includes("PENDING") || k.status === "SUBMITTED").length,
    approved: kpis.filter(k => k.status === "APPROVED" || k.status === "LOCKED_GOALS").length,
    rejected: kpis.filter(k => k.status === "REJECTED").length,
    totalWeight: kpis.reduce((sum, k) => sum + (k.weight || 0), 0),
    avgSmartScore: kpis.length > 0 ? Math.round(kpis.reduce((sum, k) => sum + (k.smartScore || 0), 0) / kpis.length) : 0
  }

  const handleCreateNew = () => {
    router.push("/kpis/create")
  }

  const handleViewKpi = (kpiId: string) => {
    router.push(`/kpis/${kpiId}`)
  }

  const handleEditKpi = (kpiId: string) => {
    router.push(`/kpis/${kpiId}/edit`)
  }

  const handleDeleteKpi = (kpiId: string) => {
    if (confirm("Are you sure you want to delete this KPI? This action cannot be undone.")) {
      try {
        storageService.deleteKpiDefinition(kpiId)
        if (user) loadKpis(user.id)
      } catch (error) {
        console.error("Error deleting KPI:", error)
        alert("Failed to delete KPI. Please try again.")
      }
    }
  }

  const handleRefresh = () => {
    if (user) loadKpis(user.id)
  }

  const handleExport = () => {
    const exportData = {
      user: { name: user.name, department: user.department },
      exportDate: new Date().toISOString(),
      totalKPIs: kpis.length,
      totalWeight: kpiStats.totalWeight,
      kpis: kpis.map(kpi => ({
        title: kpi.title,
        description: kpi.description,
        target: kpi.target,
        unit: kpi.unit,
        weight: kpi.weight,
        category: kpi.category,
        status: kpi.status,
        type: kpi.type
      }))
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kpis-${user.name}-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-red-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your KPIs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50">
      <div className="container mx-auto py-6 px-4">
        {/* Success Alert */}
        {showCreatedAlert && (
          <Alert className="mb-6 border-2 border-green-400 bg-green-50 shadow-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <AlertDescription className="text-green-800 font-medium">
              <strong>Success!</strong> Your KPIs have been created and submitted for approval.
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-red-900 mb-2 flex items-center gap-3">
                <Target className="h-10 w-10 text-red-600" />
                My KPIs
              </h1>
              <p className="text-lg text-gray-600">
                Manage and track your Key Performance Indicators for {new Date().getFullYear()}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleRefresh}
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              
              <Button
                variant="outline"
                onClick={handleExport}
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>

              <Button
                onClick={handleCreateNew}
                className="bg-red-600 hover:bg-red-700 text-white shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create KPIs
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card className="bg-white border-2 border-red-300 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-red-600">{kpiStats.total}</div>
              <div className="text-sm text-gray-600 font-medium">Total KPIs</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-yellow-300 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-yellow-600">{kpiStats.pending}</div>
              <div className="text-sm text-gray-600 font-medium">Pending</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-green-300 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{kpiStats.approved}</div>
              <div className="text-sm text-gray-600 font-medium">Approved</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-gray-300 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-gray-600">{kpiStats.draft}</div>
              <div className="text-sm text-gray-600 font-medium">Draft</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-purple-300 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">{kpiStats.totalWeight.toFixed(0)}%</div>
              <div className="text-sm text-gray-600 font-medium">Total Weight</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-blue-300 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{kpiStats.avgSmartScore}</div>
              <div className="text-sm text-gray-600 font-medium">Avg SMART</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 bg-white border-2 border-red-200 shadow-md">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Search KPIs by title or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-2 border-red-200 focus:border-red-400 h-11"
                  />
                </div>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[220px] border-2 border-red-200 focus:border-red-400 h-11">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SUBMITTED">Submitted</SelectItem>
                  <SelectItem value="PENDING_LM">Pending LM</SelectItem>
                  <SelectItem value="PENDING_HOD">Pending HoD</SelectItem>
                  <SelectItem value="PENDING_BOD">Pending BOD</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="LOCKED_GOALS">Locked Goals</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-[220px] border-2 border-red-200 focus:border-red-400 h-11">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Business Objective">Business Objective</SelectItem>
                  <SelectItem value="Individual Development">Individual Development</SelectItem>
                  <SelectItem value="Core Values">Core Values</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(searchTerm || statusFilter !== "all" || categoryFilter !== "all") && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-red-200">
                <Filter className="h-4 w-4 text-red-600" />
                <span className="text-sm text-gray-700 font-medium">
                  Showing {filteredKpis.length} of {kpis.length} KPIs
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("")
                    setStatusFilter("all")
                    setCategoryFilter("all")
                  }}
                  className="h-7 px-3 text-xs text-red-600 hover:bg-red-50"
                >
                  Clear All Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* KPI List */}
        {filteredKpis.length === 0 ? (
          <Card className="bg-white border-2 border-red-200 shadow-md">
            <CardContent className="p-12 text-center">
              <Target className="h-20 w-20 text-red-300 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-gray-700 mb-2">
                {kpis.length === 0 ? "No KPIs Created Yet" : "No KPIs Match Your Filters"}
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {kpis.length === 0 
                  ? "Create your first set of KPIs to start tracking your performance goals."
                  : "Try adjusting your search terms or filters to find the KPIs you're looking for."
                }
              </p>
              {kpis.length === 0 && (
                <Button onClick={handleCreateNew} className="bg-red-600 hover:bg-red-700 text-white shadow-lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First KPIs
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredKpis.map((kpi) => (
              <Card 
                key={kpi.id} 
                className={`bg-white border-l-4 transition-all hover:shadow-xl ${getCategoryColor(kpi.category || "")}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl font-bold text-gray-900 line-clamp-1">
                          {kpi.title}
                        </CardTitle>
                      </div>
                      
                      {kpi.description && (
                        <CardDescription className="text-gray-600 line-clamp-2 text-base">
                          {kpi.description}
                        </CardDescription>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      <Badge className={`${getStatusColor(kpi.status)} flex items-center gap-1 border-2 px-3 py-1`}>
                        {getStatusIcon(kpi.status)}
                        <span className="text-xs font-semibold">
                          {kpi.status.replace(/_/g, ' ')}
                        </span>
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
                    <div className="bg-red-50 p-3 rounded-lg text-center border border-red-200">
                      <div className="text-xl font-bold text-red-600">
                        {kpi.target} {kpi.unit}
                      </div>
                      <div className="text-xs text-gray-600 font-medium">Target</div>
                    </div>

                    <div className="bg-purple-50 p-3 rounded-lg text-center border border-purple-200">
                      <div className="text-xl font-bold text-purple-600">
                        {kpi.weight}%
                      </div>
                      <div className="text-xs text-gray-600 font-medium">Weight</div>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg text-center border border-blue-200">
                      <div className="text-xl font-bold text-blue-600">
                        Type {kpi.type === 'QUANT_HIGHER_BETTER' ? '1' : 
                              kpi.type === 'QUANT_LOWER_BETTER' ? '2' :
                              kpi.type === 'BOOLEAN' ? '3' : '4'}
                      </div>
                      <div className="text-xs text-gray-600 font-medium">KPI Type</div>
                    </div>

                    <div className="bg-green-50 p-3 rounded-lg text-center border border-green-200">
                      <div className="text-xl font-bold text-green-600">
                        {kpi.smartScore || 0}
                      </div>
                      <div className="text-xs text-gray-600 font-medium">SMART Score</div>
                    </div>

                    <div className="bg-orange-50 p-3 rounded-lg text-center border border-orange-200">
                      <div className="text-xl font-bold text-orange-600">
                        {kpi.frequency || 'Quarterly'}
                      </div>
                      <div className="text-xs text-gray-600 font-medium">Frequency</div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg text-center border border-gray-200">
                      <div className="text-xl font-bold text-gray-600">
                        {kpi.priority || 'Medium'}
                      </div>
                      <div className="text-xs text-gray-600 font-medium">Priority</div>
                    </div>
                  </div>

                  {/* SMART Score Progress */}
                  {kpi.smartScore && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-700 font-medium">SMART Quality</span>
                        <span className={`font-bold ${
                          kpi.smartScore >= 80 ? 'text-green-600' :
                          kpi.smartScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {kpi.smartScore}/100
                        </span>
                      </div>
                      <Progress 
                        value={kpi.smartScore} 
                        className={`h-2 ${
                          kpi.smartScore >= 80 ? '[&>div]:bg-green-600' :
                          kpi.smartScore >= 60 ? '[&>div]:bg-yellow-600' : '[&>div]:bg-red-600'
                        }`}
                      />
                    </div>
                  )}

                  {/* Additional Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-4 bg-gray-50 p-3 rounded-lg">
                    {kpi.category && (
                      <div>
                        <span className="font-semibold text-gray-700">Category:</span>
                        <span className="ml-2 text-gray-600">{kpi.category}</span>
                      </div>
                    )}
                    
                    {kpi.dataSource && (
                      <div>
                        <span className="font-semibold text-gray-700">Data Source:</span>
                        <span className="ml-2 text-gray-600">{kpi.dataSource}</span>
                      </div>
                    )}
                    
                    {kpi.createdAt && (
                      <div>
                        <span className="font-semibold text-gray-700">Created:</span>
                        <span className="ml-2 text-gray-600">
                          {new Date(kpi.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    
                    {kpi.submittedAt && (
                      <div>
                        <span className="font-semibold text-gray-700">Submitted:</span>
                        <span className="ml-2 text-gray-600">
                          {new Date(kpi.submittedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t-2 border-gray-200">
                    <div className="text-xs text-gray-500 font-mono">
                      ID: {kpi.id.slice(-8)}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewKpi(kpi.id)}
                        className="text-gray-600 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-300"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      
                      {(kpi.status === 'DRAFT' || kpi.status === 'REJECTED') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditKpi(kpi.id)}
                          className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-300"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      )}
                      
                      {(kpi.status === 'DRAFT' || kpi.status === 'REJECTED') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteKpi(kpi.id)}
                          className="text-gray-600 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-300"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Bottom Action Bar */}
        {kpis.length > 0 && (
          <Card className="mt-8 bg-gradient-to-r from-red-100 to-orange-100 border-2 border-red-300 shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-red-900 mb-1 text-lg">Ready to create more KPIs?</h3>
                  <p className="text-sm text-red-700">
                    Keep track of all your performance goals in one place and achieve excellence.
                  </p>
                </div>
                <Button
                  onClick={handleCreateNew}
                  className="bg-red-600 hover:bg-red-700 text-white shadow-lg px-6 py-3 text-base"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create New KPIs
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}