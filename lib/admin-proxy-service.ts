// lib/admin-proxy-service.ts
import { storageService } from './storage-service';
import { authService } from './auth-service';
import { notificationService } from './notification-service';
import { workflowService } from './workflow-service';

// Import types từ types.ts
import type { 
  Approval, 
  KpiDefinition, 
  KpiActual, 
  User,
  ProxyAction
} from './types';

// Remove duplicate interface declaration

class AdminProxyService {
  private readonly STORAGE_KEY = 'vicc_admin_proxy_actions';

  /**
   * ========================
   * RETURN TO STAFF
   * ========================
   */

  /**
   * Admin returns form back to staff for revision
   */
  async returnToStaff(params: {
    entityType: 'KPI' | 'ACTUAL';
    entityId: string;
    staffUserId: string;
    reason: string;
    comment?: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    const admin = authService.getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return {
        success: false,
        message: 'Admin access required'
      };
    }

    try {
      // Get entity
      const entity = params.entityType === 'KPI' 
        ? storageService.getItem<KpiDefinition>('vicc_kpi_definitions').find(k => k.id === params.entityId)
        : storageService.getItem<KpiActual>('vicc_kpi_actuals').find(a => a.id === params.entityId);

      if (!entity) {
        return {
          success: false,
          message: `${params.entityType} not found`
        };
      }

      // Update entity status to DRAFT
      if (params.entityType === 'KPI') {
        const kpis = storageService.getItem<KpiDefinition>('vicc_kpi_definitions');
        const kpi = kpis.find(k => k.id === params.entityId);
        if (kpi) {
          kpi.status = 'DRAFT';
          kpi.lastModifiedAt = new Date();
          kpi.adminNote = params.comment;
          storageService.setItem('vicc_kpi_definitions', kpis);
        }
      } else {
        const actuals = storageService.getItem<KpiActual>('vicc_kpi_actuals');
        const actual = actuals.find(a => a.id === params.entityId);
        if (actual) {
          actual.status = 'DRAFT';
          actual.lastModifiedAt = new Date();
          actual.adminNote = params.comment;
          storageService.setItem('vicc_kpi_actuals', actuals);
        }
      }

      // Cancel all pending approvals
      const approvals = storageService.getItem<Approval>('vicc_kpi_approvals');
      approvals
        .filter(a => a.entityId === params.entityId && a.status === 'PENDING')
        .forEach(a => {
          a.status = 'CANCELLED';
          a.comment = `Returned to staff by admin: ${params.reason}`;
          a.decidedAt = new Date().toISOString();
        });
      storageService.setItem('vicc_kpi_approvals', approvals);

      // Log proxy action
      const proxyAction: ProxyAction = {
        id: `proxy-${Date.now()}`,
        actionType: 'RETURN_TO_STAFF',
        performedBy: admin.id,
        performedAt: new Date().toISOString(),
        targetUserId: params.staffUserId,
        entityType: params.entityType,
        entityId: params.entityId,
        reason: params.reason,
        comment: params.comment
      };
      this.saveProxyAction(proxyAction);

      // Notify staff
      notificationService.createNotification(
        params.staffUserId,
        'KPI_REJECTED',
        `Admin returned your ${params.entityType.toLowerCase()} for revision`,
        {
          entityId: params.entityId,
          entityType: params.entityType,
          reason: params.reason,
          comment: params.comment,
          adminName: admin.name,
          actionUrl: params.entityType === 'KPI' 
            ? `/kpi/edit/${params.entityId}`
            : `/kpi/actual/edit/${params.entityId}`
        }
      );

      return {
        success: true,
        message: `${params.entityType} returned to staff successfully`
      };
    } catch (error: any) {
      console.error('Error returning to staff:', error);
      return {
        success: false,
        message: `Failed to return to staff: ${error.message}`
      };
    }
  }

  /**
   * ========================
   * APPROVE/REJECT AS MANAGER
   * ========================
   */

