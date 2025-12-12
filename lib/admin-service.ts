// lib/admin-service.ts - FIXED: Notification types
import type { 
  User, 
  Cycle, 
  KpiTemplate, 
  AdminNotificationConfig, 
  CompanyDocument, 
  ApprovalHierarchy,
  ChangeRequest,
  KpiDefinition,
  HistoricalKpiData,
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationStatus
} from './types'
import { storageService } from './storage-service'
import { authService } from './auth-service'
import { generateUUID } from './utils'

class AdminService {
  
  /**
   * ========================
   * CYCLE & NOTIFICATION MANAGEMENT
   * ========================
   */

  /**
   * Tạo và gửi thông báo chu kỳ KPI mới
   */
  async createCycleAndNotifyUsers(config: {
    cycleName: string
    periodStart: string
    periodEnd: string
    type: 'QUARTERLY' | 'YEARLY' | 'SEMI_ANNUAL'
    templateId?: string
    targetUsers?: string[]
    targetRoles?: string[]
    targetDepartments?: string[]
    customMessage?: string
    dueDate?: string
  }): Promise<{ cycle: Cycle; notificationsSent: number }> {
    
    const admin = authService.getCurrentUser()
    if (!admin || admin.role !== 'ADMIN') {
      throw new Error('Admin access required')
    }

    // 1. Tạo Cycle mới
    const cycle: Cycle = {
      id: `cycle-${generateUUID()}`,
      name: config.cycleName,
      type: config.type,
      periodStart: config.periodStart,
      periodEnd: config.periodEnd,
      status: 'ACTIVE',
      createdBy: admin.id,
      createdAt: new Date().toISOString(),
      notificationSentAt: new Date().toISOString(),
      targetUsers: config.targetUsers,
      settings: {
        autoNotifyUsers: true,
        requireEvidence: true,
        minKpisPerUser: 3,
        maxKpisPerUser: 10,
        totalWeightMustEqual: 100
      }
    }

    storageService.saveCycle(cycle)

    // 2. Xác định danh sách users nhận thông báo
    const allUsers = storageService.getUsers()
    let targetedUsers = allUsers.filter(u => u.status === 'ACTIVE')

    if (config.targetRoles && config.targetRoles.length > 0) {
      targetedUsers = targetedUsers.filter(u => config.targetRoles!.includes(u.role))
    }

    if (config.targetDepartments && config.targetDepartments.length > 0) {
      targetedUsers = targetedUsers.filter(u => 
        config.targetDepartments!.includes(u.department || '')
      )
    }

    if (config.targetUsers && config.targetUsers.length > 0) {
      targetedUsers = targetedUsers.filter(u => config.targetUsers!.includes(u.id))
    }

    // 3. Gửi thông báo cho từng user
    let notificationCount = 0
    const template = config.templateId ? storageService.getTemplates().find(t => t.id === config.templateId) : null

    for (const user of targetedUsers) {
      const notification: Notification = {
        id: `notif-${generateUUID()}`,
        userId: user.id,
        type: 'CYCLE_OPENED' as NotificationType,
        title: `Chu kỳ đánh giá KPI mới: ${config.cycleName}`,
        message: config.customMessage || `
Kính gửi ${user.name},

Chu kỳ đánh giá KPI mới đã được mở:
- Tên chu kỳ: ${config.cycleName}
- Thời gian: ${new Date(config.periodStart).toLocaleDateString('vi-VN')} - ${new Date(config.periodEnd).toLocaleDateString('vi-VN')}
- Hạn nộp KPI: ${config.dueDate ? new Date(config.dueDate).toLocaleDateString('vi-VN') : 'Xem hệ thống'}
${template ? `\n- Mẫu KPI: ${template.name}` : ''}

Vui lòng đăng nhập hệ thống để thiết lập KPI của bạn.

Trân trọng,
Ban Quản lý
        `.trim(),
        priority: 'HIGH' as NotificationPriority,
        status: 'UNREAD' as NotificationStatus,
        actionRequired: true,
        actionUrl: `/kpis/create?cycleId=${cycle.id}${template ? `&templateId=${template.id}` : ''}`,
        metadata: {
          cycleId: cycle.id,
          templateId: config.templateId,
          dueDate: config.dueDate,
          sentBy: admin.id
        },
        createdAt: new Date().toISOString()
      }

      storageService.saveNotification(notification)
      notificationCount++
    }

    // 4. Log audit
    this.logAdminAction('CREATE_CYCLE_WITH_NOTIFICATION', cycle.id, {
      cycleName: config.cycleName,
      notificationsSent: notificationCount,
      targetedUsers: targetedUsers.length
    })

    return { cycle, notificationsSent: notificationCount }
  }

