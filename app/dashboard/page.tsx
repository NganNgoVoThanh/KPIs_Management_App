"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { EnhancedAnomalyDetector } from "@/components/ai/enhanced-anomaly-detector"
import { AIInsightsPanel } from "@/components/ai/ai-insights-panel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { enhancedAIService } from "@/lib/ai-services-enhanced"
import { authService } from "@/lib/auth-service"
import { storageService } from "@/lib/storage-service"
import { notificationService } from "@/lib/notification-service"
import { Loader2, Bell, Brain } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { User, Notification } from "@/lib/types"

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

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [kpiData, setKpiData] = useState<any[]>([])

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) {
      router.push("/")
      return
    }
    
    setUser(currentUser)
    loadData(currentUser)
  }, [router])

  const loadData = async (currentUser: User) => {
    try {
      const userNotifications = storageService.getNotifications(currentUser.id)
      setNotifications(userNotifications.slice(0, 5))
      setUnreadCount(notificationService.getUnreadCount(currentUser.id))

      const currentCycle = storageService.getCurrentCycle()
      if (currentCycle) {
        const kpis = storageService.getKpiDefinitions({
          userId: currentUser.id,
          cycleId: currentCycle.id
        })

        const kpiDataForAnalysis = kpis.map(kpi => {
          const actual = storageService.getKpiActuals({
            kpiDefinitionId: kpi.id
          })[0]

          return {
            id: kpi.id,
            name: kpi.title,
            actualValue: actual?.actualValue || 0,
            targetValue: kpi.target
          }
        })

        setKpiData(kpiDataForAnalysis)
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    notificationService.markAsRead(notification.id)
    setUnreadCount(prev => Math.max(0, prev - 1))
    
    if (notification.actionUrl) {
      router.push(notification.actionUrl)
    }
  }

  const markAllAsRead = () => {
    if (user) {
      notificationService.markAllAsRead(user.id)
      setUnreadCount(0)
      const updatedNotifications = storageService.getNotifications(user.id)
      setNotifications(updatedNotifications.slice(0, 5))
    }
  }

  if (isLoading || !user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 text-red-600 animate-spin" />
        </div>
      </AppLayout>
    )
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

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              {getRoleDisplayName(user.role)} • {user.department}
            </p>
          </div>
          
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
            <DropdownMenuContent>
              <div className="w-80">
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
                        Mark all as read
                      </Button>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {notifications.length === 0 ? (
                  <DropdownMenuItem>
                    <div className="p-4 text-center text-sm text-muted-foreground w-full">
                      No notifications
                    </div>
                  </DropdownMenuItem>
                ) : (
                  <>
                    {notifications.map(notification => (
                      <DropdownMenuItem
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className="flex flex-col items-start p-3 cursor-pointer focus:bg-accent"
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="font-medium text-sm">
                            {notification.title}
                          </span>
                          {notification.status === 'UNREAD' && (
                            <div className="h-2 w-2 bg-red-600 rounded-full flex-shrink-0 ml-2" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-2 w-full">
                          {notification.message}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
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
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-2">Welcome back, {user.name}!</h2>
          <p className="opacity-90">
            Track your KPI progress and manage performance evaluations from your personalized dashboard.
          </p>
        </div>

        <DashboardStats user={user} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentActivity user={user} />
          <QuickActions user={user} />
        </div>

        {kpiData.length > 0 && (
          <div className="mt-8">
            <EnhancedAnomalyDetector 
              kpiData={kpiData}
              showStatisticalAnalysis={true}
              showBehaviorAnalysis={true}
              showRiskScoring={true}
              autoRefresh={true}
              refreshInterval={30000}
              className="mb-6"
            />

            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-red-600" />
                  AI Performance Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AIInsightsPanel userId={user.id} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  )
}