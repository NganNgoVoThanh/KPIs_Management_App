"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { User } from "@/lib/types"
import { storageService } from "@/lib/storage-service"
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Send,
  TrendingUp,
  Award,
  AlertCircle
} from "lucide-react"

interface Activity {
  id: string
  type: string
  title: string
  description: string
  timestamp: string
  icon: any
  color: string
}

interface RecentActivityProps {
  user: User
}

export function RecentActivity({ user }: RecentActivityProps) {
  const [activities, setActivities] = useState<Activity[]>([])

  useEffect(() => {
    loadActivities()
  }, [user])

  const loadActivities = () => {
    // Get audit logs for user
    const logs = storageService.getAuditLogs({
      userId: user.id
    }).slice(0, 10) // Get last 10 activities

    const formattedActivities = logs.map(log => {
      let activity: Activity = {
        id: log.id,
        type: log.action,
        title: '',
        description: '',
        timestamp: log.timestamp,
        icon: FileText,
        color: 'text-gray-600'
      }

      // Format based on action type
      switch (log.action) {
        case 'save':
          if (log.entity === 'kpi_definition') {
            activity.title = 'KPI Created/Updated'
            activity.description = 'Modified KPI definition'
            activity.icon = FileText
            activity.color = 'text-red-600'
          } else if (log.entity === 'kpi_actual') {
            activity.title = 'Actual Submitted'
            activity.description = 'Submitted actual results'
            activity.icon = TrendingUp
            activity.color = 'text-green-600'
          }
          break
        case 'approval':
          activity.title = 'Approval Action'
          activity.description = log.entity === 'kpi_definition' ? 'KPI approval' : 'Actual approval'
          activity.icon = CheckCircle
          activity.color = 'text-emerald-600'
          break
        case 'update':
          activity.title = 'Updated'
          activity.description = `Updated ${log.entity.replace(/_/g, ' ')}`
          activity.icon = Clock
          activity.color = 'text-yellow-600'
          break
        case 'delete':
          activity.title = 'Deleted'
          activity.description = `Deleted ${log.entity.replace(/_/g, ' ')}`
          activity.icon = XCircle
          activity.color = 'text-red-600'
          break
        case 'login':
          activity.title = 'Login'
          activity.description = 'Signed in to the system'
          activity.icon = CheckCircle
          activity.color = 'text-green-600'
          break
        default:
          activity.title = log.action
          activity.description = log.entity
          break
      }

      return activity
    })

    setActivities(formattedActivities)
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 60) return `${minutes} minutes ago`
    if (hours < 24) return `${hours} hours ago`
    if (days < 7) return `${days} days ago`
    
    return date.toLocaleDateString()
  }

  return (
    <Card className="border-red-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-red-600" />
          Recent Activity
        </CardTitle>
        <CardDescription>Your latest actions and updates</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map(activity => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg bg-gray-50 ${activity.color}`}>
                    <activity.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimestamp(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}