  /**
   * ========================
   * CHANGE REQUEST MANAGEMENT
   * ========================
   */

  /**
   * Admin yêu cầu user chỉnh sửa KPI
   */
  async requestKpiChange(params: {
    kpiId: string
    reason: string
    suggestedChanges?: {
      target?: number
      weight?: number
      description?: string
      formula?: string
    }
    urgency?: 'LOW' | 'MEDIUM' | 'HIGH'
  }): Promise<ChangeRequest> {
    
    const admin = authService.getCurrentUser()
    if (!admin || admin.role !== 'ADMIN') {
      throw new Error('Admin access required')
    }

    const kpi = storageService.getKpiDefinitions().find(k => k.id === params.kpiId)
    if (!kpi) {
      throw new Error('KPI not found')
    }

    // 1. Update KPI status
    storageService.updateKpiDefinition(params.kpiId, {
      status: 'CHANGE_REQUESTED',
      changeRequestedBy: admin.id,
      changeRequestedAt: new Date().toISOString(),
      changeRequestReason: params.reason
    })

    // 2. Tạo Change Request
    const changeRequest: ChangeRequest = {
      id: `cr-${generateUUID()}`,
      kpiDefinitionId: params.kpiId,
      requesterId: admin.id,
      requesterType: 'ADMIN',
      changeType: params.suggestedChanges ? 'ALL' : 'DESCRIPTION',
      currentValues: {
        target: kpi.target,
        weight: kpi.weight,
        description: kpi.description,
        formula: kpi.formula
      },
      proposedValues: params.suggestedChanges || {},
      reason: params.reason,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      requiresApproval: false // Admin request không cần phê duyệt
    }

    storageService.saveChangeRequest(changeRequest)

    // 3. Thông báo cho user
    const notification: Notification = {
      id: `notif-${generateUUID()}`,
      userId: kpi.userId,
      type: 'CHANGE_REQUEST' as NotificationType,
      title: 'Yêu cầu chỉnh sửa KPI',
      message: `
Admin đã yêu cầu bạn chỉnh sửa KPI: "${kpi.title}"

Lý do: ${params.reason}

${params.suggestedChanges ? `
Đề xuất thay đổi:
${params.suggestedChanges.target ? `- Mục tiêu: ${params.suggestedChanges.target}` : ''}
${params.suggestedChanges.weight ? `- Trọng số: ${params.suggestedChanges.weight}%` : ''}
${params.suggestedChanges.description ? `- Mô tả: ${params.suggestedChanges.description}` : ''}
` : ''}

Vui lòng cập nhật và nộp lại KPI.
      `.trim(),
      priority: (params.urgency || 'MEDIUM') as NotificationPriority,
      status: 'UNREAD' as NotificationStatus,
      actionRequired: true,
      actionUrl: `/kpis/edit/${params.kpiId}?changeRequestId=${changeRequest.id}`,
      metadata: {
        changeRequestId: changeRequest.id,
        urgency: params.urgency || 'MEDIUM'
      },
      createdAt: new Date().toISOString()
    }

    storageService.saveNotification(notification)

    // 4. Log audit
    this.logAdminAction('REQUEST_KPI_CHANGE', params.kpiId, {
      reason: params.reason,
      changeRequestId: changeRequest.id,
      userId: kpi.userId
    })

    return changeRequest
  }

