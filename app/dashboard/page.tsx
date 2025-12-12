"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Loader2,
  Bell,
  Target,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Award,
  ArrowRight,
  Calendar,
  Users
} from "lucide-react"
import { authService } from "@/lib/auth-service"
import { authenticatedFetch } from "@/lib/api-client"
import type { User, Notification, KpiDefinition } from "@/lib/types"

const getRelativeTime = (date: Date): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)

  let interval = Math.floor(seconds / 31536000)
  if (interval > 1) return interval + " years ago"
  if (interval === 1) return "1 year ago"

  interval = Math.floor(seconds / 2592000)
  if (interval > 1) return interval + " months ago"
  if (interval === 1) return "1 month ago"

  interval = Math.floor(seconds / 86400)
  if (interval > 1) return interval + " days ago"
  if (interval === 1) return "1 day ago"

  interval = Math.floor(seconds / 3600)
  if (interval > 1) return interval + " hours ago"
  if (interval === 1) return "1 hour ago"

  interval = Math.floor(seconds / 60)
  if (interval > 1) return interval + " minutes ago"
  if (interval === 1) return "1 minute ago"

  return "Just now"
}

const getRoleDisplayName = (role: string) => {
  const roleNames: Record<string, string> = {
    HR: "Human Resources",
    ADMIN: "System Administrator",
    STAFF: "Staff Member",
    LINE_MANAGER: "Line Manager",
    HEAD_OF_DEPT: "Head of Department",
    BOD: "Board of Directors",
  }
  return roleNames[role] || role
}

