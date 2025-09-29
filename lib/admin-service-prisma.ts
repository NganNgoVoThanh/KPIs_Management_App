// lib/admin-service-prisma.ts - FIXED: All TypeScript errors
import { db, prisma } from './db'
import { authService } from './auth-service'
import type { 
  Cycle, 
  CompanyDocument, 
  ApprovalHierarchy,
  ChangeRequest,
  HistoricalKpiData
} from './types'

class AdminServicePrisma {
  
  /**
   * ========================
   * CYCLE & NOTIFICATION MANAGEMENT
   * ========================
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
  }): Promise<{ cycle: any; notificationsSent: number }> {
    
    const admin = authService.getCurrentUser()
    if (!admin || admin.role !== 'ADMIN') {
      throw new Error('Admin access required')
    }

    // 1. Create Cycle
    const cycle = await db.createCycle({
      name: config.cycleName,
      type: config.type,
      periodStart: new Date(config.periodStart),
      periodEnd: new Date(config.periodEnd),
      status: 'ACTIVE',
      createdBy: admin.id,
      notificationSentAt: new Date(),
      targetUsers: config.targetUsers || [],
      settings: {
        autoNotifyUsers: true,
        requireEvidence: true,
        minKpisPerUser: 3,
        maxKpisPerUser: 10,
        totalWeightMustEqual: 100
      }
    })

    // 2. Get target users - FIX: Add explicit types
    let targetedUsers: any[] = await db.getUsers({ status: 'ACTIVE' })

    if (config.targetRoles && config.targetRoles.length > 0) {
      targetedUsers = targetedUsers.filter((u: any) => config.targetRoles!.includes(u.role))
    }

    if (config.targetDepartments && config.targetDepartments.length > 0) {
      targetedUsers = targetedUsers.filter((u: any) => 
        u.department && config.targetDepartments!.includes(u.department)
      )
    }

    if (config.targetUsers && config.targetUsers.length > 0) {
      targetedUsers = targetedUsers.filter((u: any) => config.targetUsers!.includes(u.id))
    }

    // 3. Send notifications - FIX: Add explicit types
    let notificationCount = 0
    const templates = await db.getTemplates()
    const template = config.templateId ? 
      templates.find((t: any) => t.id === config.templateId) : null

    for (const user of targetedUsers) {
      await db.createNotification({
        userId: user.id,
        type: 'CYCLE_OPENED',
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
        priority: 'HIGH',
        status: 'UNREAD',
        actionRequired: true,
        actionUrl: `/kpis/create?cycleId=${cycle.id}${template ? `&templateId=${template.id}` : ''}`,
        metadata: {
          cycleId: cycle.id,
          templateId: config.templateId,
          dueDate: config.dueDate,
          sentBy: admin.id
        }
      })
      notificationCount++
    }

    // 4. Audit log
    await db.createAuditLog({
      actorId: admin.id,
      actorName: admin.name,
      actorRole: admin.role,
      entityType: 'CYCLE',
      entityId: cycle.id,
      action: 'CREATE_CYCLE_WITH_NOTIFICATION',
      afterData: {
        cycleName: config.cycleName,
        notificationsSent: notificationCount,
        targetedUsers: targetedUsers.length
      }
    })

    return { cycle, notificationsSent: notificationCount }
  }

  /**
   * ========================
   * CHANGE REQUEST MANAGEMENT
   * ========================
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
  }): Promise<any> {
    
    const admin = authService.getCurrentUser()
    if (!admin || admin.role !== 'ADMIN') {
      throw new Error('Admin access required')
    }

    const kpi = await db.getKpiDefinitionById(params.kpiId)
    if (!kpi) {
      throw new Error('KPI not found')
    }

    // 1. Update KPI status
    await db.updateKpiDefinition(params.kpiId, {
      status: 'CHANGE_REQUESTED',
      changeRequestedBy: admin.id,
      changeRequestedAt: new Date(),
      changeRequestReason: params.reason
    })

    // 2. Create Change Request
    const changeRequest = await db.createChangeRequest({
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
      requiresApproval: false
    })

    // 3. Notify user
    await db.createNotification({
      userId: kpi.userId,
      type: 'CHANGE_REQUEST',
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
      priority: params.urgency || 'MEDIUM',
      status: 'UNREAD',
      actionRequired: true,
      actionUrl: `/kpis/edit/${params.kpiId}?changeRequestId=${changeRequest.id}`,
      metadata: {
        changeRequestId: changeRequest.id,
        urgency: params.urgency || 'MEDIUM'
      }
    })

    // 4. Audit log
    await db.createAuditLog({
      actorId: admin.id,
      actorName: admin.name,
      actorRole: admin.role,
      entityType: 'CHANGE_REQUEST',
      entityId: changeRequest.id,
      action: 'REQUEST_KPI_CHANGE',
      afterData: {
        reason: params.reason,
        kpiId: params.kpiId,
        userId: kpi.userId
      }
    })

    return changeRequest
  }

  async approveKpiChangeCompletion(changeRequestId: string, approved: boolean, comment?: string): Promise<void> {
    const admin = authService.getCurrentUser()
    if (!admin || admin.role !== 'ADMIN') {
      throw new Error('Admin access required')
    }

    const changeRequests = await db.getChangeRequests({ 
      kpiDefinitionId: changeRequestId 
    })
    const changeRequest = changeRequests[0]
    
    if (!changeRequest) {
      throw new Error('Change request not found')
    }

    // Update change request
    await db.updateChangeRequest(changeRequestId, {
      status: approved ? 'APPROVED' : 'REJECTED',
      resolvedAt: new Date(),
      resolvedBy: admin.id,
      resolutionComment: comment
    })

    // Update KPI status
    await db.updateKpiDefinition(changeRequest.kpiDefinitionId, {
      status: approved ? 'SUBMITTED' : 'CHANGE_REQUESTED'
    })

    // Notify user
    const kpi = await db.getKpiDefinitionById(changeRequest.kpiDefinitionId)
    if (kpi) {
      await db.createNotification({
        userId: kpi.userId,
        type: approved ? 'KPI_APPROVED' : 'CHANGE_REQUEST',
        title: approved ? 'Yêu cầu chỉnh sửa đã được chấp nhận' : 'Yêu cầu chỉnh sửa cần điều chỉnh thêm',
        message: approved 
          ? `KPI "${kpi.title}" đã được phê duyệt sau khi chỉnh sửa.${comment ? `\n\nNhận xét: ${comment}` : ''}`
          : `KPI "${kpi.title}" cần chỉnh sửa thêm.${comment ? `\n\nNhận xét: ${comment}` : ''}`,
        priority: 'MEDIUM',
        status: 'UNREAD',
        actionRequired: !approved,
        actionUrl: approved ? `/kpis/${kpi.id}` : `/kpis/edit/${kpi.id}`
      })
    }

    await db.createAuditLog({
      actorId: admin.id,
      actorName: admin.name,
      actorRole: admin.role,
      entityType: 'CHANGE_REQUEST',
      entityId: changeRequestId,
      action: 'RESOLVE_CHANGE_REQUEST',
      afterData: { approved, comment }
    })
  }

  /**
   * ========================
   * COMPANY DOCUMENTS MANAGEMENT
   * ========================
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
  }): Promise<any> {
    
    const admin = authService.getCurrentUser()
    if (!admin || admin.role !== 'ADMIN') {
      throw new Error('Admin access required')
    }

    // Simulate file upload - In production, upload to S3/Cloud Storage
    const fileUrl = `https://storage.vicc.com/documents/${Date.now()}-${params.file.name}`

    const document = await db.createCompanyDocument({
      title: params.title,
      type: params.type,
      fileName: params.file.name,
      fileSize: params.file.size,
      fileType: params.file.type,
      storageUrl: fileUrl,
      department: params.department,
      uploadedBy: admin.id,
      tags: params.tags || [],
      description: params.description,
      isPublic: params.isPublic ?? true,
      aiIndexed: false
    })

    // AI Indexing if enabled
    if (params.enableAIIndexing) {
      await this.indexDocumentForAI(document.id)
    }

    await db.createAuditLog({
      actorId: admin.id,
      actorName: admin.name,
      actorRole: admin.role,
      entityType: 'DOCUMENT',
      entityId: document.id,
      action: 'UPLOAD_DOCUMENT',
      afterData: { title: params.title, type: params.type }
    })

    return document
  }

  async indexDocumentForAI(documentId: string): Promise<void> {
    const docs = await db.getCompanyDocuments()
    const doc = docs.find((d: any) => d.id === documentId)
    
    if (!doc) {
      throw new Error('Document not found')
    }

    // Simulate AI indexing
    console.log(`Indexing document for AI: ${doc.title}`)
    
    await db.updateCompanyDocument(documentId, {
      aiIndexed: true,
      aiIndexedAt: new Date()
    })

    const admin = authService.getCurrentUser()
    if (admin) {
      await db.createAuditLog({
        actorId: admin.id,
        actorName: admin.name,
        actorRole: admin.role,
        entityType: 'DOCUMENT',
        entityId: documentId,
        action: 'INDEX_DOCUMENT_AI',
        afterData: { title: doc.title }
      })
    }
  }

  async getCompanyDocuments(filters?: {
    type?: string
    department?: string
    aiIndexed?: boolean
  }): Promise<any[]> {
    return await db.getCompanyDocuments(filters)
  }

  async deleteCompanyDocument(documentId: string): Promise<void> {
    const admin = authService.getCurrentUser()
    if (!admin || admin.role !== 'ADMIN') {
      throw new Error('Admin access required')
    }

    const docs = await db.getCompanyDocuments()
    const doc = docs.find((d: any) => d.id === documentId)
    if (!doc) {
      throw new Error('Document not found')
    }

    await db.deleteCompanyDocument(documentId)

    await db.createAuditLog({
      actorId: admin.id,
      actorName: admin.name,
      actorRole: admin.role,
      entityType: 'DOCUMENT',
      entityId: documentId,
      action: 'DELETE_DOCUMENT',
      afterData: { title: doc.title }
    })
  }

  /**
   * ========================
   * APPROVAL HIERARCHY MANAGEMENT
   * ========================
   */