  /**
   * User submit KPI sau khi chỉnh sửa theo yêu cầu Admin
   */
  async approveKpiChangeCompletion(changeRequestId: string, approved: boolean, comment?: string): Promise<void> {
    const admin = authService.getCurrentUser()
    if (!admin || admin.role !== 'ADMIN') {
      throw new Error('Admin access required')
    }

    const changeRequest = storageService.getChangeRequests().find(cr => cr.id === changeRequestId)
    if (!changeRequest) {
      throw new Error('Change request not found')
    }

    // Update change request
    storageService.updateChangeRequest(changeRequestId, {
      status: approved ? 'APPROVED' : 'REJECTED',
      resolvedAt: new Date().toISOString(),
      resolvedBy: admin.id,
      resolutionComment: comment
    })

    // Update KPI status
    const newStatus = approved ? 'SUBMITTED' : 'CHANGE_REQUESTED'
    storageService.updateKpiDefinition(changeRequest.kpiDefinitionId, {
      status: newStatus
    })

    // Notify user
    const kpi = storageService.getKpiDefinitions().find(k => k.id === changeRequest.kpiDefinitionId)
    if (kpi) {
      const notification: Notification = {
        id: `notif-${generateUUID()}`,
        userId: kpi.userId,
        type: (approved ? 'KPI_APPROVED' : 'CHANGE_REQUEST') as NotificationType,
        title: approved ? 'Yêu cầu chỉnh sửa đã được chấp nhận' : 'Yêu cầu chỉnh sửa cần điều chỉnh thêm',
        message: approved 
          ? `KPI "${kpi.title}" đã được phê duyệt sau khi chỉnh sửa.${comment ? `\n\nNhận xét: ${comment}` : ''}`
          : `KPI "${kpi.title}" cần chỉnh sửa thêm.${comment ? `\n\nNhận xét: ${comment}` : ''}`,
        priority: 'MEDIUM' as NotificationPriority,
        status: 'UNREAD' as NotificationStatus,
        actionRequired: !approved,
        actionUrl: approved ? `/kpis/${kpi.id}` : `/kpis/edit/${kpi.id}`,
        createdAt: new Date().toISOString()
      }
      storageService.saveNotification(notification)
    }

    this.logAdminAction('RESOLVE_CHANGE_REQUEST', changeRequestId, { approved, comment })
  }

  /**
   * ========================
   * COMPANY DOCUMENTS MANAGEMENT
   * ========================
   */

  /**
   * Upload và index tài liệu công ty cho AI
   */
  async uploadCompanyDocument(params: {
    title: string
    type: 'OGSM' | 'STRATEGIC_PLAN' | 'POLICY' | 'GUIDELINE' | 'TEMPLATE' | 'OTHER'
    file: File
    department?: string
    tags?: string[]
    description?: string
    isPublic?: boolean
    enableAIIndexing?: boolean
  }): Promise<CompanyDocument> {
    
    const admin = authService.getCurrentUser()
    if (!admin || admin.role !== 'ADMIN') {
      throw new Error('Admin access required')
    }

    // Simulate file upload
    const fileUrl = `https://storage.vicc.com/documents/${generateUUID()}-${params.file.name}`

    const document: CompanyDocument = {
      id: `doc-${generateUUID()}`,
      title: params.title,
      type: params.type,
      fileName: params.file.name,
      fileSize: params.file.size,
      fileType: params.file.type,
      storageUrl: fileUrl,
      department: params.department,
      uploadedBy: admin.id,
      uploadedAt: new Date().toISOString(),
      tags: params.tags || [],
      description: params.description,
      isPublic: params.isPublic ?? true,
      aiIndexed: false
    }

    // Save document
    const docs = this.getCompanyDocuments()
    docs.push(document)
    localStorage.setItem('company_documents', JSON.stringify(docs))

    // AI Indexing if enabled
    if (params.enableAIIndexing) {
      await this.indexDocumentForAI(document.id)
    }

    this.logAdminAction('UPLOAD_DOCUMENT', document.id, { title: params.title, type: params.type })

    return document
  }

  /**
   * Index tài liệu cho AI để phân tích và tham chiếu
   */
  async indexDocumentForAI(documentId: string): Promise<void> {
    const docs = this.getCompanyDocuments()
    const doc = docs.find(d => d.id === documentId)
    
    if (!doc) {
      throw new Error('Document not found')
    }

    // Simulate AI indexing process
    console.log(`Indexing document for AI: ${doc.title}`)
    
    // Update document
    doc.aiIndexed = true
    doc.aiIndexedAt = new Date().toISOString()
    
    localStorage.setItem('company_documents', JSON.stringify(docs))

    this.logAdminAction('INDEX_DOCUMENT_AI', documentId, { title: doc.title })
  }

  /**
   * Get all company documents
   */
  getCompanyDocuments(filters?: {
    type?: CompanyDocument['type']
    department?: string
    tags?: string[]
    aiIndexed?: boolean
  }): CompanyDocument[] {
    let docs: CompanyDocument[] = JSON.parse(localStorage.getItem('company_documents') || '[]')

    if (filters) {
      if (filters.type) {
        docs = docs.filter(d => d.type === filters.type)
      }
      if (filters.department) {
        docs = docs.filter(d => d.department === filters.department)
      }
      if (filters.tags && filters.tags.length > 0) {
        docs = docs.filter(d => d.tags?.some(t => filters.tags!.includes(t)))
      }
      if (filters.aiIndexed !== undefined) {
        docs = docs.filter(d => d.aiIndexed === filters.aiIndexed)
      }
    }

    return docs
  }