function DashboardContent() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [kpis, setKpis] = useState<KpiDefinition[]>([])
  const [stats, setStats] = useState({
    total: 0,
    submitted: 0,
    approved: 0,
    pending: 0,
    avgProgress: 0
  })
  const [currentCycle, setCurrentCycle] = useState<any>(null)

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) {
      router.push("/")
      return
    }

    setUser(currentUser)
    loadDashboardData(currentUser)
  }, [router])

  const loadDashboardData = async (currentUser: User) => {
    setIsLoading(true)
    try {
      // Load KPIs
      const kpisResponse = await authenticatedFetch(`/api/kpi?userId=${currentUser.id}`)
      const kpisData = await kpisResponse.json()

      if (kpisData.success) {
        const userKpis = kpisData.data || []
        setKpis(userKpis)

        // Calculate stats
        const total = userKpis.length
        const submitted = userKpis.filter((k: KpiDefinition) =>
          k.status !== 'DRAFT'
        ).length
        const approved = userKpis.filter((k: KpiDefinition) =>
          k.status === 'APPROVED' || k.status === 'LOCKED_GOALS'
        ).length
        const pending = userKpis.filter((k: KpiDefinition) =>
          k.status?.includes('PENDING')
        ).length

        setStats({
          total,
          submitted,
          approved,
          pending,
          avgProgress: total > 0 ? Math.round((approved / total) * 100) : 0
        })
      }

      // Load active cycle
      const cyclesResponse = await authenticatedFetch('/api/cycles?status=ACTIVE')
      const cyclesData = await cyclesResponse.json()
      if (cyclesData.success && cyclesData.data?.length > 0) {
        setCurrentCycle(cyclesData.data[0])
      }

      // Load notifications from real API
      try {
        const notificationsResponse = await authenticatedFetch('/api/notifications?limit=5')
        const notificationsData = await notificationsResponse.json()
        if (notificationsData.success) {
          setNotifications(notificationsData.data || [])
          setUnreadCount(notificationsData.stats?.unread || 0)
        }
      } catch (error) {
        console.error("Error loading notifications:", error)
        setNotifications([])
        setUnreadCount(0)
      }

    } catch (error) {
      console.error("Error loading dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read via API
    try {
      await authenticatedFetch(`/api/notifications/${notification.id}/read`, {
        method: 'POST'
      })
      setUnreadCount(prev => Math.max(0, prev - 1))

      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, status: 'READ' as const } : n)
      )
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }

    if (notification.actionUrl) {
      router.push(notification.actionUrl)
    }
  }

  const markAllAsRead = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) return

    try {
      await authenticatedFetch('/api/notifications/mark-all-read', {
        method: 'POST'
      })
      setUnreadCount(0)
      setNotifications(prev =>
        prev.map(n => ({ ...n, status: 'READ' as const }))
      )
    } catch (error) {
      console.error("Error marking all as read:", error)
    }
  }

  if (isLoading || !user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 text-red-600 animate-spin" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Performance Dashboard</h1>
                <p className="text-sm text-gray-600 mt-0.5">
                  Comprehensive overview of your KPI performance and metrics
                </p>
              </div>

              {/* Notifications Dropdown - Fixed */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-red-600">
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>
                    <div className="flex items-center justify-between">
                      <span>Notifications</span>
                      {unreadCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={markAllAsRead}
                          className="text-xs h-auto p-1"
                        >
                          Mark all read
                        </Button>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 font-medium">No notifications</p>
                      <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
                    </div>
                  ) : (
                    <>
                      {notifications.map(notification => (
                        <DropdownMenuItem
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className="flex flex-col items-start p-3 cursor-pointer"
                        >
                          <div className="flex items-center justify-between w-full mb-1">
                            <span className="font-medium text-sm">{notification.title}</span>
                            {notification.status === 'UNREAD' && (
                              <div className="h-2 w-2 bg-red-600 rounded-full" />
                            )}
                          </div>
                          <div className="text-xs text-gray-600 line-clamp-2">
                            {notification.message}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {getRelativeTime(new Date(notification.createdAt))}
                          </div>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => router.push("/notifications")}
                        className="text-center justify-center text-sm"
                      >
                        View all notifications
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
          {/* Welcome Banner - Redesigned */}
          <Card className="border-0 bg-gradient-to-br from-red-600 via-red-700 to-red-800 text-white shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <CardContent className="p-8 relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                      <Target className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold">Welcome back, {user.name}!</h2>
                      <p className="text-white/90 text-sm mt-1">
                        Track your KPI progress and achieve excellence
                      </p>
                    </div>
                  </div>
                </div>
                <div className="hidden lg:flex items-center gap-6 bg-white/10 backdrop-blur-sm rounded-2xl px-8 py-4 border border-white/20">
                  <div className="text-center">
                    <p className="text-xs text-white/70 mb-1">Role</p>
                    <p className="font-bold text-lg">{getRoleDisplayName(user.role)}</p>
                  </div>
                  <div className="h-12 w-px bg-white/30" />
                  <div className="text-center">
                    <p className="text-xs text-white/70 mb-1">Department</p>
                    <p className="font-bold text-lg">{user.department || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Cycle Info */}
          {currentCycle && (
            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-50 p-3 rounded-xl">
                      <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Active Cycle</p>
                      <h3 className="text-xl font-bold text-gray-900">{currentCycle.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(currentCycle.periodStart).toLocaleDateString()} - {new Date(currentCycle.periodEnd).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800 font-semibold px-4 py-2">
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Grid - Redesigned */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-blue-500 p-3 rounded-xl shadow-md">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <Badge variant="outline" className="bg-white">Total</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-4xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-sm text-gray-600 font-medium">Total KPIs</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-green-500 p-3 rounded-xl shadow-md">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <Badge variant="outline" className="bg-white">Success</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-4xl font-bold text-gray-900">{stats.approved}</p>
                  <p className="text-sm text-gray-600 font-medium">Approved KPIs</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-yellow-50 to-yellow-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-yellow-500 p-3 rounded-xl shadow-md">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <Badge variant="outline" className="bg-white">Pending</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-4xl font-bold text-gray-900">{stats.pending}</p>
                  <p className="text-sm text-gray-600 font-medium">Pending Review</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-purple-50 to-purple-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-purple-500 p-3 rounded-xl shadow-md">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <Badge variant="outline" className="bg-white">Progress</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-4xl font-bold text-gray-900">{stats.avgProgress}%</p>
                  <p className="text-sm text-gray-600 font-medium">Completion Rate</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent KPIs */}
          {kpis.length > 0 && (
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent KPIs</CardTitle>
                    <CardDescription>Your latest performance indicators</CardDescription>
                  </div>
                  <Button variant="ghost" onClick={() => router.push('/kpis')}>
                    View All <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {kpis.slice(0, 5).map((kpi) => (
                    <div
                      key={kpi.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50/30 transition-all cursor-pointer"
                      onClick={() => router.push(`/kpis/${kpi.id}`)}
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{kpi.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Target: {kpi.target} {kpi.unit}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          className={
                            kpi.status === 'APPROVED'
                              ? 'bg-green-100 text-green-800'
                              : kpi.status?.includes('PENDING')
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {kpi.status}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {kpis.length === 0 && (
            <Card className="border-2 border-dashed border-gray-300">
              <CardContent className="p-12 text-center">
                <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No KPIs Yet</h3>
                <p className="text-gray-600 mb-6">
                  Get started by creating your first KPI to track your performance
                </p>
                <Button
                  onClick={() => router.push('/kpis/create')}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                >
                  <Target className="mr-2 h-5 w-5" />
                  Create Your First KPI
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 text-red-600 animate-spin" />
        </div>
      </AppLayout>
    }>
      <DashboardContent />
    </Suspense>
  )
}