  /**
   * Admin approves on behalf of a manager
   */
  async approveAsManager(params: {
    entityType: 'KPI' | 'ACTUAL';
    entityId: string;
    level: 1 | 2 | 3; // LM=1, HoD=2, BOD=3
    managerId: string; // The manager being proxied
    comment?: string;
    reason: string; // Why admin is approving instead
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    const admin = authService.getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return {
        success: false,
        message: 'Admin access required'
      };
    }

    try {
      // Verify manager exists
      const manager = authService.getUserById(params.managerId);
      if (!manager) {
        return {
          success: false,
          message: 'Manager not found'
        };
      }

      // Get approval record
      const approvals = storageService.getItem<Approval>('vicc_kpi_approvals');
      const approval = approvals.find(a => 
        a.entityId === params.entityId && 
        a.entityType === params.entityType &&
        a.level === params.level &&
        a.status === 'PENDING'
      );

      if (!approval) {
        return {
          success: false,
          message: 'Pending approval not found at this level'
        };
      }

      // Update approval with proxy info
      approval.status = 'APPROVED';
      approval.decidedAt = new Date().toISOString();
      approval.comment = params.comment || `Approved by admin on behalf of ${manager.name}`;
      approval.reassignedBy = admin.id;
      approval.reassignedAt = new Date().toISOString();
      approval.reassignReason = params.reason;

      storageService.setItem('vicc_kpi_approvals', approvals);

      // Log proxy action
      const proxyAction: ProxyAction = {
        id: `proxy-${Date.now()}`,
        actionType: 'APPROVE_AS_MANAGER',
        performedBy: admin.id,
        performedAt: new Date().toISOString(),
        targetUserId: params.managerId,
        entityType: params.entityType,
        entityId: params.entityId,
        level: params.level,
        reason: params.reason,
        comment: params.comment,
        metadata: {
          managerName: manager.name,
          managerRole: manager.role
        }
      };
      this.saveProxyAction(proxyAction);

      // Process workflow continuation
      await this.processWorkflowAfterApproval(params.entityType, params.entityId, params.level);

      // Notify submitter
      const entity = this.getEntity(params.entityType, params.entityId);
      if (entity) {
        const submitterId = params.entityType === 'KPI' 
          ? (entity as KpiDefinition).userId 
          : (entity as KpiActual).userId;

        notificationService.createNotification(
          submitterId,
          params.entityType === 'KPI' ? 'KPI_APPROVED' : 'ACTUAL_APPROVED',
          `Your ${params.entityType.toLowerCase()} has been approved (Level ${params.level})`,
          {
            entityId: params.entityId,
            level: params.level,
            approverName: `${admin.name} (on behalf of ${manager.name})`,
            comment: params.comment
          }
        );
      }

      return {
        success: true,
        message: `${params.entityType} approved successfully as ${manager.name}`
      };
    } catch (error: any) {
      console.error('Error approving as manager:', error);
      return {
        success: false,
        message: `Failed to approve: ${error.message}`
      };
    }
  }

  /**
   * Admin rejects on behalf of a manager
   */
  async rejectAsManager(params: {
    entityType: 'KPI' | 'ACTUAL';
    entityId: string;
    level: 1 | 2 | 3;
    managerId: string;
    comment: string;
    reason: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    const admin = authService.getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return {
        success: false,
        message: 'Admin access required'
      };
    }

    try {
      const manager = authService.getUserById(params.managerId);
      if (!manager) {
        return {
          success: false,
          message: 'Manager not found'
        };
      }

      // Get approval record
      const approvals = storageService.getItem<Approval>('vicc_kpi_approvals');
      const approval = approvals.find(a => 
        a.entityId === params.entityId && 
        a.entityType === params.entityType &&
        a.level === params.level &&
        a.status === 'PENDING'
      );

      if (!approval) {
        return {
          success: false,
          message: 'Pending approval not found at this level'
        };
      }

      // Update approval
      approval.status = 'REJECTED';
      approval.decidedAt = new Date().toISOString();
      approval.comment = `${params.comment} (Rejected by admin on behalf of ${manager.name})`;
      approval.reassignedBy = admin.id;
      approval.reassignedAt = new Date().toISOString();
      approval.reassignReason = params.reason;

      storageService.setItem('vicc_kpi_approvals', approvals);

      // Update entity status
      if (params.entityType === 'KPI') {
        const kpis = storageService.getItem<KpiDefinition>('vicc_kpi_definitions');
        const kpi = kpis.find(k => k.id === params.entityId);
        if (kpi) {
          kpi.status = 'REJECTED';
          kpi.lastModifiedAt = new Date();
          storageService.setItem('vicc_kpi_definitions', kpis);
        }
      } else {
        const actuals = storageService.getItem<KpiActual>('vicc_kpi_actuals');
        const actual = actuals.find(a => a.id === params.entityId);
        if (actual) {
          actual.status = 'REJECTED';
          actual.lastModifiedAt = new Date();
          storageService.setItem('vicc_kpi_actuals', actuals);
        }
      }

      // Log proxy action
      const proxyAction: ProxyAction = {
        id: `proxy-${Date.now()}`,
        actionType: 'REJECT_AS_MANAGER',
        performedBy: admin.id,
        performedAt: new Date().toISOString(),
        targetUserId: params.managerId,
        entityType: params.entityType,
        entityId: params.entityId,
        level: params.level,
        reason: params.reason,
        comment: params.comment,
        metadata: {
          managerName: manager.name,
          managerRole: manager.role
        }
      };
      this.saveProxyAction(proxyAction);

      // Notify submitter
      const entity = this.getEntity(params.entityType, params.entityId);
      if (entity) {
        const submitterId = params.entityType === 'KPI' 
          ? (entity as KpiDefinition).userId 
          : (entity as KpiActual).userId;

        notificationService.createNotification(
          submitterId,
          params.entityType === 'KPI' ? 'KPI_REJECTED' : 'ACTUAL_REJECTED',
          `Your ${params.entityType.toLowerCase()} has been rejected (Level ${params.level})`,
          {
            entityId: params.entityId,
            level: params.level,
            approverName: `${admin.name} (on behalf of ${manager.name})`,
            comment: params.comment
          }
        );
      }

      return {
        success: true,
        message: `${params.entityType} rejected successfully as ${manager.name}`
      };
    } catch (error: any) {
      console.error('Error rejecting as manager:', error);
      return {
        success: false,
        message: `Failed to reject: ${error.message}`
      };
    }
  }