  /**
   * Delete company document
   */
  async deleteCompanyDocument(documentId: string): Promise<void> {
    const admin = authService.getCurrentUser()
    if (!admin || admin.role !== 'ADMIN') {
      throw new Error('Admin access required')
    }

    const docs = this.getCompanyDocuments()
    const index = docs.findIndex(d => d.id === documentId)
    
    if (index === -1) {
      throw new Error('Document not found')
    }

    const deletedDoc = docs[index]
    docs.splice(index, 1)
    localStorage.setItem('company_documents', JSON.stringify(docs))

    this.logAdminAction('DELETE_DOCUMENT', documentId, { title: deletedDoc.title })
  }

  /**
   * ========================
   * APPROVAL HIERARCHY MANAGEMENT
   * ========================
   */

  /**
   * Setup approval hierarchy cho user
   */
  async setupApprovalHierarchy(params: {
    userId: string
    level1ApproverId?: string // Line Manager
    level2ApproverId?: string // Manager (N+2) - ✅ Changed from Head of Dept
    effectiveFrom: string
    effectiveTo?: string
  }): Promise<ApprovalHierarchy> {
    
    const admin = authService.getCurrentUser()
    if (!admin || admin.role !== 'ADMIN') {
      throw new Error('Admin access required')
    }

    // Deactivate old hierarchies for this user
    const hierarchies = this.getApprovalHierarchies()
    hierarchies
      .filter(h => h.userId === params.userId && h.isActive)
      .forEach(h => {
        h.isActive = false
        h.effectiveTo = new Date().toISOString()
      })

    // Create new hierarchy
    const hierarchy: ApprovalHierarchy = {
      userId: params.userId,
      level1ApproverId: params.level1ApproverId,
      level2ApproverId: params.level2ApproverId,
      effectiveFrom: params.effectiveFrom,
      effectiveTo: params.effectiveTo,
      createdBy: admin.id,
      createdAt: new Date().toISOString(),
      isActive: true
    }

    hierarchies.push(hierarchy)
    localStorage.setItem('approval_hierarchies', JSON.stringify(hierarchies))

    this.logAdminAction('SETUP_APPROVAL_HIERARCHY', params.userId, hierarchy)

    return hierarchy
  }

  /**
   * Get approval hierarchy for user
   */
  getApprovalHierarchy(userId: string): ApprovalHierarchy | null {
    const hierarchies = this.getApprovalHierarchies()
    return hierarchies.find(h => 
      h.userId === userId && 
      h.isActive &&
      new Date(h.effectiveFrom) <= new Date() &&
      (!h.effectiveTo || new Date(h.effectiveTo) >= new Date())
    ) || null
  }

  /**
   * Get all approval hierarchies
   */
  private getApprovalHierarchies(): ApprovalHierarchy[] {
    return JSON.parse(localStorage.getItem('approval_hierarchies') || '[]')
  }

  /**
   * Bulk setup approval hierarchies from Azure AD data
   */
  async bulkSetupFromAzureAD(azureData: any[]): Promise<{ success: number; failed: number }> {
    const admin = authService.getCurrentUser()
    if (!admin || admin.role !== 'ADMIN') {
      throw new Error('Admin access required')
    }

    let success = 0
    let failed = 0

    for (const data of azureData) {
      try {
        await this.setupApprovalHierarchy({
          userId: data.userId,
          level1ApproverId: data.managerId,
          level2ApproverId: data.departmentHeadId,
          effectiveFrom: new Date().toISOString()
        })
        success++
      } catch (error) {
        console.error(`Failed to setup hierarchy for ${data.userId}:`, error)
        failed++
      }
    }

    this.logAdminAction('BULK_SETUP_HIERARCHY', 'multiple', { success, failed })

    return { success, failed }
  }

  /**
   * ========================
   * HISTORICAL KPI DATA MANAGEMENT
   * ========================
   */

  /**
   * Import historical KPI data cho AI reference
   */
  async importHistoricalKpiData(data: HistoricalKpiData[]): Promise<{ imported: number }> {
    const admin = authService.getCurrentUser()
    if (!admin || admin.role !== 'ADMIN') {
      throw new Error('Admin access required')
    }

    const existing = this.getHistoricalKpiData()
    const updated = [...existing, ...data]

    localStorage.setItem('historical_kpi_data', JSON.stringify(updated))

    this.logAdminAction('IMPORT_HISTORICAL_DATA', 'bulk', { count: data.length })

    return { imported: data.length }
  }

