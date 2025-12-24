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
    MANAGER: "Manager"
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
          setNotifications(notificationsData.notifications || [])
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
      <div className="min-h-screen bg-gradient-to-br from-[#FAFAFA] to-[#FEF2F2]">
        {/* Header - Z-index fix */}
        <div className="bg-white/90 backdrop-blur-md border-b border-red-50 sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Performance Dashboard</h1>
                <p className="text-sm text-gray-500 font-medium">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>

              {/* Notifications Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative hover:bg-gray-100 rounded-full h-10 w-10">
                    <Bell className="h-5 w-5 text-gray-600" />
                    {unreadCount > 0 && (
                      <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-600 rounded-full border-2 border-white ring-1 ring-red-50"></span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 shadow-2xl border-red-50 rounded-xl p-0 overflow-hidden z-[100] bg-white ring-1 ring-black/5">
                  <DropdownMenuLabel className="p-4 bg-gradient-to-r from-red-50 to-white border-b border-red-50">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">Notifications</span>
                      {unreadCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={markAllAsRead}
                          className="text-xs h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Mark all read
                        </Button>
                      )}
                    </div>
                  </DropdownMenuLabel>

                  <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center bg-white">
                        <div className="bg-gray-50 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Bell className="h-6 w-6 text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-500 font-medium">No notifications</p>
                        <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
                      </div>
                    ) : (
                      <>
                        {notifications.map(notification => (
                          <DropdownMenuItem
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className="flex flex-col items-start p-4 cursor-pointer border-b border-gray-50 hover:bg-gray-50 focus:bg-gray-50"
                          >
                            <div className="flex items-center justify-between w-full mb-1.5">
                              <span className={`font-semibold text-sm ${notification.status === 'UNREAD' ? 'text-gray-900' : 'text-gray-600'}`}>
                                {notification.title}
                              </span>
                              {notification.status === 'UNREAD' && (
                                <span className="h-1.5 w-1.5 bg-red-600 rounded-full shadow-sm ring-1 ring-red-100" />
                              )}
                            </div>
                            <div className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                              {notification.message}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-2 font-medium flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {getRelativeTime(new Date(notification.createdAt))}
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </>
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="p-2 bg-gray-50 border-t border-gray-100">
                      <DropdownMenuItem
                        onClick={() => router.push("/notifications")}
                        className="justify-center text-xs font-medium text-gray-600 hover:text-gray-900 cursor-pointer rounded-lg py-2.5"
                      >
                        View all notifications
                      </DropdownMenuItem>
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* Welcome Banner - Redesigned & Fixed */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-red-700 to-red-600 shadow-xl shadow-red-900/10">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white opacity-20 blur-3xl"></div>
              <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-black opacity-20 blur-3xl"></div>
            </div>

            <div className="relative z-10 p-8 lg:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="bg-white/15 backdrop-blur-md p-3.5 rounded-2xl shadow-inner border border-white/10 hidden sm:block">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Welcome back, {user.name}!</h2>
                  <p className="text-red-100 text-sm md:text-base leading-relaxed max-w-xl">
                    Ready to track your performance and achieve new milestones?
                    You have <span className="font-bold text-white">{stats.pending} pending items</span> requiring your attention.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="px-4 py-2 bg-black/20 backdrop-blur-sm rounded-xl border border-white/10">
                  <p className="text-[10px] text-white/60 uppercase tracking-wider font-semibold mb-0.5">Role</p>
                  <p className="text-sm font-bold text-white">{getRoleDisplayName(user.role)}</p>
                </div>
                <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10">
                  <p className="text-[10px] text-white/60 uppercase tracking-wider font-semibold mb-0.5">Department</p>
                  <p className="text-sm font-bold text-white">{user.department || 'General'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid - Premium Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg shadow-blue-900/5 bg-white rounded-2xl overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-blue-50 p-2.5 rounded-xl group-hover:bg-blue-100 transition-colors">
                      <Target className="h-6 w-6 text-blue-600" />
                    </div>
                    <Badge variant="secondary" className="bg-blue-50/50 text-blue-700 font-medium border-0">Total</Badge>
                  </div>
                  <div>
                    <span className="text-4xl font-bold text-gray-900 tracking-tight">{stats.total}</span>
                    <p className="text-sm text-gray-500 font-medium mt-1">Total KPIs assigned</p>
                  </div>
                </div>
                <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-300 w-full" />
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg shadow-green-900/5 bg-white rounded-2xl overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-green-50 p-2.5 rounded-xl group-hover:bg-green-100 transition-colors">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <Badge variant="secondary" className="bg-green-50/50 text-green-700 font-medium border-0">Active</Badge>
                  </div>
                  <div>
                    <span className="text-4xl font-bold text-gray-900 tracking-tight">{stats.approved}</span>
                    <p className="text-sm text-gray-500 font-medium mt-1">Approved & Active</p>
                  </div>
                </div>
                <div className="h-1 bg-gradient-to-r from-green-500 to-green-300 w-full" />
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg shadow-yellow-900/5 bg-white rounded-2xl overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-yellow-50 p-2.5 rounded-xl group-hover:bg-yellow-100 transition-colors">
                      <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                    <Badge variant="secondary" className="bg-yellow-50/50 text-yellow-700 font-medium border-0">Pending</Badge>
                  </div>
                  <div>
                    <span className="text-4xl font-bold text-gray-900 tracking-tight">{stats.pending}</span>
                    <p className="text-sm text-gray-500 font-medium mt-1">Awaiting Review</p>
                  </div>
                </div>
                <div className="h-1 bg-gradient-to-r from-yellow-500 to-yellow-300 w-full" />
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg shadow-purple-900/5 bg-white rounded-2xl overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-purple-50 p-2.5 rounded-xl group-hover:bg-purple-100 transition-colors">
                      <TrendingUp className="h-6 w-6 text-purple-600" />
                    </div>
                    <Badge variant="secondary" className="bg-purple-50/50 text-purple-700 font-medium border-0">Progress</Badge>
                  </div>
                  <div>
                    <span className="text-4xl font-bold text-gray-900 tracking-tight">{stats.avgProgress}%</span>
                    <p className="text-sm text-gray-500 font-medium mt-1">Completion Rate</p>
                  </div>
                </div>
                <div className="h-1 bg-gradient-to-r from-purple-500 to-purple-300 w-full" />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent KPIs List */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Recent KPIs</h3>
                <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 text-sm font-medium" onClick={() => router.push('/kpis')}>
                  View All <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>

              {kpis.length > 0 ? (
                <div className="grid gap-4">
                  {kpis.slice(0, 5).map((kpi) => (
                    <div
                      key={kpi.id}
                      onClick={() => router.push(`/kpis/${kpi.id}`)}
                      className="group bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:border-red-100 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-red-50 transition-colors">
                          <Target className="h-5 w-5 text-gray-400 group-hover:text-red-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 group-hover:text-red-700 transition-colors">{kpi.title}</h4>
                          <p className="text-xs text-gray-500 font-medium mt-0.5 flex items-center gap-2">
                            <span>Target: {kpi.target} {kpi.unit}</span>
                            <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                            <span>{kpi.weight}% Weight</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={
                          kpi.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-100' :
                            kpi.status?.includes('PENDING') ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                              'bg-gray-100 text-gray-600 border-gray-200'
                        }>
                          {kpi.status.replace(/_/g, ' ')}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
                  <div className="bg-red-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Target className="h-8 w-8 text-red-500" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">No KPIs Found</h3>
                  <p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">It looks like you haven't been assigned any KPIs yet. Start by creating a new KPI.</p>
                  <Button
                    onClick={() => router.push('/kpis/create')}
                    className="mt-6 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20"
                  >
                    Create First KPI
                  </Button>
                </div>
              )}
            </div>

            {/* Right Column - Cycle Info & Quick Actions */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-6">Active Cycle</h3>
                {currentCycle ? (
                  <div className="bg-white rounded-2xl p-6 shadow-lg shadow-blue-900/5 border border-blue-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full translate-x-1/3 -translate-y-1/3"></div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-4">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-bold text-blue-900 uppercase tracking-widest">Running</span>
                      </div>
                      <h4 className="text-2xl font-bold text-gray-900 mb-1">{currentCycle.name}</h4>
                      <p className="text-sm text-gray-500 font-medium mb-6">
                        {new Date(currentCycle.periodStart).toLocaleDateString()} - {new Date(currentCycle.periodEnd).toLocaleDateString()}
                      </p>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-gray-600">
                          <span>Cycle Progress</span>
                          <span>{stats.avgProgress}%</span>
                        </div>
                        <Progress value={stats.avgProgress} className="h-2 bg-blue-50" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-2xl p-6 text-center border border-gray-200">
                    <p className="text-gray-500 font-medium">No active cycle</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <Loader2 className="h-8 w-8 text-red-600 animate-spin" />
        </div>
      </AppLayout>
    }>
      <DashboardContent />
    </Suspense>
  )
}
