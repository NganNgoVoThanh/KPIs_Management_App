// lib/notification-service.ts
import { storageService } from './storage-service'
import type { Notification } from './types'

// Tạo hàm UUID đơn giản
function generateUUID(): string {
  return 'xxxx-xxxx-4xxx-yxxx-xxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export type NotificationType = 
  | 'KPI_CREATED'
  | 'KPI_SUBMITTED'
  | 'KPI_APPROVED'
  | 'KPI_REJECTED'
  | 'APPROVAL_REQUIRED'
  | 'ACTUAL_SUBMITTED'
  | 'ACTUAL_APPROVED'
  | 'ACTUAL_REJECTED'
  | 'ACTUAL_APPROVAL_REQUIRED'
  | 'CYCLE_OPENED'
  | 'CYCLE_CLOSING_SOON'
  | 'CYCLE_CLOSED'
  | 'CHANGE_REQUEST'
  | 'REMINDER'
  | 'SYSTEM'

interface NotificationTemplate {
  type: NotificationType
  title: string
  bodyTemplate: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  actionRequired: boolean
}

class NotificationService {
  private templates: Record<NotificationType, NotificationTemplate> = {
    KPI_CREATED: {
      type: 'KPI_CREATED',
      title: 'KPI Created',
      bodyTemplate: '{{message}}',
      priority: 'LOW',
      actionRequired: false
    },
    KPI_SUBMITTED: {
      type: 'KPI_SUBMITTED',
      title: 'KPI Submitted for Approval',
      bodyTemplate: 'Your KPI "{{kpiTitle}}" has been submitted for approval.',
      priority: 'MEDIUM',
      actionRequired: false
    },
    KPI_APPROVED: {
      type: 'KPI_APPROVED',
      title: 'KPI Approved',
      bodyTemplate: 'Your KPI has been approved{{level}}.',
      priority: 'HIGH',
      actionRequired: false
    },
    KPI_REJECTED: {
      type: 'KPI_REJECTED',
      title: 'KPI Rejected',
      bodyTemplate: 'Your KPI has been rejected. Reason: {{reason}}',
      priority: 'HIGH',
      actionRequired: true
    },
    APPROVAL_REQUIRED: {
      type: 'APPROVAL_REQUIRED',
      title: 'Approval Required',
      bodyTemplate: '{{message}}',
      priority: 'HIGH',
      actionRequired: true
    },
    ACTUAL_SUBMITTED: {
      type: 'ACTUAL_SUBMITTED',
      title: 'Actual Results Submitted',
      bodyTemplate: 'Actual results for "{{kpiTitle}}" have been submitted.',
      priority: 'MEDIUM',
      actionRequired: false
    },
    ACTUAL_APPROVED: {
      type: 'ACTUAL_APPROVED',
      title: 'Actual Results Approved',
      bodyTemplate: 'Your actual results have been approved.',
      priority: 'HIGH',
      actionRequired: false
    },
    ACTUAL_REJECTED: {
      type: 'ACTUAL_REJECTED',
      title: 'Actual Results Rejected',
      bodyTemplate: 'Your actual results have been rejected. Please review and resubmit.',
      priority: 'HIGH',
      actionRequired: true
    },
    ACTUAL_APPROVAL_REQUIRED: {
      type: 'ACTUAL_APPROVAL_REQUIRED',
      title: 'Actual Results Approval Required',
      bodyTemplate: '{{message}}',
      priority: 'HIGH',
      actionRequired: true
    },
    CYCLE_OPENED: {
      type: 'CYCLE_OPENED',
      title: 'New KPI Cycle Opened',
      bodyTemplate: 'A new KPI cycle "{{cycleName}}" has been opened. Please submit your KPIs by {{deadline}}.',
      priority: 'HIGH',
      actionRequired: true
    },
    CYCLE_CLOSING_SOON: {
      type: 'CYCLE_CLOSING_SOON',
      title: 'KPI Cycle Closing Soon',
      bodyTemplate: 'The current KPI cycle will close in {{daysRemaining}} days.',
      priority: 'HIGH',
      actionRequired: true
    },
    CYCLE_CLOSED: {
      type: 'CYCLE_CLOSED',
      title: 'KPI Cycle Closed',
      bodyTemplate: 'The KPI cycle "{{cycleName}}" has been closed.',
      priority: 'MEDIUM',
      actionRequired: false
    },
    CHANGE_REQUEST: {
      type: 'CHANGE_REQUEST',
      title: 'KPI Change Request',
      bodyTemplate: 'A change request has been {{action}} for KPI "{{kpiTitle}}".',
      priority: 'MEDIUM',
      actionRequired: false
    },
    REMINDER: {
      type: 'REMINDER',
      title: 'Reminder',
      bodyTemplate: '{{message}}',
      priority: 'MEDIUM',
      actionRequired: false
    },
    SYSTEM: {
      type: 'SYSTEM',
      title: 'System Notification',
      bodyTemplate: '{{message}}',
      priority: 'LOW',
      actionRequired: false
    }
  }

  /**
   * Create a new notification
   */
  createNotification(
    userId: string,
    type: NotificationType,
    message: string,
    metadata?: Record<string, any>,
    actionUrl?: string
  ): Notification {
    const template = this.templates[type]
    
    const notification: Notification = {
      id: `notif-${generateUUID()}`,
      userId,
      type,
      title: template.title,
      message: this.processTemplate(template.bodyTemplate, { message, ...metadata }),
      priority: template.priority,
      status: 'UNREAD',
      actionRequired: template.actionRequired,
      actionUrl,
      metadata,
      createdAt: new Date().toISOString()
    }

    storageService.saveNotification(notification)
    
    // Trigger browser notification if enabled
    this.triggerBrowserNotification(notification)
    
    // Log email simulation
    this.simulateEmailNotification(notification)
    
    return notification
  }

  /**
   * Get unread notifications count for user
   */
  getUnreadCount(userId: string): number {
    return storageService.getNotifications(userId, true).length
  }

  /**
   * Get notifications for user with pagination
   */
  getNotifications(
    userId: string,
    page = 1,
    pageSize = 20,
    unreadOnly = false
  ): {
    notifications: Notification[]
    total: number
    page: number
    pageSize: number
    hasMore: boolean
  } {
    const allNotifications = storageService.getNotifications(userId, unreadOnly)
    const total = allNotifications.length
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const notifications = allNotifications.slice(start, end)
    
    return {
      notifications,
      total,
      page,
      pageSize,
      hasMore: end < total
    }
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    storageService.markNotificationAsRead(notificationId)
  }

  /**
   * Mark all notifications as read for user
   */
  markAllAsRead(userId: string): void {
    const notifications = storageService.getNotifications(userId, true)
    notifications.forEach(n => this.markAsRead(n.id))
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: string): boolean {
    const notifications = storageService.getItem<Notification>('vicc_kpi_notifications')
    const index = notifications.findIndex(n => n.id === notificationId)
    
    if (index === -1) return false
    
    notifications.splice(index, 1)
    storageService.setItem('vicc_kpi_notifications', notifications)
    return true
  }

  /**
   * Send reminder notifications
   */
  sendReminders(): void {
    // Check for pending approvals
    this.checkPendingApprovals()
    
    // Check for cycle deadlines
    this.checkCycleDeadlines()
    
    // Check for incomplete KPIs
    this.checkIncompleteKpis()
  }

  /**
   * Private: Check for pending approvals older than 3 days
   */
  private checkPendingApprovals(): void {
    const approvals = storageService.getItem<any>('vicc_kpi_approvals')
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    
    const pendingOld = approvals.filter((a: any) => 
      a.status === 'PENDING' && 
      new Date(a.createdAt) < threeDaysAgo
    )
    
    pendingOld.forEach((approval: any) => {
      this.createNotification(
        approval.approverId,
        'REMINDER',
        `You have a pending ${approval.entityType} approval waiting for more than 3 days`,
        { 
          entityId: approval.entityId,
          daysPending: Math.floor((Date.now() - new Date(approval.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        },
        `/approvals/${approval.entityId}`
      )
    })
  }

  /**
   * Private: Check for cycle deadlines
   */
  private checkCycleDeadlines(): void {
    const cycles = storageService.getCycles({ status: 'ACTIVE' })
    const now = new Date()
    
    cycles.forEach(cycle => {
      const endDate = new Date(cycle.periodEnd)
      const daysRemaining = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      // Send reminder at 7, 3, and 1 days before deadline
      if ([7, 3, 1].includes(daysRemaining)) {
        // Get all users who haven't submitted
        const allUsers = this.getAllUsers()
        
        allUsers.forEach(user => {
          const userKpis = storageService.getKpiDefinitions({
            userId: user.id,
            cycleId: cycle.id
          })
          
          const hasIncomplete = userKpis.some(k => k.status === 'DRAFT')
          
          if (hasIncomplete) {
            this.createNotification(
              user.id,
              'CYCLE_CLOSING_SOON',
              '',
              { 
                cycleName: cycle.name,
                daysRemaining 
              },
              `/kpis?cycle=${cycle.id}`
            )
          }
        })
      }
    })
  }

  /**
   * Private: Check for incomplete KPIs
   */
  private checkIncompleteKpis(): void {
    const cycles = storageService.getCycles({ status: 'ACTIVE' })
    
    cycles.forEach(cycle => {
      const allUsers = this.getAllUsers()
      
      allUsers.forEach(user => {
        const kpis = storageService.getKpiDefinitions({
          userId: user.id,
          cycleId: cycle.id,
          status: 'DRAFT'
        })
        
        if (kpis.length > 0) {
          this.createNotification(
            user.id,
            'REMINDER',
            `You have ${kpis.length} draft KPI(s) waiting for submission`,
            { 
              count: kpis.length,
              cycleId: cycle.id 
            },
            '/kpis'
          )
        }
      })
    })
  }

  /**
   * Private: Process template with variables
   */
  private processTemplate(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match
    })
  }

  /**
   * Private: Trigger browser notification
   */
  private triggerBrowserNotification(notification: Notification): void {
    // Check if browser notifications are enabled
    if (!('Notification' in window)) return
    
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        tag: notification.id,
        requireInteraction: notification.actionRequired
      })
    } else if (Notification.permission !== 'denied') {
      // Request permission
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          this.triggerBrowserNotification(notification)
        }
      })
    }
  }

  /**
   * Private: Simulate email notification (console log)
   */
  private simulateEmailNotification(notification: Notification): void {
    // In production, this would call an email API
    console.log('📧 Email Notification Sent:', {
      to: this.getUserEmail(notification.userId),
      subject: notification.title,
      body: notification.message,
      priority: notification.priority,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Private: Get user email (mock)
   */
  private getUserEmail(userId: string): string {
    // Mock implementation
    const userMap: Record<string, string> = {
      'user-VICC-HR-001': 'hr@intersnack.com.vn',
      'user-VICC-IT-001': 'admin@intersnack.com.vn',
      'user-VICC-RD-001': 'staff@intersnack.com.vn',
      'user-VICC-PD-001': 'linemanager@intersnack.com.vn',
      'user-VICC-QA-001': 'hod@intersnack.com.vn',
      'user-VICC-EX-001': 'bod@intersnack.com.vn'
    }
    return userMap[userId] || 'user@intersnack.com.vn'
  }

  /**
   * Private: Get all users (mock)
   */
  private getAllUsers(): Array<{ id: string; email: string }> {
    // Mock implementation - in real app would query user service
    return [
      { id: 'user-VICC-HR-001', email: 'hr@intersnack.com.vn' },
      { id: 'user-VICC-IT-001', email: 'admin@intersnack.com.vn' },
      { id: 'user-VICC-RD-001', email: 'staff@intersnack.com.vn' },
      { id: 'user-VICC-PD-001', email: 'linemanager@intersnack.com.vn' },
      { id: 'user-VICC-QA-001', email: 'hod@intersnack.com.vn' },
      { id: 'user-VICC-EX-001', email: 'bod@intersnack.com.vn' }
    ]
  }
}

// Create singleton instance
export const notificationService = new NotificationService()

// Export for convenience
export default notificationService

// Set up periodic reminder checks (every hour)
if (typeof window !== 'undefined') {
  setInterval(() => {
    notificationService.sendReminders()
  }, 60 * 60 * 1000) // 1 hour
}