  async setupApprovalHierarchy(params: {
    userId: string
    level1ApproverId?: string
    level2ApproverId?: string
    level3ApproverId?: string
    effectiveFrom: string
    effectiveTo?: string
  }): Promise<any> {
    
    const admin = authService.getCurrentUser()
    if (!admin || admin.role !== 'ADMIN') {
      throw new Error('Admin access required')
    }

    // FIX: Deactivate old hierarchies with proper type annotations
    const oldHierarchies = await db.getApprovalHierarchies(params.userId)
    const activeOldHierarchies = oldHierarchies.filter((h: any) => h.isActive)
    
    for (const old of activeOldHierarchies) {
      await prisma.approvalHierarchy.update({
        where: { id: old.id },
        data: {
          isActive: false,
          effectiveTo: new Date()
        }
      })
    }

    // Create new hierarchy
    const hierarchy = await db.createApprovalHierarchy({
      userId: params.userId,
      level1ApproverId: params.level1ApproverId,
      level2ApproverId: params.level2ApproverId,
      level3ApproverId: params.level3ApproverId,
      effectiveFrom: new Date(params.effectiveFrom),
      effectiveTo: params.effectiveTo ? new Date(params.effectiveTo) : null,
      createdBy: admin.id,
      isActive: true
    })

    await db.createAuditLog({
      actorId: admin.id,
      actorName: admin.name,
      actorRole: admin.role,
      entityType: 'APPROVAL_HIERARCHY',
      entityId: hierarchy.id,
      action: 'SETUP_APPROVAL_HIERARCHY',
      afterData: params
    })

    return hierarchy
  }

