"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Calendar, Users, Target, BarChart3 } from "lucide-react"
import { storageService } from "@/lib/storage-service"
import type { Cycle } from "@/lib/types"

export default function CyclesPage() {
  const [activeTab, setActiveTab] = useState("active")
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load cycles from storage service
    const loadCycles = () => {
      try {
        const allCycles = storageService.getCycles()
        setCycles(allCycles)
      } catch (error) {
        console.error('Error loading cycles:', error)
        // Fallback to empty array
        setCycles([])
      } finally {
        setLoading(false)
      }
    }

    loadCycles()
  }, [])

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
        return 'Đang hoạt động'
      case 'CLOSED':
        return 'Đã đóng'
      case 'DRAFT':
        return 'Bản nháp'
      case 'ARCHIVED':
        return 'Đã lưu trữ'
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
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quản lý chu kỳ đánh giá</h1>
            <p className="text-muted-foreground">
              Tạo và quản lý các chu kỳ đánh giá hiệu suất
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Tạo chu kỳ mới
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng chu kỳ</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cycles.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đang hoạt động</CardTitle>
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
              <CardTitle className="text-sm font-medium">Đã hoàn thành</CardTitle>
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
              <CardTitle className="text-sm font-medium">Bản nháp</CardTitle>
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
            <TabsTrigger value="active">Đang hoạt động</TabsTrigger>
            <TabsTrigger value="closed">Đã đóng</TabsTrigger>
            <TabsTrigger value="draft">Bản nháp</TabsTrigger>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredCycles.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Chưa có chu kỳ nào</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {activeTab === 'active' && 'Chưa có chu kỳ đang hoạt động.'}
                    {activeTab === 'closed' && 'Chưa có chu kỳ nào đã đóng.'}
                    {activeTab === 'draft' && 'Chưa có chu kỳ nào ở trạng thái bản nháp.'}
                    {activeTab === 'all' && 'Chưa có chu kỳ nào được tạo.'}
                  </p>
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Tạo chu kỳ đầu tiên
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
                        {cycle.type === 'YEARLY' && 'Chu kỳ hàng năm'}
                        {cycle.type === 'SEMI_ANNUAL' && 'Chu kỳ 6 tháng'}
                        {cycle.type === 'QUARTERLY' && 'Chu kỳ quý'}
                        {cycle.type === 'MONTHLY' && 'Chu kỳ hàng tháng'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="mr-2 h-4 w-4" />
                          {new Date(cycle.periodStart).toLocaleDateString('vi-VN')} - {new Date(cycle.periodEnd).toLocaleDateString('vi-VN')}
                        </div>
                        {cycle.settings && (
                          <div className="text-sm text-muted-foreground">
                            <div>Min KPIs: {cycle.settings.minKpisPerUser || 'N/A'}</div>
                            <div>Max KPIs: {cycle.settings.maxKpisPerUser || 'N/A'}</div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-xs text-muted-foreground">
                          Tạo: {new Date(cycle.createdAt).toLocaleDateString('vi-VN')}
                        </div>
                        <Button variant="outline" size="sm">
                          Xem chi tiết
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}