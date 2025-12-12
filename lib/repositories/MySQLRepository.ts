// lib/repositories/MySQLRepository.ts
// MySQL/Prisma Implementation of IDatabaseRepository
// This is a wrapper around the existing DatabaseService (Prisma)

import { PrismaClient } from '@prisma/client'
import { IDatabaseRepository } from './IRepository'

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Lazy-load Prisma Client - only initialize when MySQLRepository is actually instantiated
function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  }
  return globalForPrisma.prisma
}

// Export prisma client getter for backward compatibility
// Use this with caution - it will initialize Prisma even if DB_TYPE=onelake
export const getPrisma = getPrismaClient

export class MySQLRepository implements IDatabaseRepository {
  private client: PrismaClient

  constructor(client?: PrismaClient) {
    // Only initialize Prisma when MySQLRepository is constructed
    this.client = client || getPrismaClient()
  }

  // ==================== CONNECTION MANAGEMENT ====================

  async connect(): Promise<void> {
    await this.client.$connect()
  }

  async disconnect(): Promise<void> {
    await this.client.$disconnect()
  }

  async transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return await this.client.$transaction(fn)
  }

  // ==================== USER OPERATIONS ====================

  async getUsers(filters?: { role?: string; department?: string; status?: string }) {
    return await this.client.user.findMany({
      where: {
        ...(filters?.role && { role: filters.role }),
        ...(filters?.department && { department: filters.department }),
        ...(filters?.status && { status: filters.status }),
      },
      include: {
        orgUnit: true,
        manager: true,
      },
      orderBy: {
        name: 'asc'
      }
    })
  }

  async getUserById(id: string) {
    return await this.client.user.findUnique({
      where: { id },
      include: {
        orgUnit: true,
        manager: true,
      }
    })
  }

  async getUserByEmail(email: string) {
    return await this.client.user.findUnique({
      where: { email },
      include: {
        orgUnit: true,
      }
    })
  }

  async createUser(data: any) {
    return await this.client.user.create({
      data,
      include: {
        orgUnit: true,
      }
    })
  }

  async updateUser(id: string, data: any) {
    return await this.client.user.update({
      where: { id },
      data,
    })
  }

  // ==================== ORG UNIT OPERATIONS ====================

  async getOrgUnits(filters?: { type?: string; parentId?: string }) {
    return await this.client.orgUnit.findMany({
      where: {
        ...(filters?.type && { type: filters.type }),
        ...(filters?.parentId && { parentId: filters.parentId }),
      },
      include: {
        parent: true,
        users: true,
      },
      orderBy: {
        name: 'asc'
      }
    })
  }

  async createOrgUnit(data: any) {
    return await this.client.orgUnit.create({
      data,
    })
  }

  // ==================== CYCLE OPERATIONS ====================

  async getCycles(status?: string) {
    return await this.client.cycle.findMany({
      where: status ? { status } : undefined,
      include: {
        creator: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }

  async getCycleById(id: string) {
    return await this.client.cycle.findUnique({
      where: { id },
      include: {
        creator: true,
        kpiDefinitions: true,
      }
    })
  }

  async createCycle(data: any) {
    return await this.client.cycle.create({
      data,
      include: {
        creator: true,
      }
    })
  }

  async updateCycle(id: string, data: any) {
    return await this.client.cycle.update({
      where: { id },
      data,
    })
  }

  async getActiveCycle() {
    return await this.client.cycle.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }

  // ==================== KPI DEFINITION OPERATIONS ====================

  async getKpiDefinitions(filters?: {
    cycleId?: string
    userId?: string
    status?: string
    orgUnitId?: string
  }) {
    return await this.client.kpiDefinition.findMany({
      where: {
        ...(filters?.cycleId && { cycleId: filters.cycleId }),
        ...(filters?.userId && { userId: filters.userId }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.orgUnitId && { orgUnitId: filters.orgUnitId }),
      },
      include: {
        cycle: true,
        user: true,
        orgUnit: true,
        actuals: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }

  async getKpiDefinitionById(id: string) {
    return await this.client.kpiDefinition.findUnique({
      where: { id },
      include: {
        cycle: true,
        user: true,
        orgUnit: true,
        actuals: {
          include: {
            evidences: true
          }
        },
        approvals: {
          include: {
            approver: true
          }
        }
      }
    })
  }

  async createKpiDefinition(data: any) {
    return await this.client.kpiDefinition.create({
      data,
      include: {
        cycle: true,
        user: true,
      }
    })
  }

  async updateKpiDefinition(id: string, data: any) {
    return await this.client.kpiDefinition.update({
      where: { id },
      data,
    })
  }

  async deleteKpiDefinition(id: string) {
    return await this.client.kpiDefinition.delete({
      where: { id }
    })
  }

  // ==================== KPI ACTUAL OPERATIONS ====================

  async getKpiActuals(filters?: { kpiDefinitionId?: string; status?: string }) {
    return await this.client.kpiActual.findMany({
      where: {
        ...(filters?.kpiDefinitionId && { kpiDefinitionId: filters.kpiDefinitionId }),
        ...(filters?.status && { status: filters.status }),
      },
      include: {
        kpiDefinition: true,
        evidences: true,
        approvals: {
          include: {
            approver: true
          }
        }
      }
    })
  }

  async getKpiActualById(id: string) {
    return await this.client.kpiActual.findUnique({
      where: { id },
      include: {
        kpiDefinition: true,
        evidences: true,
        approvals: {
          include: {
            approver: true
          }
        }
      }
    })
  }

  async createKpiActual(data: any) {
    return await this.client.kpiActual.create({
      data,
      include: {
        kpiDefinition: true,
        evidences: true,
      }
    })
  }

  async updateKpiActual(id: string, data: any) {
    return await this.client.kpiActual.update({
      where: { id },
      data,
    })
  }

  async deleteKpiActual(id: string) {
    return await this.client.kpiActual.delete({
      where: { id }
    })
  }

  // ==================== APPROVAL OPERATIONS ====================

  async getApprovals(filters?: {
    approverId?: string
    status?: string
    entityType?: string
  }) {
    return await this.client.approval.findMany({
      where: {
        ...(filters?.approverId && { approverId: filters.approverId }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.entityType && { entityType: filters.entityType }),
      },
      include: {
        approver: true,
        kpiDefinition: true,
        actual: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }

  async getApprovalById(id: string) {
    return await this.client.approval.findUnique({
      where: { id },
      include: {
        approver: true,
        kpiDefinition: true,
        actual: true,
      }
    })
  }

  async createApproval(data: any) {
    return await this.client.approval.create({
      data,
      include: {
        approver: true,
      }
    })
  }

  async updateApproval(id: string, data: any) {
    return await this.client.approval.update({
      where: { id },
      data,
    })
  }

  // ==================== CHANGE REQUEST OPERATIONS ====================

  async getChangeRequests(filters?: {
    kpiDefinitionId?: string
    requesterId?: string
    status?: string
  }) {
    return await this.client.changeRequest.findMany({
      where: {
        ...(filters?.kpiDefinitionId && { kpiDefinitionId: filters.kpiDefinitionId }),
        ...(filters?.requesterId && { requesterId: filters.requesterId }),
        ...(filters?.status && { status: filters.status }),
      },
      include: {
        kpiDefinition: {
          include: {
            user: true
          }
        },
        requester: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }

  async getChangeRequestById(id: string) {
    return await this.client.changeRequest.findUnique({
      where: { id },
      include: {
        kpiDefinition: true,
        requester: true,
      }
    })
  }

  async createChangeRequest(data: any) {
    return await this.client.changeRequest.create({
      data,
      include: {
        kpiDefinition: true,
        requester: true,
      }
    })
  }

  async updateChangeRequest(id: string, data: any) {
    return await this.client.changeRequest.update({
      where: { id },
      data,
    })
  }

  // ==================== NOTIFICATION OPERATIONS ====================

  async getNotifications(filters?: { userId?: string; status?: string }) {
    return await this.client.notification.findMany({
      where: {
        ...(filters?.userId && { userId: filters.userId }),
        ...(filters?.status && { status: filters.status }),
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    })
  }

  async createNotification(data: any) {
    return await this.client.notification.create({
      data
    })
  }

  async updateNotification(id: string, data: any) {
    return await this.client.notification.update({
      where: { id },
      data,
    })
  }

  async markAllAsRead(userId: string) {
    return await this.client.notification.updateMany({
      where: {
        userId,
        status: 'UNREAD'
      },
      data: {
        status: 'READ',
        readAt: new Date()
      }
    })
  }

  // ==================== AUDIT LOG OPERATIONS ====================

  async createAuditLog(data: any) {
    return await this.client.auditLog.create({
      data
    })
  }

  async getAuditLogs(filters?: {
    actorId?: string
    entityType?: string
    entityId?: string
  }) {
    return await this.client.auditLog.findMany({
      where: {
        ...(filters?.actorId && { actorId: filters.actorId }),
        ...(filters?.entityType && { entityType: filters.entityType }),
        ...(filters?.entityId && { entityId: filters.entityId }),
      },
      include: {
        actor: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    })
  }

  // ==================== EVIDENCE OPERATIONS ====================

  async createEvidence(data: any) {
    return await this.client.evidence.create({
      data,
      include: {
        actual: true,
      }
    })
  }

  async getEvidencesByActualId(actualId: string) {
    return await this.client.evidence.findMany({
      where: { actualId },
      orderBy: {
        uploadedAt: 'desc'
      }
    })
  }

  // ==================== KPI LIBRARY OPERATIONS ====================

  async getKpiLibraryEntries(filters?: {
    department?: string
    jobTitle?: string
    status?: string
  }) {
    return await this.client.kpiLibraryEntry.findMany({
      where: {
        ...(filters?.department && { department: filters.department }),
        ...(filters?.jobTitle && { jobTitle: filters.jobTitle }),
        ...(filters?.status && { status: filters.status }),
      },
      include: {
        uploader: true,
      },
      orderBy: {
        stt: 'asc'
      }
    })
  }

  async getKpiLibraryEntryById(id: string) {
    return await this.client.kpiLibraryEntry.findUnique({
      where: { id },
      include: {
        uploader: true,
      }
    })
  }

  async createKpiLibraryEntry(data: any) {
    return await this.client.kpiLibraryEntry.create({
      data,
      include: {
        uploader: true,
      }
    })
  }

  async updateKpiLibraryEntry(id: string, data: any) {
    return await this.client.kpiLibraryEntry.update({
      where: { id },
      data,
    })
  }

  async deleteKpiLibraryEntry(id: string) {
    return await this.client.kpiLibraryEntry.delete({
      where: { id }
    })
  }

  // ==================== APPROVAL HIERARCHY OPERATIONS ====================

  async getApprovalHierarchy(userId: string) {
    return await this.client.approvalHierarchy.findFirst({
      where: { userId },
      include: {
        user: true,
        level1Approver: true,
        level2Approver: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }

  async getActiveApprovalHierarchy(userId: string) {
    const now = new Date()
    return await this.client.approvalHierarchy.findFirst({
      where: {
        userId,
        isActive: true,
        effectiveFrom: { lte: now },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: now } }
        ]
      },
      include: {
        level1Approver: true,
        level2Approver: true,
      }
    })
  }

  async createApprovalHierarchy(data: any) {
    return await this.client.approvalHierarchy.create({
      data,
      include: {
        user: true,
        level1Approver: true,
        level2Approver: true,
      }
    })
  }

  // ==================== PROXY ACTION OPERATIONS ====================

  async createProxyAction(data: any) {
    return await this.client.proxyAction.create({
      data,
      include: {
        performer: true,
      }
    })
  }

  async getProxyActions(filters?: {
    performedBy?: string
    actionType?: string
    entityId?: string
  }) {
    return await this.client.proxyAction.findMany({
      where: {
        ...(filters?.performedBy && { performedBy: filters.performedBy }),
        ...(filters?.actionType && { actionType: filters.actionType }),
        ...(filters?.entityId && { entityId: filters.entityId }),
      },
      include: {
        performer: true,
      },
      orderBy: {
        performedAt: 'desc'
      }
    })
  }

  // ==================== HISTORICAL DATA OPERATIONS ====================

  async createHistoricalKpiData(data: any) {
    return await this.client.historicalKpiData.create({
      data,
      include: {
        user: true,
        cycle: true,
      }
    })
  }

  async getHistoricalKpiData(filters?: {
    userId?: string
    year?: number
    quarter?: number
  }) {
    return await this.client.historicalKpiData.findMany({
      where: {
        ...(filters?.userId && { userId: filters.userId }),
        ...(filters?.year && { year: filters.year }),
        ...(filters?.quarter && { quarter: filters.quarter }),
      },
      include: {
        user: true,
        cycle: true,
      },
      orderBy: [
        { year: 'desc' },
        { quarter: 'desc' }
      ]
    })
  }

  // ==================== KPI TEMPLATE OPERATIONS ====================

  async getKpiTemplates(filters?: { department?: string; isActive?: boolean }) {
    return await this.client.kpiTemplate.findMany({
      where: {
        ...(filters?.department && { department: filters.department }),
        ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      },
      include: {
        creator: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }

  async getKpiTemplateById(id: string) {
    return await this.client.kpiTemplate.findUnique({
      where: { id },
      include: {
        creator: true,
      }
    })
  }

  async createKpiTemplate(data: any) {
    return await this.client.kpiTemplate.create({
      data,
      include: {
        creator: true,
      }
    })
  }

  async updateKpiTemplate(id: string, data: any) {
    return await this.client.kpiTemplate.update({
      where: { id },
      data,
    })
  }

  // ==================== COMPANY DOCUMENT OPERATIONS ====================

  async getCompanyDocuments(filters?: {
    type?: string
    department?: string
    aiIndexed?: boolean
  }) {
    return await this.client.companyDocument.findMany({
      where: {
        ...(filters?.type && { type: filters.type }),
        ...(filters?.department && { department: filters.department }),
        ...(filters?.aiIndexed !== undefined && { aiIndexed: filters.aiIndexed }),
      },
      include: {
        uploader: true,
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    })
  }

  async getCompanyDocumentById(id: string) {
    return await this.client.companyDocument.findUnique({
      where: { id },
      include: {
        uploader: true,
      }
    })
  }

  async createCompanyDocument(data: any) {
    return await this.client.companyDocument.create({
      data,
      include: {
        uploader: true,
      }
    })
  }

  async updateCompanyDocument(id: string, data: any) {
    return await this.client.companyDocument.update({
      where: { id },
      data,
    })
  }

  async deleteCompanyDocument(id: string) {
    return await this.client.companyDocument.delete({
      where: { id }
    })
  }

  // ==================== KPI RESOURCE OPERATIONS ====================
  // TODO: Implement these methods when MySQL support for KPI Resources is needed

  async getKpiResources(_filters?: {
    category?: string
    department?: string
    status?: string
    approvalStatus?: string
    isPublic?: boolean
    searchQuery?: string
  }): Promise<any[]> {
    throw new Error('KPI Resources not implemented for MySQL repository. Please use DB_TYPE=local or implement this method.')
  }

  async getKpiResourceById(_id: string): Promise<any | null> {
    throw new Error('KPI Resources not implemented for MySQL repository. Please use DB_TYPE=local or implement this method.')
  }

  async createKpiResource(_data: any): Promise<any> {
    throw new Error('KPI Resources not implemented for MySQL repository. Please use DB_TYPE=local or implement this method.')
  }

  async updateKpiResource(_id: string, _data: any): Promise<any> {
    throw new Error('KPI Resources not implemented for MySQL repository. Please use DB_TYPE=local or implement this method.')
  }

  async deleteKpiResource(_id: string): Promise<any> {
    throw new Error('KPI Resources not implemented for MySQL repository. Please use DB_TYPE=local or implement this method.')
  }

  async getKpiResourceStatistics(): Promise<any> {
    throw new Error('KPI Resources not implemented for MySQL repository. Please use DB_TYPE=local or implement this method.')
  }

  async approveKpiResource(_id: string, _approvedBy: string, _comment?: string): Promise<any> {
    throw new Error('KPI Resources not implemented for MySQL repository. Please use DB_TYPE=local.')
  }

  async rejectKpiResource(_id: string, _approvedBy: string, _reason: string): Promise<any> {
    throw new Error('KPI Resources not implemented for MySQL repository. Please use DB_TYPE=local.')
  }

  async incrementDownloadCount(_id: string): Promise<void> {
    throw new Error('KPI Resources not implemented for MySQL repository. Please use DB_TYPE=local.')
  }

  async incrementViewCount(_id: string): Promise<void> {
    throw new Error('KPI Resources not implemented for MySQL repository. Please use DB_TYPE=local.')
  }

  async getBIDashboards(_filters?: { dashboardType?: string; department?: string }): Promise<any[]> {
    throw new Error('KPI Resources not implemented for MySQL repository. Please use DB_TYPE=local.')
  }

  // ==================== KPI LIBRARY UPLOAD OPERATIONS ====================

  async getKpiLibraryUploads(_filters?: { status?: string }): Promise<any[]> {
    throw new Error('KPI Library Uploads not implemented for MySQL repository. Please use DB_TYPE=local.')
  }

  async getKpiLibraryUploadById(_id: string): Promise<any | null> {
    throw new Error('KPI Library Uploads not implemented for MySQL repository. Please use DB_TYPE=local.')
  }

  async createKpiLibraryUpload(_data: any): Promise<any> {
    throw new Error('KPI Library Uploads not implemented for MySQL repository. Please use DB_TYPE=local.')
  }

  async approveKpiLibraryUpload(_id: string, _reviewedBy: string, _comment?: string): Promise<any> {
    throw new Error('KPI Library Uploads not implemented for MySQL repository. Please use DB_TYPE=local.')
  }

  async rejectKpiLibraryUpload(_id: string, _reviewedBy: string, _reason: string): Promise<any> {
    throw new Error('KPI Library Uploads not implemented for MySQL repository. Please use DB_TYPE=local.')
  }

  async getKpiLibraryUploadStatistics(): Promise<any> {
    throw new Error('KPI Library Uploads not implemented for MySQL repository. Please use DB_TYPE=local.')
  }

  // ==================== ENHANCED KPI TEMPLATE OPERATIONS ====================

  async submitForReview(_id: string, _submittedBy: string): Promise<any> {
    throw new Error('Enhanced KPI Templates not implemented for MySQL repository. Please use DB_TYPE=local.')
  }

  async approveTemplate(_id: string, _reviewedBy: string, _comment?: string): Promise<any> {
    throw new Error('Enhanced KPI Templates not implemented for MySQL repository. Please use DB_TYPE=local.')
  }

  async rejectTemplate(_id: string, _reviewedBy: string, _reason: string): Promise<any> {
    throw new Error('Enhanced KPI Templates not implemented for MySQL repository. Please use DB_TYPE=local.')
  }

  async cloneTemplate(_id: string, _createdBy: string, _overrides?: any): Promise<any> {
    throw new Error('Enhanced KPI Templates not implemented for MySQL repository. Please use DB_TYPE=local.')
  }

  async incrementUsage(_id: string): Promise<void> {
    throw new Error('Enhanced KPI Templates not implemented for MySQL repository. Please use DB_TYPE=local.')
  }

  async archiveTemplate(_id: string): Promise<any> {
    throw new Error('Enhanced KPI Templates not implemented for MySQL repository. Please use DB_TYPE=local.')
  }

  async getTemplateStatistics(): Promise<any> {
    throw new Error('Enhanced KPI Templates not implemented for MySQL repository. Please use DB_TYPE=local.')
  }
}
