// lib/kpi-service.ts
import { storageService } from './storage-service'
import { authService } from './auth-service'
import type {
  KpiDefinition,
  KpiActual,
  KpiStatus,
  Approval,
  ChangeRequest,
  User,
  KpiTemplate,
  Evidence
} from './types'

// Táº¡o hÃ m UUID Ä‘Æ¡n giáº£n
function generateUUID(): string {
  return 'xxxx-xxxx-4xxx-yxxx-xxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Import notification service sau Ä‘á»ƒ trÃ¡nh circular dependency
let notificationService: any = null
const getNotificationService = () => {
  if (!notificationService) {
    notificationService = require('./notification-service').notificationService
  }
  return notificationService
}



export type ApprovalLevel = 1 | 2

interface KpiSubmissionResult {
  success: boolean
  message: string
  kpiId?: string
  nextApprover?: User
}

interface ApprovalResult {
  success: boolean
  message: string
  nextStatus?: KpiStatus
  notifications?: string[]
}

class KpiService {
  /**
   * Create KPI from template
   */
  createKpiFromTemplate(
    templateId: string,
    cycleId: string,
    userId: string,
    customizations?: Partial<KpiDefinition>
  ): KpiDefinition[] {
    const templates = storageService.getTemplates()
    const template = templates.find(t => t.id === templateId)

    if (!template) {
      throw new Error('Template not found')
    }

    const user = authService.getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const kpis: KpiDefinition[] = (template.kpiFields || []).map(field => {
      const kpiId = `kpi-${generateUUID()}`

      const kpi: KpiDefinition = {
        id: kpiId,
        cycleId,
        userId,
        title: field.title,
        description: field.description || '',
        type: field.type,
        unit: field.unit,
        target: field.targetRange?.recommended || 0,
        weight: field.weight,
        dataSource: field.dataSource || '',
        formula: field.formula,
        orgUnitId: user.orgUnitId || 'org-vicc',
        ownerId: userId,
        contributors: [],
        status: 'DRAFT',
        createdFromTemplateId: templateId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...customizations
      }

      storageService.saveKpiDefinition(kpi)
      return kpi
    })

    // Create notification
    const ns = getNotificationService()
    if (ns) {
      ns.createNotification(
        userId,
        'KPI_CREATED',
        `${kpis.length} KPIs created from template: ${template.name}`,
        { templateId, kpiCount: kpis.length }
      )
    }

    return kpis
  }

  /**
   * Submit KPI for approval
   */
  async submitKpiForApproval(kpiId: string): Promise<KpiSubmissionResult> {
    const kpi = storageService.getKpiDefinitions({ status: 'DRAFT' })
      .find(k => k.id === kpiId)

    if (!kpi) {
      return {
        success: false,
        message: 'KPI not found or already submitted'
      }
    }

    // Validate KPI before submission
    const validation = this.validateKpiForSubmission(kpi)
    if (!validation.isValid) {
      return {
        success: false,
        message: validation.errors.join(', ')
      }
    }

    // Get user's line manager
    const user = authService.getCurrentUser()
    if (!user) {
      return {
        success: false,
        message: 'User not authenticated'
      }
    }

    const lineManager = this.getNextApprover(user, 1)
    if (!lineManager) {
      return {
        success: false,
        message: 'No line manager assigned. Please contact HR.'
      }
    }

    // Update KPI status
    storageService.updateKpiDefinition(kpiId, {
      status: 'WAITING_LINE_MGR',
      submittedAt: new Date().toISOString()
    })

    // Create approval record
    const approval: Approval = {
      id: `approval-${generateUUID()}`,
      entityId: kpiId,
      entityType: 'KPI',
      level: 1,
      approverId: lineManager.id,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    }
    storageService.saveApproval(approval)

    // Send notification to approver
    const ns = getNotificationService()
    if (ns) {
      ns.createNotification(
        lineManager.id,
        'APPROVAL_REQUIRED',
        `KPI approval required from ${user.name}`,
        { kpiId, submitterId: user.id }
      )
    }

    return {
      success: true,
      message: 'KPI submitted for approval successfully',
      kpiId,
      nextApprover: lineManager
    }
  }

  /**
   * Approve or reject KPI
   */
  async processApproval(
    kpiId: string,
    action: 'APPROVE' | 'REJECT',
    comment?: string
  ): Promise<ApprovalResult> {
    const kpi = storageService.getKpiDefinitions()
      .find(k => k.id === kpiId)

    if (!kpi) {
      return {
        success: false,
        message: 'KPI not found'
      }
    }

    const user = authService.getCurrentUser()
    if (!user) {
      return {
        success: false,
        message: 'User not authenticated'
      }
    }

    const userLevel = authService.getApprovalLevel()
    if (userLevel === 0) {
      return {
        success: false,
        message: 'You do not have approval authority'
      }
    }

    // Check if user is the designated approver
    const approvals = storageService.getApprovals(kpiId, 'KPI')
    const pendingApproval = approvals.find(
      a => a.level === userLevel && a.status === 'PENDING'
    )

    if (!pendingApproval || pendingApproval.approverId !== user.id) {
      return {
        success: false,
        message: 'You are not the designated approver for this KPI'
      }
    }

    if (action === 'APPROVE') {
      return this.approveKpi(kpi, userLevel, comment)
    } else {
      return this.rejectKpi(kpi, userLevel, comment)
    }
  }

  /**
   * Private: Approve KPI
   */
  private approveKpi(
    kpi: KpiDefinition,
    level: number,
    comment?: string
  ): ApprovalResult {
    const user = authService.getCurrentUser()!

    // Update approval record
    const approvals = storageService.getApprovals(kpi.id, 'KPI')
    const approval = approvals.find(a => a.level === level && a.status === 'PENDING')

    if (approval) {
      const updatedApproval: Approval = {
        ...approval,
        status: 'APPROVED',
        comment,
        decidedAt: new Date().toISOString()
      }
      storageService.saveApproval(updatedApproval)
    }

    let nextStatus: KpiStatus
    let notifications: string[] = []
    const ns = getNotificationService()

    // Determine next status based on level
    if (level === 1) {
      // Move to Manager (N+2)
      nextStatus = 'WAITING_MANAGER'

      const manager = this.getNextApprover(user, 2)
      if (manager) {
        const newApproval: Approval = {
          id: `approval-${generateUUID()}`,
          entityId: kpi.id,
          entityType: 'KPI',
          level: 2,
          approverId: manager.id,
          status: 'PENDING',
          createdAt: new Date().toISOString()
        }
        storageService.saveApproval(newApproval)

        if (ns) {
          ns.createNotification(
            manager.id,
            'APPROVAL_REQUIRED',
            `KPI approval required (Level 2)`,
            { kpiId: kpi.id }
          )
        }
        notifications.push(`Notification sent to ${manager.name}`)
      }
    } else if (level === 2) {
      // Final approval by Manager (N+2)
      nextStatus = 'APPROVED'

      // Lock goals
      setTimeout(() => {
        storageService.updateKpiDefinition(kpi.id, {
          status: 'LOCKED_GOALS',
          lockedAt: new Date().toISOString()
        })
      }, 100)

      if (ns) {
        ns.createNotification(
          kpi.userId,
          'KPI_APPROVED',
          'Your KPI has been fully approved',
          { kpiId: kpi.id }
        )
      }
      notifications.push(`KPI owner notified of approval`)
    } else {
      nextStatus = kpi.status as KpiStatus
    }

    // Update KPI status
    const updates: any = {
      status: nextStatus,
    }
    updates[`approvedByLevel${level}`] = user.id
    updates[`approvedAtLevel${level}`] = new Date().toISOString()

    storageService.updateKpiDefinition(kpi.id, updates)

    return {
      success: true,
      message: `KPI approved at level ${level}`,
      nextStatus,
      notifications
    }
  }

  /**
   * Private: Reject KPI
   */
  private rejectKpi(
    kpi: KpiDefinition,
    level: number,
    reason?: string
  ): ApprovalResult {
    const user = authService.getCurrentUser()!

    // Update approval record
    const approvals = storageService.getApprovals(kpi.id, 'KPI')
    const approval = approvals.find(a => a.level === level && a.status === 'PENDING')

    if (approval) {
      const updatedApproval: Approval = {
        ...approval,
        status: 'REJECTED',
        comment: reason,
        decidedAt: new Date().toISOString()
      }
      storageService.saveApproval(updatedApproval)
    }

    // Set status back to DRAFT for revision
    storageService.updateKpiDefinition(kpi.id, {
      status: 'DRAFT',
      rejectedBy: user.id,
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason
    })

    // Notify KPI owner
    const ns = getNotificationService()
    if (ns) {
      ns.createNotification(
        kpi.userId,
        'KPI_REJECTED',
        `Your KPI has been rejected at level ${level}`,
        {
          kpiId: kpi.id,
          reason,
          rejectedBy: user.name
        }
      )
    }

    return {
      success: true,
      message: `KPI rejected and sent back for revision`,
      nextStatus: 'DRAFT',
      notifications: [`KPI owner notified of rejection`]
    }
  }

  /**
   * Submit actuals for evaluation
   */
  async submitActuals(
    kpiId: string,
    actualValue: number,
    selfComment?: string,
    evidenceFiles?: Evidence[]
  ): Promise<KpiSubmissionResult> {
    const kpi = storageService.getKpiDefinitions()
      .find(k => k.id === kpiId && k.status === 'LOCKED_GOALS')

    if (!kpi) {
      return {
        success: false,
        message: 'KPI not found or goals not locked'
      }
    }

    const user = authService.getCurrentUser()
    if (!user) {
      return {
        success: false,
        message: 'User not authenticated'
      }
    }

    // Calculate score
    const { percentage, score } = this.calculateScore(kpi, actualValue)

    // Create or update actual
    const actualId = `actual-${generateUUID()}`
    const actual: KpiActual = {
      id: actualId,
      kpiDefinitionId: kpiId,
      actualValue,
      percentage,
      score,
      selfComment,
      status: 'SUBMITTED',
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }

    storageService.saveKpiActual(actual)

    // Save evidence files
    if (evidenceFiles && evidenceFiles.length > 0) {
      evidenceFiles.forEach(file => {
        storageService.saveEvidence({
          ...file,
          actualId
        })
      })
    }

    // Start approval process for actuals
    const lineManager = this.getNextApprover(user, 1)
    if (lineManager) {
      const approval: Approval = {
        id: `approval-${generateUUID()}`,
        entityId: actualId,
        entityType: 'ACTUAL',
        level: 1,
        approverId: lineManager.id,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      }
      storageService.saveApproval(approval)

      const ns = getNotificationService()
      if (ns) {
        ns.createNotification(
          lineManager.id,
          'ACTUAL_APPROVAL_REQUIRED',
          `Actual results submitted for approval`,
          { actualId, kpiId }
        )
      }
    }

    return {
      success: true,
      message: 'Actual results submitted successfully',
      kpiId: actualId
    }
  }

  /**
   * Calculate KPI score
   */
  private calculateScore(
    kpi: KpiDefinition,
    actualValue: number
  ): { percentage: number; score: number } {
    let percentage = 0

    switch (kpi.type) {
      case 'QUANT_HIGHER_BETTER':
        percentage = (actualValue / kpi.target) * 100
        break

      case 'QUANT_LOWER_BETTER':
        if (actualValue === 0 && kpi.target === 0) {
          percentage = 100
        } else if (actualValue === 0 && kpi.target > 0) {
          percentage = 150 // Max cap
        } else {
          percentage = (kpi.target / actualValue) * 100
        }
        break

      case 'MILESTONE':
        // Assuming actualValue is number of completed milestones
        percentage = actualValue * 100
        break

      case 'BOOLEAN':
        percentage = actualValue === 1 ? 100 : 0
        break

      /*
      case 'BEHAVIOR':
        // Direct score mapping for behavior (1-5 scale)
        percentage = actualValue * 20 // Convert 1-5 to percentage
        break
      */
    }

    // Apply max cap
    percentage = Math.min(percentage, 150)

    // Calculate score based on bands
    let score = 1
    if (percentage >= 120) score = 5
    else if (percentage >= 100) score = 4
    else if (percentage >= 80) score = 3
    else if (percentage >= 60) score = 2

    return { percentage, score }
  }

  /**
   * Validate KPI for submission
   */
  private validateKpiForSubmission(
    kpi: KpiDefinition
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!kpi.title || kpi.title.trim().length < 3) {
      errors.push('KPI title is required (min 3 characters)')
    }

    if (!kpi.target || kpi.target <= 0) {
      errors.push('Target must be greater than 0')
    }

    if (!kpi.weight || kpi.weight <= 0 || kpi.weight > 100) {
      errors.push('Weight must be between 1 and 100')
    }

    if (!kpi.type) {
      errors.push('KPI type is required')
    }

    if (!kpi.unit) {
      errors.push('Measurement unit is required')
    }

    // Check total weight for user's KPIs in same cycle
    const userKpis = storageService.getKpiDefinitions({
      userId: kpi.userId,
      cycleId: kpi.cycleId
    })

    const totalWeight = userKpis
      .filter(k => k.id !== kpi.id)
      .reduce((sum, k) => sum + (k.weight || 0), 0) + (kpi.weight || 0)

    if (totalWeight !== 100) {
      errors.push(`Total weight must equal 100% (current: ${totalWeight}%)`)
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Get next approver based on level
   */
  private getNextApprover(currentUser: User, targetLevel: number): User | null {
    // This is simplified - in real app, would query org hierarchy
    const approvers = {
      1: 'linehod@intersnack.com.vn',
      2: 'hod@intersnack.com.vn',
      3: 'bod@intersnack.com.vn'
    }

    const email = approvers[targetLevel as keyof typeof approvers]
    if (!email) return null

    // Mock user lookup - in real app would query user service
    return {
      id: `user-${targetLevel}`,
      email,
      name: `Approver Level ${targetLevel}`,
      role: targetLevel === 1 ? 'LINE_MANAGER' : 'MANAGER',
      orgUnitId: currentUser.orgUnitId,
      status: 'ACTIVE'
    } as User
  }

  /**
   * Get KPIs pending approval for current user
   */
  getPendingApprovals(): Array<{
    kpi: KpiDefinition
    approval: Approval
    submitter: User
  }> {
    const user = authService.getCurrentUser()
    if (!user) return []

    const level = authService.getApprovalLevel()
    if (level === 0) return []

    // Get all pending approvals for this user
    const allApprovals = storageService.getItem<Approval>('vicc_kpi_approvals')
    const pendingApprovals = allApprovals.filter(
      a => a.approverId === user.id &&
        a.status === 'PENDING' &&
        a.entityType === 'KPI'
    )

    return pendingApprovals.map(approval => {
      const kpi = storageService.getKpiDefinitions()
        .find(k => k.id === approval.entityId)!

      // Mock submitter lookup
      const submitter = {
        id: kpi.userId,
        name: 'Staff Member',
        email: 'staff@intersnack.com.vn',
        role: 'STAFF'
      } as User

      return { kpi, approval, submitter }
    })
  }
}

// Create singleton instance
export const kpiService = new KpiService()

// Export for convenience
export default kpiService