  /**
   * ========================
   * REASSIGN APPROVER
   * ========================
   */

  /**
   * Admin reassigns approver (for vacant positions or replacements)
   */
  async reassignApprover(params: {
    entityType: 'KPI' | 'ACTUAL';
    entityId: string;
    level: 1 | 2 | 3;
    newApproverId: string;
    reason: string;
    comment?: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    const admin = authService.getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return {
        success: false,
        message: 'Admin access required'
      };
    }

    try {
      // Verify new approver exists and has appropriate role
      const newApprover = authService.getUserById(params.newApproverId);
      if (!newApprover) {
        return {
          success: false,
          message: 'New approver not found'
        };
      }

      const validRoles = ['LINE_MANAGER', 'HEAD_OF_DEPT', 'BOD'];
      if (!validRoles.includes(newApprover.role)) {
        return {
          success: false,
          message: 'New approver must be a manager, head of department, or BOD member'
        };
      }

      // Get approval record
      const approvals = storageService.getItem<Approval>('vicc_kpi_approvals');
      const approval = approvals.find(a => 
        a.entityId === params.entityId && 
        a.entityType === params.entityType &&
        a.level === params.level &&
        a.status === 'PENDING'
      );

      if (!approval) {
        return {
          success: false,
          message: 'Pending approval not found at this level'
        };
      }

      const previousApproverId = approval.approverId;
      const previousApprover = authService.getUserById(previousApproverId);

      // Update approval
      approval.approverId = params.newApproverId;
      approval.reassignedBy = admin.id;
      approval.reassignedAt = new Date().toISOString();
      approval.reassignReason = params.reason;
      if (params.comment) {
        approval.comment = params.comment;
      }

      storageService.setItem('vicc_kpi_approvals', approvals);

      // Log proxy action
      const proxyAction: ProxyAction = {
        id: `proxy-${Date.now()}`,
        actionType: 'REASSIGN_APPROVER',
        performedBy: admin.id,
        performedAt: new Date().toISOString(),
        entityType: params.entityType,
        entityId: params.entityId,
        level: params.level,
        reason: params.reason,
        comment: params.comment,
        previousApproverId,
        newApproverId: params.newApproverId,
        metadata: {
          previousApproverName: previousApprover?.name || 'Unknown',
          newApproverName: newApprover.name
        }
      };
      this.saveProxyAction(proxyAction);

      // Notify new approver
      notificationService.createNotification(
        params.newApproverId,
        'APPROVAL_REQUIRED',
        `You have been assigned as approver (Level ${params.level})`,
        {
          entityId: params.entityId,
          entityType: params.entityType,
          level: params.level,
          reason: params.reason,
          previousApprover: previousApprover?.name || 'Previous approver',
          actionUrl: params.entityType === 'KPI' 
            ? `/approvals/kpi/${params.entityId}`
            : `/approvals/actual/${params.entityId}`
        }
      );

      // Notify submitter about reassignment
      const entity = this.getEntity(params.entityType, params.entityId);
      if (entity) {
        const submitterId = params.entityType === 'KPI' 
          ? (entity as KpiDefinition).userId 
          : (entity as KpiActual).userId;

        notificationService.createNotification(
          submitterId,
          'SYSTEM',
          `Approver reassigned for your ${params.entityType.toLowerCase()}`,
          {
            entityId: params.entityId,
            level: params.level,
            newApproverName: newApprover.name,
            reason: params.reason
          }
        );
      }

      return {
        success: true,
        message: `Approver reassigned successfully from ${previousApprover?.name || 'previous'} to ${newApprover.name}`
      };
    } catch (error: any) {
      console.error('Error reassigning approver:', error);
      return {
        success: false,
        message: `Failed to reassign: ${error.message}`
      };
    }
  }