  async getApprovalHierarchy(userId: string) {
    return await db.getActiveApprovalHierarchy(userId)
  }

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
          level3ApproverId: data.bodId,
          effectiveFrom: new Date().toISOString()
        })
        success++
      } catch (error: unknown) {
        console.error(`Failed to setup hierarchy for ${data.userId}:`, error)
        failed++
      }
    }

    await db.createAuditLog({
      actorId: admin.id,
      actorName: admin.name,
      actorRole: admin.role,
      entityType: 'APPROVAL_HIERARCHY',
      entityId: 'bulk',
      action: 'BULK_SETUP_HIERARCHY',
      afterData: { success, failed }
    })

    return { success, failed }
  }

  /**
   * ========================
   * HISTORICAL KPI DATA MANAGEMENT
   * ========================
   */

  async importHistoricalKpiData(data: HistoricalKpiData[]): Promise<{ imported: number }> {
    const admin = authService.getCurrentUser()
    if (!admin || admin.role !== 'ADMIN') {
      throw new Error('Admin access required')
    }

    await db.bulkCreateHistoricalKpiData(data)

    await db.createAuditLog({
      actorId: admin.id,
      actorName: admin.name,
      actorRole: admin.role,
      entityType: 'HISTORICAL_DATA',
      entityId: 'bulk',
      action: 'IMPORT_HISTORICAL_DATA',
      afterData: { count: data.length }
    })

    return { imported: data.length }
  }

  async getHistoricalKpiData(userId?: string, year?: number): Promise<any[]> {
    return await db.getHistoricalKpiData({ userId, year })
  }

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
   * ADMIN STATISTICS
   * ========================
   */

  async getAdminStatistics() {
    return await db.getAdminStatistics()
  }

  async getAdminAuditLogs(filters?: {
    action?: string
    dateFrom?: string
    dateTo?: string
    limit?: number
  }) {
    return await db.getAuditLogs(filters)
  }
}

export const adminService = new AdminServicePrisma()
export default adminService