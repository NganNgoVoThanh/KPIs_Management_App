// lib/workflow-service.ts
import { storageService } from './storage-service'
import { authService } from './auth-service'
import { notificationService } from './notification-service'
import type { 
  KpiDefinition, 
  KpiActual, 
  Approval, 
  ChangeRequest,
  User,
  ApprovalStatus
} from './types'

// Simple UUID generator (removing v4 import)
function generateUUID(): string {
  return 'xxxx-xxxx-4xxx-yxxx-xxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export interface WorkflowStep {
  level: number
  role: string
  status: ApprovalStatus
  approver?: User | null
  decidedAt?: string
  comment?: string
}

export interface WorkflowState {
  entityId: string
  entityType: 'KPI' | 'ACTUAL' | 'CHANGE_REQUEST'
  currentLevel: number
  steps: WorkflowStep[]
  status: 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED'
  createdAt: string
  completedAt?: string
}

export interface ApprovalQueue {
  pending: Array<{
    entity: KpiDefinition | KpiActual | ChangeRequest
    approval: Approval
    submitter: User
    daysPending: number
  }>
  approved: Approval[]
  rejected: Approval[]
}

class WorkflowService {
  /**
   * Get approval workflow configuration
   */
  getWorkflowConfig(): WorkflowStep[] {
    return [
      { level: 1, role: 'LINE_MANAGER', status: 'PENDING' },
      { level: 2, role: 'HEAD_OF_DEPT', status: 'PENDING' },
      { level: 3, role: 'BOD', status: 'PENDING' }
    ]
  }

  /**
   * Initialize workflow for an entity
   */
  initializeWorkflow(
    entityId: string,
    entityType: 'KPI' | 'ACTUAL' | 'CHANGE_REQUEST',
    submitterId: string
  ): WorkflowState {
    const steps = this.getWorkflowConfig()
    
    // Assign approvers based on org hierarchy
    const enhancedSteps = steps.map(step => ({
      ...step,
      approver: this.getApproverForLevel(submitterId, step.level)
    }))

    const workflow: WorkflowState = {
      entityId,
      entityType,
      currentLevel: 1,
      steps: enhancedSteps,
      status: 'IN_PROGRESS',
      createdAt: new Date().toISOString()
    }

    // Create first approval
    const firstApprover = enhancedSteps[0].approver
    if (firstApprover) {
      this.createApprovalRequest(
        entityId,
        entityType,
        1,
        firstApprover.id
      )
    }

    return workflow
  }

  /**
   * Process approval decision
   */
  async processApproval(
    entityId: string,
    entityType: 'KPI' | 'ACTUAL' | 'CHANGE_REQUEST',
    action: 'APPROVE' | 'REJECT',
    comment?: string
  ): Promise<{
    success: boolean
    message: string
    nextStep?: WorkflowStep
  }> {
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

    // Get pending approval
    const approvals = storageService.getApprovals(entityId, entityType)
    const pendingApproval = approvals.find(
      a => a.level === userLevel && 
           a.status === 'PENDING' &&
           a.approverId === user.id
    )

    if (!pendingApproval) {
      return {
        success: false,
        message: 'No pending approval found for you'
      }
    }

    // Update approval
    const updatedApproval: Approval = {
      ...pendingApproval,
      status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      comment,
      decidedAt: new Date().toISOString()
    }
    storageService.saveApproval(updatedApproval)

    if (action === 'APPROVE') {
      return this.handleApproval(entityId, entityType, userLevel)
    } else {
      return this.handleRejection(entityId, entityType, userLevel, comment)
    }
  }

  /**
   * Handle approval action
   */
  private async handleApproval(
    entityId: string,
    entityType: 'KPI' | 'ACTUAL' | 'CHANGE_REQUEST',
    currentLevel: number
  ): Promise<{
    success: boolean
    message: string
    nextStep?: WorkflowStep
  }> {
    const maxLevel = 3
    
    if (currentLevel < maxLevel) {
      // Move to next level
      const nextLevel = currentLevel + 1
      const nextApprover = this.getApproverForLevel(entityId, nextLevel)
      
      if (nextApprover) {
        // Create next approval
        this.createApprovalRequest(
          entityId,
          entityType,
          nextLevel,
          nextApprover.id
        )

        // Update entity status
        this.updateEntityStatus(entityId, entityType, `PENDING_${this.getLevelCode(nextLevel)}`)

        // Send notification
        notificationService.createNotification(
          nextApprover.id,
          'APPROVAL_REQUIRED',
          `${entityType} approval required (Level ${nextLevel})`,
          { entityId, entityType, level: nextLevel }
        )

        return {
          success: true,
          message: `Approved at level ${currentLevel}. Sent to level ${nextLevel}.`,
          nextStep: {
            level: nextLevel,
            role: this.getRoleForLevel(nextLevel),
            status: 'PENDING',
            approver: nextApprover
          }
        }
      }
    } else {
      // Final approval
      this.updateEntityStatus(entityId, entityType, 'APPROVED')
      
      // Notify submitter
      const entity = this.getEntity(entityId, entityType)
      if (entity && 'userId' in entity) {
        notificationService.createNotification(
          entity.userId,
          entityType === 'KPI' ? 'KPI_APPROVED' : 
          entityType === 'ACTUAL' ? 'ACTUAL_APPROVED' : 
          'CHANGE_REQUEST',
          `Your ${entityType.toLowerCase()} has been fully approved`,
          { entityId }
        )
      }

      return {
        success: true,
        message: 'Final approval completed'
      }
    }

    return {
      success: false,
      message: 'Approval processing failed'
    }
  }