  /**
   * Get historical KPI data for user
   */
  getHistoricalKpiData(userId?: string, year?: number): HistoricalKpiData[] {
    let data: HistoricalKpiData[] = JSON.parse(localStorage.getItem('historical_kpi_data') || '[]')

    if (userId) {
      data = data.filter(d => d.userId === userId)
    }

    if (year) {
      data = data.filter(d => d.year === year)
    }

    return data
  }

  /**
   * Export historical data template for import
   */
  exportHistoricalDataTemplate(): string {
    const template = {
      userId: "user-id-here",
      year: 2024,
      quarter: 1,
      kpis: [
        {
          title: "KPI Title",
          type: "QUANT_HIGHER_BETTER",
          target: 100,
          actual: 95,
          score: 4,
          weight: 25
        }
      ],
      totalScore: 4.0,
      performanceRating: "Good"
    }

    return JSON.stringify([template], null, 2)
  }

  /**
   * ========================
   * ADMIN STATISTICS & MONITORING
   * ========================
   */

  /**
   * Get admin dashboard statistics
   */
  getAdminStatistics(): {
    cycles: { total: number; active: number; closed: number }
    users: { total: number; active: number; byRole: Record<string, number> }
    kpis: { total: number; submitted: number; approved: number; pending: number }
    changeRequests: { total: number; pending: number; approved: number; rejected: number }
    documents: { total: number; aiIndexed: number; byType: Record<string, number> }
  } {
    const cycles = storageService.getCycles()
    const users = storageService.getUsers()
    const kpis = storageService.getKpiDefinitions()
    const changeRequests = storageService.getChangeRequests()
    const documents = this.getCompanyDocuments()

    return {
      cycles: {
        total: cycles.length,
        active: cycles.filter(c => c.status === 'ACTIVE').length,
        closed: cycles.filter(c => c.status === 'CLOSED').length
      },
      users: {
        total: users.length,
        active: users.filter(u => u.status === 'ACTIVE').length,
        byRole: users.reduce((acc, u) => {
          acc[u.role] = (acc[u.role] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      },
      kpis: {
        total: kpis.length,
        submitted: kpis.filter(k => k.status !== 'DRAFT').length,
        approved: kpis.filter(k => k.status === 'APPROVED' || k.status === 'LOCKED_GOALS').length,
        pending: kpis.filter(k => k.status.startsWith('PENDING')).length
      },
      changeRequests: {
        total: changeRequests.length,
        pending: changeRequests.filter(cr => cr.status === 'PENDING').length,
        approved: changeRequests.filter(cr => cr.status === 'APPROVED').length,
        rejected: changeRequests.filter(cr => cr.status === 'REJECTED').length
      },
      documents: {
        total: documents.length,
        aiIndexed: documents.filter(d => d.aiIndexed).length,
        byType: documents.reduce((acc, d) => {
          acc[d.type] = (acc[d.type] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }
    }
  }

  /**
   * ========================
   * UTILITY & LOGGING
   * ========================
   */

  /**
   * Log admin action for audit
   */
  private logAdminAction(action: string, entityId: string, details: any): void {
    const admin = authService.getCurrentUser()
    if (!admin) return

    const log = {
      id: `audit-${generateUUID()}`,
      actorId: admin.id,
      actorName: admin.name,
      actorRole: admin.role,
      entityType: 'ADMIN_ACTION',
      entityId,
      action,
      afterData: details,
      createdAt: new Date().toISOString()
    }

    const logs = JSON.parse(localStorage.getItem('admin_audit_logs') || '[]')
    logs.push(log)
    
    // Keep last 1000 logs
    if (logs.length > 1000) {
      logs.shift()
    }
    
    localStorage.setItem('admin_audit_logs', JSON.stringify(logs))
  }

  /**
   * Get admin audit logs
   */
  getAdminAuditLogs(filters?: {
    action?: string
    dateFrom?: string
    dateTo?: string
    limit?: number
  }): any[] {
    let logs = JSON.parse(localStorage.getItem('admin_audit_logs') || '[]')

    if (filters) {
      if (filters.action) {
        logs = logs.filter((l: any) => l.action === filters.action)
      }
      if (filters.dateFrom) {
        logs = logs.filter((l: any) => new Date(l.createdAt) >= new Date(filters.dateFrom!))
      }
      if (filters.dateTo) {
        logs = logs.filter((l: any) => new Date(l.createdAt) <= new Date(filters.dateTo!))
      }
      if (filters.limit) {
        logs = logs.slice(-filters.limit)
      }
    }

    return logs.reverse()
  }
}

export const adminService = new AdminService()
export default adminService