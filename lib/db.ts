// lib/db.ts - Prisma Database Service
import { PrismaClient } from '@prisma/client'

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Database helper functions
export class DatabaseService {
  
  /**
   * ==================== USER OPERATIONS ====================
   */
  
  async getUsers(filters?: {
    role?: string
    department?: string
    status?: string
  }) {
    return await prisma.user.findMany({
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
    return await prisma.user.findUnique({
      where: { id },
      include: {
        orgUnit: true,
        manager: true,
      }
    })
  }

  async getUserByEmail(email: string) {
    return await prisma.user.findUnique({
      where: { email },
      include: {
        orgUnit: true,
      }
    })
  }

  async createUser(data: any) {
    return await prisma.user.create({
      data,
      include: {
        orgUnit: true,
      }
    })
  }

  async updateUser(id: string, data: any) {
    return await prisma.user.update({
      where: { id },
      data,
    })
  }

  /**
   * ==================== CYCLE OPERATIONS ====================
   */
  
  async getCycles(status?: string) {
    return await prisma.cycle.findMany({
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
    return await prisma.cycle.findUnique({
      where: { id },
      include: {
        creator: true,
        kpiDefinitions: true,
      }
    })
  }

  async createCycle(data: any) {
    return await prisma.cycle.create({
      data,
      include: {
        creator: true,
      }
    })
  }

  async updateCycle(id: string, data: any) {
    return await prisma.cycle.update({
      where: { id },
      data,
    })
  }

  async getActiveCycle() {
    return await prisma.cycle.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }

  /**
   * ==================== KPI DEFINITION OPERATIONS ====================
   */
  
  async getKpiDefinitions(filters?: {
    cycleId?: string
    userId?: string
    status?: string
    orgUnitId?: string
  }) {
    return await prisma.kpiDefinition.findMany({
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
    return await prisma.kpiDefinition.findUnique({
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
    return await prisma.kpiDefinition.create({
      data,
      include: {
        cycle: true,
        user: true,
      }
    })
  }

  async updateKpiDefinition(id: string, data: any) {
    return await prisma.kpiDefinition.update({
      where: { id },
      data,
    })
  }

  async deleteKpiDefinition(id: string) {
    // Cascade delete will handle related records
    return await prisma.kpiDefinition.delete({
      where: { id }
    })
  }

  /**
   * ==================== KPI ACTUAL OPERATIONS ====================
   */
  
  async getKpiActuals(filters?: {
    kpiDefinitionId?: string
    status?: string
  }) {
    return await prisma.kpiActual.findMany({
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

  async createKpiActual(data: any) {
    return await prisma.kpiActual.create({
      data,
      include: {
        kpiDefinition: true,
        evidences: true,
      }
    })
  }

  async updateKpiActual(id: string, data: any) {
    return await prisma.kpiActual.update({
      where: { id },
      data,
    })
  }

  /**
   * ==================== APPROVAL OPERATIONS ====================
   */
  
  async getApprovals(filters: {
    entityId: string
    entityType: string
  }) {
    return await prisma.approval.findMany({
      where: filters,
      include: {
        approver: true,
      },
      orderBy: {
        level: 'asc'
      }
    })
  }

  async createApproval(data: any) {
    return await prisma.approval.create({
      data,
      include: {
        approver: true,
      }
    })
  }

  async updateApproval(id: string, data: any) {
    return await prisma.approval.update({
      where: { id },
      data,
    })
  }

  /**
   * ==================== CHANGE REQUEST OPERATIONS ====================
   */
  
  async getChangeRequests(filters?: {
    kpiDefinitionId?: string
    requesterId?: string
    requesterType?: string
    status?: string
  }) {
    return await prisma.changeRequest.findMany({
      where: {
        ...(filters?.kpiDefinitionId && { kpiDefinitionId: filters.kpiDefinitionId }),
        ...(filters?.requesterId && { requesterId: filters.requesterId }),
        ...(filters?.requesterType && { requesterType: filters.requesterType }),
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

  async createChangeRequest(data: any) {
    return await prisma.changeRequest.create({
      data,
      include: {
        kpiDefinition: true,
        requester: true,
      }
    })
  }

  async updateChangeRequest(id: string, data: any) {
    return await prisma.changeRequest.update({
      where: { id },
      data,
    })
  }

  /**
   * ==================== NOTIFICATION OPERATIONS ====================
   */
  
  async getNotifications(userId: string, unreadOnly: boolean = false) {
    return await prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { status: 'UNREAD' }),
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    })
  }

  async createNotification(data: any) {
    return await prisma.notification.create({
      data
    })
  }

  async markNotificationAsRead(id: string) {
    return await prisma.notification.update({
      where: { id },
      data: {
        status: 'READ',
        readAt: new Date()
      }
    })
  }

  async markAllNotificationsAsRead(userId: string) {
    return await prisma.notification.updateMany({
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

  /**
   * ==================== COMPANY DOCUMENT OPERATIONS ====================
   */
  
  async getCompanyDocuments(filters?: {
    type?: string
    department?: string
    aiIndexed?: boolean
  }) {
    return await prisma.companyDocument.findMany({
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

  async createCompanyDocument(data: any) {
    return await prisma.companyDocument.create({
      data,
      include: {
        uploader: true,
      }
    })
  }

  async updateCompanyDocument(id: string, data: any) {
    return await prisma.companyDocument.update({
      where: { id },
      data,
    })
  }

  async deleteCompanyDocument(id: string) {
    return await prisma.companyDocument.delete({
      where: { id }
    })
  }

  /**
   * ==================== APPROVAL HIERARCHY OPERATIONS ====================
   */
  
  async getApprovalHierarchies(userId?: string) {
    return await prisma.approvalHierarchy.findMany({
      where: userId ? { userId } : undefined,
      include: {
        user: true,
        level1Approver: true,
        level2Approver: true,
        level3Approver: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }

  async getActiveApprovalHierarchy(userId: string) {
    const now = new Date()
    return await prisma.approvalHierarchy.findFirst({
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
        level3Approver: true,
      }
    })
  }

  async createApprovalHierarchy(data: any) {
    return await prisma.approvalHierarchy.create({
      data,
      include: {
        user: true,
        level1Approver: true,
        level2Approver: true,
        level3Approver: true,
      }
    })
  }

  /**
   * ==================== HISTORICAL KPI DATA OPERATIONS ====================
   */
  
  async getHistoricalKpiData(filters?: {
    userId?: string
    year?: number
  }) {
    return await prisma.historicalKpiData.findMany({
      where: {
        ...(filters?.userId && { userId: filters.userId }),
        ...(filters?.year && { year: filters.year }),
      },
      include: {
        user: true,
      },
      orderBy: [
        { year: 'desc' },
        { quarter: 'desc' }
      ]
    })
  }

  async createHistoricalKpiData(data: any) {
    return await prisma.historicalKpiData.create({
      data
    })
  }

  async bulkCreateHistoricalKpiData(dataArray: any[]) {
    return await prisma.historicalKpiData.createMany({
      data: dataArray,
      skipDuplicates: true
    })
  }

  /**
   * ==================== TEMPLATE OPERATIONS ====================
   */
  
  async getTemplates(filters?: {
    department?: string
    isActive?: boolean
  }) {
    return await prisma.kpiTemplate.findMany({
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

  async createTemplate(data: any) {
    return await prisma.kpiTemplate.create({
      data,
      include: {
        creator: true,
      }
    })
  }

  /**
   * ==================== AUDIT LOG OPERATIONS ====================
   */
  
  async createAuditLog(data: any) {
    return await prisma.auditLog.create({
      data
    })
  }

  async getAuditLogs(filters?: {
    actorId?: string
    entityType?: string
    entityId?: string
    limit?: number
  }) {
    return await prisma.auditLog.findMany({
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
      take: filters?.limit || 100
    })
  }

  /**
   * ==================== ORG UNIT OPERATIONS ====================
   */
  
  async getOrgUnits() {
    return await prisma.orgUnit.findMany({
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
    return await prisma.orgUnit.create({
      data,
      include: {
        parent: true,
      }
    })
  }

  /**
   * ==================== STATISTICS & ANALYTICS ====================
   */
  
  async getAdminStatistics() {
    const [
      cyclesCount,
      activeCyclesCount,
      usersCount,
      activeUsersCount,
      kpisCount,
      submittedKpisCount,
      approvedKpisCount,
      pendingKpisCount,
      changeRequestsCount,
      pendingChangeRequestsCount,
      documentsCount,
      aiIndexedDocsCount
    ] = await Promise.all([
      prisma.cycle.count(),
      prisma.cycle.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.kpiDefinition.count(),
      prisma.kpiDefinition.count({ where: { status: { in: ['SUBMITTED', 'PENDING_LM', 'PENDING_HOD', 'PENDING_BOD', 'APPROVED', 'LOCKED_GOALS'] } } }),
      prisma.kpiDefinition.count({ where: { status: { in: ['APPROVED', 'LOCKED_GOALS'] } } }),
      prisma.kpiDefinition.count({ where: { status: { in: ['PENDING_LM', 'PENDING_HOD', 'PENDING_BOD'] } } }),
      prisma.changeRequest.count(),
      prisma.changeRequest.count({ where: { status: 'PENDING' } }),
      prisma.companyDocument.count(),
      prisma.companyDocument.count({ where: { aiIndexed: true } })
    ])

    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: true
    })

    const documentsByType = await prisma.companyDocument.groupBy({
      by: ['type'],
      _count: true
    })

    return {
      cycles: {
        total: cyclesCount,
        active: activeCyclesCount,
        closed: cyclesCount - activeCyclesCount
      },
      users: {
        total: usersCount,
        active: activeUsersCount,
        byRole: usersByRole.reduce((acc: any, item: any) => {
          acc[item.role] = item._count
          return acc
        }, {})
      },
      kpis: {
        total: kpisCount,
        submitted: submittedKpisCount,
        approved: approvedKpisCount,
        pending: pendingKpisCount
      },
      changeRequests: {
        total: changeRequestsCount,
        pending: pendingChangeRequestsCount,
        approved: changeRequestsCount - pendingChangeRequestsCount,
        rejected: 0
      },
      documents: {
        total: documentsCount,
        aiIndexed: aiIndexedDocsCount,
        byType: documentsByType.reduce((acc: any, item: any) => {
          acc[item.type] = item._count
          return acc
        }, {})
      }
    }
  }

  /**
   * ==================== EVIDENCE OPERATIONS ====================
   */
  
  async createEvidence(data: any) {
    return await prisma.evidence.create({
      data
    })
  }

  async getEvidences(actualId: string) {
    return await prisma.evidence.findMany({
      where: { actualId },
      orderBy: { uploadedAt: 'desc' }
    })
  }

  async deleteEvidence(id: string) {
    return await prisma.evidence.delete({
      where: { id }
    })
  }
}

export const db = new DatabaseService()
export default db