  /**
   * Handle rejection action
   */
  private async handleRejection(
    entityId: string,
    entityType: 'KPI' | 'ACTUAL' | 'CHANGE_REQUEST',
    level: number,
    reason?: string
  ): Promise<{
    success: boolean
    message: string
  }> {
    // Update entity status
    this.updateEntityStatus(entityId, entityType, 'REJECTED', reason)
    
    // Cancel pending approvals
    const approvals = storageService.getApprovals(entityId, entityType)
    approvals
      .filter(a => a.status === 'PENDING')
      .forEach(a => {
        storageService.saveApproval({
          ...a,
          status: 'CANCELLED',
          decidedAt: new Date().toISOString()
        })
      })

    // Notify submitter
    const entity = this.getEntity(entityId, entityType)
    if (entity && 'userId' in entity) {
      notificationService.createNotification(
        entity.userId,
        entityType === 'KPI' ? 'KPI_REJECTED' : 
        entityType === 'ACTUAL' ? 'ACTUAL_REJECTED' : 
        'CHANGE_REQUEST',
        `Your ${entityType.toLowerCase()} has been rejected at level ${level}`,
        { entityId, reason, level }
      )
    }

    return {
      success: true,
      message: `${entityType} rejected and sent back for revision`
    }
  }

  /**
   * Get approval queue for user
   */
  getApprovalQueue(userId: string, role: string): ApprovalQueue {
    const level = this.getLevelForRole(role)
    const allApprovals = storageService.getItem<Approval>('vicc_kpi_approvals')
    
    // Filter approvals for this user
    const userApprovals = allApprovals.filter(a => a.approverId === userId)
    
    const pending = userApprovals
      .filter(a => a.status === 'PENDING')
      .map(approval => {
        const entity = this.getEntity(approval.entityId, approval.entityType)
        const submitter = this.getSubmitter(entity)
        const daysPending = Math.floor(
          (Date.now() - new Date(approval.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        )
        
        return {
          entity: entity!,
          approval,
          submitter: submitter!,
          daysPending
        }
      })
      .filter(item => item.entity && item.submitter)

    const approved = userApprovals.filter(a => a.status === 'APPROVED')
    const rejected = userApprovals.filter(a => a.status === 'REJECTED')

    return {
      pending: pending.sort((a, b) => b.daysPending - a.daysPending),
      approved: approved.sort((a, b) => 
        new Date(b.decidedAt!).getTime() - new Date(a.decidedAt!).getTime()
      ),
      rejected: rejected.sort((a, b) => 
        new Date(b.decidedAt!).getTime() - new Date(a.decidedAt!).getTime()
      )
    }
  }

  /**
   * Delegate approval to another user
   */
  async delegateApproval(
    approvalId: string,
    delegateToUserId: string,
    reason?: string
  ): Promise<{
    success: boolean
    message: string
  }> {
    const approvals = storageService.getItem<Approval>('vicc_kpi_approvals')
    const approval = approvals.find(a => a.id === approvalId)
    
    if (!approval || approval.status !== 'PENDING') {
      return {
        success: false,
        message: 'Approval not found or not pending'
      }
    }

    // Update approval
    const updatedApproval: Approval = {
      ...approval,
      approverId: delegateToUserId,
      delegatedTo: delegateToUserId,
      delegatedAt: new Date().toISOString()
    }
    storageService.saveApproval(updatedApproval)

    // Notify new approver
    notificationService.createNotification(
      delegateToUserId,
      'APPROVAL_REQUIRED',
      `Approval delegated to you: ${approval.entityType}`,
      { 
        approvalId,
        delegatedFrom: approval.approverId,
        reason 
      }
    )

    return {
      success: true,
      message: 'Approval delegated successfully'
    }
  }

  /**
   * Escalate overdue approvals
   */
  escalateOverdueApprovals(): void {
    const approvals = storageService.getItem<Approval>('vicc_kpi_approvals')
    const sladays = 3 // SLA for each approval level
    const now = new Date()
    
    approvals
      .filter(a => a.status === 'PENDING')
      .forEach(approval => {
        const createdAt = new Date(approval.createdAt)
        const daysPending = Math.floor(
          (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
        )
        
        if (daysPending > sladays) {
          // Send reminder
          notificationService.createNotification(
            approval.approverId,
            'REMINDER',
            `Overdue approval: ${approval.entityType} pending for ${daysPending} days`,
            { 
              approvalId: approval.id,
              daysPending,
              slaViolation: true 
            }
          )
          
          // Escalate to manager if very overdue
          if (daysPending > sladays * 2) {
            const manager = this.getManagerOf(approval.approverId)
            if (manager) {
              notificationService.createNotification(
                manager.id,
                'SYSTEM',
                `Escalation: ${approval.entityType} approval overdue by ${daysPending} days`,
                { 
                  approvalId: approval.id,
                  approverId: approval.approverId,
                  daysPending 
                }
              )
            }
          }
        }
      })
  }

  /**
   * Private helper methods
   */
  private createApprovalRequest(
    entityId: string,
    entityType: 'KPI' | 'ACTUAL' | 'CHANGE_REQUEST',
    level: number,
    approverId: string
  ): Approval {
    const approval: Approval = {
      id: `approval-${generateUUID()}`,
      entityId,
      entityType,
      level: level as 1 | 2 | 3,
      approverId,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    }
    
    storageService.saveApproval(approval)
    return approval
  }

  private updateEntityStatus(
    entityId: string,
    entityType: 'KPI' | 'ACTUAL' | 'CHANGE_REQUEST',
    status: string,
    reason?: string
  ): void {
    switch (entityType) {
      case 'KPI':
        storageService.updateKpiDefinition(entityId, { 
          status: status as any,
          rejectionReason: reason 
        } as Partial<KpiDefinition>)
        break
      case 'ACTUAL':
        storageService.updateKpiActual(entityId, { 
          status: status as any,
          rejectionReason: reason 
        } as Partial<KpiActual>)
        break
      case 'CHANGE_REQUEST':
        storageService.updateItem('vicc_kpi_change_requests', entityId, { 
          status,
          rejectionReason: reason 
        } as any)
        break
    }
  }

  private getEntity(
    entityId: string,
    entityType: 'KPI' | 'ACTUAL' | 'CHANGE_REQUEST'
  ): any {
    switch (entityType) {
      case 'KPI':
        return storageService.getKpiDefinitions().find(k => k.id === entityId)
      case 'ACTUAL':
        return storageService.getKpiActuals().find(a => a.id === entityId)
      case 'CHANGE_REQUEST':
        return storageService.getChangeRequests().find(c => c.id === entityId)
      default:
        return null
    }
  }

  private getSubmitter(entity: any): User | null {
    if (!entity) return null
    
    const userId = entity.userId || entity.requesterId || entity.submitterId
    if (!userId) return null
    
    // Mock user lookup - in real app would query user service
    return {
      id: userId,
      name: 'Staff Member',
      email: 'staff@intersnack.com.vn',
      role: 'STAFF',
      orgUnitId: 'org-vicc',
      status: 'ACTIVE'
    } as User
  }

  private getApproverForLevel(entityOrUserId: string, level: number): User | null {
    // Mock implementation - in real app would query org hierarchy
    const approvers: Record<number, string> = {
      1: 'linemanager@intersnack.com.vn',
      2: 'hod@intersnack.com.vn',
      3: 'bod@intersnack.com.vn'
    }

    const email = approvers[level]
    if (!email) return null

    return {
      id: `user-level-${level}`,
      email,
      name: `Level ${level} Approver`,
      role: level === 1 ? 'LINE_MANAGER' : 
            level === 2 ? 'HEAD_OF_DEPT' : 'BOD',
      orgUnitId: 'org-vicc',
      status: 'ACTIVE'
    } as User
  }

  private getManagerOf(userId: string): User | null {
    // Mock implementation
    return {
      id: 'user-manager',
      email: 'bod@intersnack.com.vn',
      name: 'Manager',
      role: 'BOD',
      orgUnitId: 'org-vicc',
      status: 'ACTIVE'
    } as User
  }

  private getLevelCode(level: number): string {
    const codes: Record<number, string> = {
      1: 'LM',
      2: 'HOD',
      3: 'BOD'
    }
    return codes[level] || 'UNKNOWN'
  }

  private getRoleForLevel(level: number): string {
    const roles: Record<number, string> = {
      1: 'LINE_MANAGER',
      2: 'HEAD_OF_DEPT',
      3: 'BOD'
    }
    return roles[level] || 'UNKNOWN'
  }

  private getLevelForRole(role: string): number {
    const levels: Record<string, number> = {
      'LINE_MANAGER': 1,
      'HEAD_OF_DEPT': 2,
      'BOD': 3
    }
    return levels[role] || 0
  }
}

// Create singleton instance
export const workflowService = new WorkflowService()

// Set up periodic escalation checks
if (typeof window !== 'undefined') {
  setInterval(() => {
    workflowService.escalateOverdueApprovals()
  }, 4 * 60 * 60 * 1000) // Every 4 hours
}

export default workflowService