  /**
   * ========================
   * QUERY & UTILITY METHODS
   * ========================
   */

  /**
   * Get proxy actions history
   */
  getProxyActions(filters?: {
    performedBy?: string;
    actionType?: ProxyAction['actionType'];
    entityType?: 'KPI' | 'ACTUAL';
    entityId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): ProxyAction[] {
    let actions = storageService.getItem<ProxyAction>(this.STORAGE_KEY);

    if (filters) {
      if (filters.performedBy) {
        actions = actions.filter(a => a.performedBy === filters.performedBy);
      }
      if (filters.actionType) {
        actions = actions.filter(a => a.actionType === filters.actionType);
      }
      if (filters.entityType) {
        actions = actions.filter(a => a.entityType === filters.entityType);
      }
      if (filters.entityId) {
        actions = actions.filter(a => a.entityId === filters.entityId);
      }
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        actions = actions.filter(a => new Date(a.performedAt) >= fromDate);
      }
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        actions = actions.filter(a => new Date(a.performedAt) <= toDate);
      }
    }

    return actions.sort((a, b) => 
      new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
    );
  }

  /**
   * Get proxy actions for specific entity
   */
  getEntityProxyHistory(entityType: 'KPI' | 'ACTUAL', entityId: string): ProxyAction[] {
    return this.getProxyActions({ entityType, entityId });
  }

  /**
   * Save proxy action
   */
  private saveProxyAction(action: ProxyAction): void {
    const actions = storageService.getItem<ProxyAction>(this.STORAGE_KEY);
    actions.push(action);
    storageService.setItem(this.STORAGE_KEY, actions);
  }

  /**
   * Get entity (KPI or Actual)
   */
  private getEntity(entityType: 'KPI' | 'ACTUAL', entityId: string): KpiDefinition | KpiActual | null {
    if (entityType === 'KPI') {
      const kpis = storageService.getItem<KpiDefinition>('vicc_kpi_definitions');
      return kpis.find(k => k.id === entityId) || null;
    } else {
      const actuals = storageService.getItem<KpiActual>('vicc_kpi_actuals');
      return actuals.find(a => a.id === entityId) || null;
    }
  }

  /**
   * Process workflow after approval
   */
  private async processWorkflowAfterApproval(
    entityType: 'KPI' | 'ACTUAL',
    entityId: string,
    approvedLevel: number
  ): Promise<void> {
    // If level 3 (final), mark as approved
    if (approvedLevel === 3) {
      if (entityType === 'KPI') {
        const kpis = storageService.getItem<KpiDefinition>('vicc_kpi_definitions');
        const kpi = kpis.find(k => k.id === entityId);
        if (kpi) {
          kpi.status = 'APPROVED';
          kpi.approvedAt = new Date().toISOString();
          storageService.saveItem('vicc_kpi_definitions', kpis);
        }
      } else {
        const actuals = storageService.getItem<KpiActual>('vicc_kpi_actuals');
        const actual = actuals.find(a => a.id === entityId);
        if (actual) {
          actual.status = 'APPROVED';
          actual.approvedAt = new Date().toISOString();
          storageService.saveItem('vicc_kpi_actuals', actuals);
        }
      }
    } else {
      // Create next level approval
      const nextLevel = approvedLevel + 1;
      // This would typically call workflowService to create next approval
      // Implementation depends on existing workflow logic
    }
  }

  /**
   * Get statistics
   */
  getStatistics(dateFrom?: string, dateTo?: string): {
    totalActions: number;
    byType: Record<ProxyAction['actionType'], number>;
    byAdmin: Record<string, number>;
    recentActions: ProxyAction[];
  } {
    const actions = this.getProxyActions({ dateFrom, dateTo });

    const byType: Record<string, number> = {
      'RETURN_TO_STAFF': 0,
      'APPROVE_AS_MANAGER': 0,
      'REJECT_AS_MANAGER': 0,
      'REASSIGN_APPROVER': 0
    };

    const byAdmin: Record<string, number> = {};

    actions.forEach(action => {
      byType[action.actionType] = (byType[action.actionType] || 0) + 1;
      byAdmin[action.performedBy] = (byAdmin[action.performedBy] || 0) + 1;
    });

    return {
      totalActions: actions.length,
      byType: byType as Record<ProxyAction['actionType'], number>,
      byAdmin,
      recentActions: actions.slice(0, 10)
    };
  }
}

export const adminProxyService = new AdminProxyService();