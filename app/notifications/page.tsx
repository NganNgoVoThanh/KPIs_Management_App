"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { authService } from "@/lib/auth-service"
import { notificationService } from "@/lib/notification-service"
import type { User, Notification } from "@/lib/types"
import { 
  Bell, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Trash2,
  MailOpen,
  Mail,
  Archive,
  Info
} from "lucide-react"

export default function NotificationsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [activeTab, setActiveTab] = useState("all")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    if (currentUser) {
      setUser(currentUser)
      loadNotifications(currentUser)
    }
  }, [])

  const loadNotifications = (currentUser: User) => {
    const allNotifications = notificationService.getNotifications(currentUser.id, 1, 50).notifications
    setNotifications(allNotifications)
    setIsLoading(false)
  }

  const handleMarkAsRead = (notificationId: string) => {
    notificationService.markAsRead(notificationId)
    if (user) loadNotifications(user)
  }

  const handleMarkAllAsRead = () => {
    if (user) {
      notificationService.markAllAsRead(user.id)
      loadNotifications(user)
    }
  }

  const handleDelete = (notificationId: string) => {
    notificationService.deleteNotification(notificationId)
    if (user) loadNotifications(user)
  }

  const handleActionClick = (notification: Notification) => {
    handleMarkAsRead(notification.id)
    if (notification.actionUrl) {
      router.push(notification.actionUrl)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'KPI_APPROVED':
      case 'ACTUAL_APPROVED':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'KPI_REJECTED':
      case 'ACTUAL_REJECTED':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case 'APPROVAL_REQUIRED':
      case 'ACTUAL_APPROVAL_REQUIRED':
        return <Clock className="h-5 w-5 text-yellow-600" />
      default:
        return <Info className="h-5 w-5 text-red-600" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-700'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
    
    return d.toLocaleDateString()
  }

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread') return n.status === 'UNREAD'
    if (activeTab === 'action') return n.actionRequired
    return true
  })

  const NotificationCard = ({ notification }: { notification: Notification }) => (
    <Card 
      className={`hover:shadow-md transition-all ${
        notification.status === 'UNREAD' ? 'border-l-4 border-l-red-500' : ''
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            {getNotificationIcon(notification.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-sm">{notification.title}</h3>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getPriorityColor(notification.priority)}`}
                  >
                    {notification.priority}
                  </Badge>
                  {notification.status === 'UNREAD' && (
                    <Badge className="bg-red-600 text-white text-xs">
                      New
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {notification.message}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(notification.createdAt)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-3">
              {notification.actionRequired && notification.actionUrl && (
                <Button
                  size="sm"
                  onClick={() => handleActionClick(notification)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Take Action
                </Button>
              )}
              {notification.status === 'UNREAD' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <MailOpen className="h-3 w-3 mr-1" />
                  Mark as Read
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(notification.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground mt-1">
              Stay updated with your KPI activities
            </p>
          </div>
          {notifications.some(n => n.status === 'UNREAD') && (
            <Button
              variant="outline"
              onClick={handleMarkAllAsRead}
              className="border-red-200 hover:bg-red-50"
            >
              <MailOpen className="h-4 w-4 mr-2" />
              Mark All as Read
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{notifications.length}</p>
                </div>
                <Bell className="h-8 w-8 text-gray-400 opacity-20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Unread</p>
                  <p className="text-2xl font-bold text-red-600">
                    {notifications.filter(n => n.status === 'UNREAD').length}
                  </p>
                </div>
                <Mail className="h-8 w-8 text-red-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Action Required</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {notifications.filter(n => n.actionRequired).length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-red-50 border-red-200">
            <TabsTrigger value="all">
              All ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread ({notifications.filter(n => n.status === 'UNREAD').length})
            </TabsTrigger>
            <TabsTrigger value="action">
              Action Required ({notifications.filter(n => n.actionRequired).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4 mt-4">
            {filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Archive className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No notifications</h3>
                  <p className="text-sm text-muted-foreground">
                    {activeTab === 'unread' 
                      ? "You're all caught up!"
                      : activeTab === 'action'
                      ? "No actions required"
                      : "No notifications to display"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {filteredNotifications.map(notification => (
                    <NotificationCard key={notification.id} notification={notification} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}