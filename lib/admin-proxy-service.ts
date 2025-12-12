// lib/admin-proxy-service.ts - FIXED
import { storageService } from './storage-service';
import { authService } from './auth-service';
import { notificationService } from './notification-service';
import type { 
  Approval, 
  KpiDefinition, 
  KpiActual, 
  User,
  ProxyAction
} from './types';

class AdminProxyService {
  private readonly STORAGE_KEY = 'vicc_admin_proxy_actions';

  // ✅ FIXED: Helper method to get user
  private getUserById(userId: string): User | null {
    return storageService.getUserById(userId) || null;
  }

  async returnToStaff(params: {
    entityType: 'KPI' | 'ACTUAL';
    entityId: string;
    staffUserId: string;
    reason: string;
    comment?: string;
  }): Promise<{ success: boolean; message: string }> {
    const admin = authService.getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Admin access required' };
    }

    try {
      const entity = params.entityType === 'KPI' 
        ? storageService.getKpiDefinitionById(params.entityId)
        : storageService.getKpiActuals({ kpiDefinitionId: params.entityId })[0];

      if (!entity) {
        return { success: false, message: `${params.entityType} not found` };
      }

      // Update entity status
      if (params.entityType === 'KPI') {
        storageService.updateKpiDefinition(params.entityId, {
          status: 'DRAFT',
          updatedAt: new Date().toISOString(),
          changeRequestReason: params.comment
        });
      } else {
        storageService.updateKpiActual(params.entityId, {
          status: 'DRAFT',
          lastModifiedAt: new Date(),
          rejectionReason: params.comment
        });
      }

      // Cancel pending approvals
      const approvals = storageService.getApprovals(params.entityId, params.entityType);
      approvals
        .filter(a => a.status === 'PENDING')
        .forEach(a => {
          storageService.saveApproval({
            ...a,
            status: 'CANCELLED',
            comment: `Returned to staff by admin: ${params.reason}`,
            decidedAt: new Date().toISOString()
          });
        });

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
          reason: params.reason,
          comment: params.comment
        }
      );

      return { success: true, message: `${params.entityType} returned to staff successfully` };
    } catch (error: any) {
      return { success: false, message: `Failed: ${error.message}` };
    }
  }

  // ✅ FIXED: Update approveAsManager with 2 levels only
  async approveAsManager(params: {
    entityType: 'KPI' | 'ACTUAL';
    entityId: string;
    level: 1 | 2; // ✅ Changed from 1 | 2 | 3
    managerId: string;
    comment?: string;
    reason: string;
  }): Promise<{ success: boolean; message: string }> {
    const admin = authService.getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Admin access required' };
    }

    try {
      const manager = this.getUserById(params.managerId);
      if (!manager) {
        return { success: false, message: 'Manager not found' };
      }

      const approvals = storageService.getApprovals(params.entityId, params.entityType);
      const approval = approvals.find(a => 
        a.level === params.level && a.status === 'PENDING'
      );

      if (!approval) {
        return { success: false, message: 'Pending approval not found' };
      }

      // Update approval
      storageService.saveApproval({
        ...approval,
        status: 'APPROVED',
        decidedAt: new Date().toISOString(),
        comment: params.comment || `Approved by admin on behalf of ${manager.name}`,
        reassignedBy: admin.id,
        reassignedAt: new Date().toISOString(),
        reassignReason: params.reason
      });

      // Log action
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
        comment: params.comment
      };
      this.saveProxyAction(proxyAction);

      // Process workflow
      await this.processWorkflowAfterApproval(params.entityType, params.entityId, params.level);

      return { success: true, message: `Approved successfully as ${manager.name}` };
    } catch (error: any) {
      return { success: false, message: `Failed: ${error.message}` };
    }
  }

  // ✅ FIXED: rejectAsManager with 2 levels
  async rejectAsManager(params: {
    entityType: 'KPI' | 'ACTUAL';
    entityId: string;
    level: 1 | 2; // ✅ Changed
    managerId: string;
    comment: string;
    reason: string;
  }): Promise<{ success: boolean; message: string }> {
    const admin = authService.getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Admin access required' };
    }

    try {
      const manager = this.getUserById(params.managerId);
      if (!manager) {
        return { success: false, message: 'Manager not found' };
      }

      const approvals = storageService.getApprovals(params.entityId, params.entityType);
      const approval = approvals.find(a => 
        a.level === params.level && a.status === 'PENDING'
      );

      if (!approval) {
        return { success: false, message: 'Pending approval not found' };
      }

      storageService.saveApproval({
        ...approval,
        status: 'REJECTED',
        decidedAt: new Date().toISOString(),
        comment: `${params.comment} (Rejected by admin on behalf of ${manager.name})`,
        reassignedBy: admin.id,
        reassignedAt: new Date().toISOString(),
        reassignReason: params.reason
      });

      // Update entity
      if (params.entityType === 'KPI') {
        storageService.updateKpiDefinition(params.entityId, {
          status: 'REJECTED',
          updatedAt: new Date().toISOString(),
          rejectionReason: params.comment
        });
      } else {
        storageService.updateKpiActual(params.entityId, {
          status: 'REJECTED',
          lastModifiedAt: new Date(),
          rejectionReason: params.comment
        });
      }

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
        comment: params.comment
      };
      this.saveProxyAction(proxyAction);

      return { success: true, message: `Rejected successfully as ${manager.name}` };
    } catch (error: any) {
      return { success: false, message: `Failed: ${error.message}` };
    }
  }

  // ✅ FIXED: reassignApprover with 2 levels + updated valid roles
  async reassignApprover(params: {
    entityType: 'KPI' | 'ACTUAL';
    entityId: string;
    level: 1 | 2; // ✅ Changed
    newApproverId: string;
    reason: string;
    comment?: string;
  }): Promise<{ success: boolean; message: string }> {
    const admin = authService.getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Admin access required' };
    }

    try {
      const newApprover = this.getUserById(params.newApproverId);
      if (!newApprover) {
        return { success: false, message: 'New approver not found' };
      }

      // ✅ FIXED: Updated valid roles for 4-role system
      const validRoles = ['LINE_MANAGER', 'MANAGER'];
      if (!validRoles.includes(newApprover.role)) {
        return { success: false, message: 'New approver must be LINE_MANAGER or MANAGER' };
      }

      const approvals = storageService.getApprovals(params.entityId, params.entityType);
      const approval = approvals.find(a => 
        a.level === params.level && a.status === 'PENDING'
      );

      if (!approval) {
        return { success: false, message: 'Pending approval not found' };
      }

      const previousApproverId = approval.approverId;
      const previousApprover = this.getUserById(previousApproverId);

      storageService.saveApproval({
        ...approval,
        approverId: params.newApproverId,
        reassignedBy: admin.id,
        reassignedAt: new Date().toISOString(),
        reassignReason: params.reason,
        comment: params.comment
      });

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
        newApproverId: params.newApproverId
      };
      this.saveProxyAction(proxyAction);

      notificationService.createNotification(
        params.newApproverId,
        'APPROVAL_REQUIRED',
        `You have been assigned as approver (Level ${params.level})`,
        { entityId: params.entityId, level: params.level }
      );

      return {
        success: true,
        message: `Reassigned from ${previousApprover?.name || 'previous'} to ${newApprover.name}`
      };
    } catch (error: any) {
      return { success: false, message: `Failed: ${error.message}` };
    }
  }

  /**
   * Issue Change Request - Admin asks Staff to revise KPI
   */
  async issueChangeRequest(params: {
    entityType: 'KPI' | 'ACTUAL';
    entityId: string;
    staffUserId: string;
    reason: string;
    suggestions?: string;
    comment?: string;
  }): Promise<{ success: boolean; message: string }> {
    const admin = authService.getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, message: 'Admin access required' };
    }

    try {
      const entity = params.entityType === 'KPI'
        ? storageService.getKpiDefinitionById(params.entityId)
        : storageService.getKpiActuals({ kpiDefinitionId: params.entityId })[0];

      if (!entity) {
        return { success: false, message: `${params.entityType} not found` };
      }

      // Update entity status to CHANGE_REQUESTED
      if (params.entityType === 'KPI') {
        storageService.updateKpiDefinition(params.entityId, {
          status: 'CHANGE_REQUESTED',
          updatedAt: new Date().toISOString(),
          changeRequestedBy: admin.id,
          changeRequestedAt: new Date().toISOString(),
          changeRequestReason: params.reason
        });
      } else {
        storageService.updateKpiActual(params.entityId, {
          status: 'CHANGE_REQUESTED',
          lastModifiedAt: new Date(),
          rejectionReason: `${params.reason}${params.suggestions ? '\n\nSuggestions: ' + params.suggestions : ''}`
        });
      }

      // Cancel pending approvals
      const approvals = storageService.getApprovals(params.entityId, params.entityType);
      approvals
        .filter(a => a.status === 'PENDING')
        .forEach(a => {
          storageService.saveApproval({
            ...a,
            status: 'CANCELLED',
            comment: `Change requested by admin: ${params.reason}`,
            decidedAt: new Date().toISOString()
          });
        });

      // Log proxy action
      const proxyAction: ProxyAction = {
        id: `proxy-${Date.now()}`,
        actionType: 'ISSUE_CHANGE_REQUEST',
        performedBy: admin.id,
        performedAt: new Date().toISOString(),
        targetUserId: params.staffUserId,
        entityType: params.entityType,
        entityId: params.entityId,
        reason: params.reason,
        comment: params.suggestions || params.comment,
        metadata: params.suggestions ? JSON.stringify({ suggestions: params.suggestions }) : undefined
      };
      this.saveProxyAction(proxyAction);

      // Notify staff
      notificationService.createNotification(
        params.staffUserId,
        'CHANGE_REQUESTED',
        `Admin requested changes to your ${params.entityType.toLowerCase()}`,
        {
          entityId: params.entityId,
          reason: params.reason,
          suggestions: params.suggestions,
          comment: params.comment
        }
      );

      return { success: true, message: 'Change request issued successfully' };
    } catch (error: any) {
      return { success: false, message: `Failed: ${error.message}` };
    }
  }

  getProxyActions(filters?: {
    performedBy?: string;
    actionType?: ProxyAction['actionType'];
    entityType?: 'KPI' | 'ACTUAL';
    entityId?: string;
  }): ProxyAction[] {
    const actions = storageService.getItem<ProxyAction>(this.STORAGE_KEY);
    // Apply filters...
    return actions;
  }

  private saveProxyAction(action: ProxyAction): void {
    const actions = storageService.getItem<ProxyAction>(this.STORAGE_KEY);
    actions.push(action);
    storageService.setItem(this.STORAGE_KEY, actions);
  }

  // ✅ FIXED: processWorkflowAfterApproval with 2 levels
  private async processWorkflowAfterApproval(
    entityType: 'KPI' | 'ACTUAL',
    entityId: string,
    approvedLevel: number
  ): Promise<void> {
    if (approvedLevel === 2) { // ✅ Changed from 3
      if (entityType === 'KPI') {
        storageService.updateKpiDefinition(entityId, {
          status: 'APPROVED',
          approvedAt: new Date().toISOString()
        });
      } else {
        storageService.updateKpiActual(entityId, {
          status: 'APPROVED',
          approvedAt: new Date().toISOString()
        });
      }
    }
  }

  getStatistics(): {
    totalActions: number;
    byType: Record<ProxyAction['actionType'], number>;
    byAdmin: Record<string, number>;
    recentActions: ProxyAction[];
  } {
    const actions = this.getProxyActions();
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