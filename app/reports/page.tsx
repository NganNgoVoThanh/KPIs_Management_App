"use client"

import { useState, useEffect } from "react"
import type { User, ReportFilter, KpiDefinition } from "@/lib/types"
import { storageService } from "@/lib/storage-service"
import { authService } from "@/lib/auth-service"

// Mock reporting utils since they might not exist yet
const generateReportData = (filters: ReportFilter) => {
  return {
    summary: {
      totalKpis: 0,
      completedKpis: 0,
      averageScore: 0,
      participationRate: 0
    },
    departmentBreakdown: [],
    topPerformers: [],
    improvements: []
  }
}

const exportToExcel = async (data: any, filename: string) => {
  console.log('Exporting to Excel:', filename, data)
  // Mock implementation
  alert('Export functionality will be implemented')
}

const getReportPermissions = (user: User) => {
  return {
    canViewAll: user.role === 'HR' || user.role === 'ADMIN' || user.role === 'BOD',
    canExport: user.role === 'HR' || user.role === 'ADMIN',
    canViewDepartment: user.role === 'HEAD_OF_DEPT' || user.role === 'LINE_MANAGER'
  }
}

// Mock components since they might not exist yet
const ReportFilters = ({ onFilterChange, permissions }: any) => (
  <div className="p-4 border rounded-lg">
    <h3 className="font-semibold mb-4">Bộ lọc báo cáo</h3>
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Chu kỳ</label>
        <select className="w-full p-2 border rounded" onChange={(e) => onFilterChange({ cycleId: e.target.value })}>
          <option value="">Chọn chu kỳ</option>
          <option value="all">Tất cả</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Phòng ban</label>
        <select className="w-full p-2 border rounded" onChange={(e) => onFilterChange({ department: e.target.value })}>
          <option value="">Chọn phòng ban</option>
          <option value="all">Tất cả</option>
        </select>
      </div>
    </div>
  </div>
)

const ReportDashboard = ({ data, permissions }: any) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="p-4 border rounded-lg">
        <h4 className="font-semibold">Tổng KPIs</h4>
        <p className="text-2xl font-bold">{data.summary.totalKpis}</p>
      </div>
      <div className="p-4 border rounded-lg">
        <h4 className="font-semibold">Đã hoàn thành</h4>
        <p className="text-2xl font-bold">{data.summary.completedKpis}</p>
      </div>
      <div className="p-4 border rounded-lg">
        <h4 className="font-semibold">Điểm trung bình</h4>
        <p className="text-2xl font-bold">{data.summary.averageScore.toFixed(1)}</p>
      </div>
      <div className="p-4 border rounded-lg">
        <h4 className="font-semibold">Tỷ lệ tham gia</h4>
        <p className="text-2xl font-bold">{data.summary.participationRate.toFixed(1)}%</p>
      </div>
    </div>
    
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-4">Báo cáo theo phòng ban</h3>
      {data.departmentBreakdown.length === 0 ? (
        <p className="text-gray-500">Chưa có dữ liệu báo cáo</p>
      ) : (
        <div className="space-y-2">
          {data.departmentBreakdown.map((dept: any, index: number) => (
            <div key={index} className="flex justify-between p-2 bg-gray-50 rounded">
              <span>{dept.name}</span>
              <span className="font-semibold">{dept.avgScore.toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)

export default function ReportsPage() {
  const [filters, setFilters] = useState<ReportFilter>({
    cycleId: '',
    department: '',
    dateRange: {
      start: '',
      end: ''
    }
  })
  
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [kpiDefinitions, setKpiDefinitions] = useState<KpiDefinition[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get current user
        const user = authService.getCurrentUser()
        setCurrentUser(user)
        
        // Load data from storage service
        const allKpis = storageService.getKpiDefinitions()
        setKpiDefinitions(allKpis)
        
        // Mock users data since we don't have a user service
        const mockUserData: User[] = [
          {
            id: 'user-1',
            email: 'staff@intersnack.com.vn',
            name: 'Nhân viên mẫu',
            role: 'STAFF',
            orgUnitId: 'org-rnd',
            status: 'ACTIVE'
          }
        ]
        setUsers(mockUserData)
        
        // Generate initial report data
        const data = generateReportData(filters)
        setReportData(data)
        
      } catch (error) {
        console.error('Error loading report data:', error)
        setReportData({
          summary: { totalKpis: 0, completedKpis: 0, averageScore: 0, participationRate: 0 },
          departmentBreakdown: [],
          topPerformers: [],
          improvements: []
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleFilterChange = (newFilters: Partial<ReportFilter>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)
    
    // Regenerate report data with new filters
    const data = generateReportData(updatedFilters)
    setReportData(data)
  }

  const handleExport = async () => {
    if (reportData) {
      await exportToExcel(reportData, `kpi-report-${new Date().toISOString().split('T')[0]}.xlsx`)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold mb-4">Cần đăng nhập</h2>
          <p className="text-gray-600">Vui lòng đăng nhập để xem báo cáo</p>
        </div>
      </div>
    )
  }

  const permissions = getReportPermissions(currentUser)

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Báo cáo & Phân tích</h1>
            <p className="text-muted-foreground">
              Theo dõi hiệu suất và xu hướng KPI
            </p>
          </div>
          {permissions.canExport && (
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Xuất Excel
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters */}
          <div className="lg:col-span-1">
            <ReportFilters
              onFilterChange={handleFilterChange}
              permissions={permissions}
            />
          </div>

          {/* Dashboard */}
          <div className="lg:col-span-3">
            {reportData ? (
              <ReportDashboard
                data={reportData}
                permissions={permissions}
              />
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-600">Không có dữ liệu báo cáo</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}