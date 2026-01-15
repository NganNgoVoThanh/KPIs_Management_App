// lib/repositories/MySQLRepository.ts
// MySQL/Prisma Implementation of IDatabaseRepository
// This is a wrapper around the existing DatabaseService (Prisma)

import { PrismaClient } from '@prisma/client'
import { IDatabaseRepository } from './IRepository'

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  databaseUrl: string | undefined
}

// Lazy-load Prisma Client - only initialize when MySQLRepository is actually instantiated
// Force reinitialize if DATABASE_URL changes (for SSL config updates)
function getPrismaClient(): PrismaClient {
  const currentDatabaseUrl = process.env.DATABASE_URL

  if (!globalForPrisma.prisma || globalForPrisma.databaseUrl !== currentDatabaseUrl) {
    // Disconnect old client if exists
    if (globalForPrisma.prisma) {
      globalForPrisma.prisma.$disconnect().catch(console.error)
    }

    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      datasources: {
        db: {
          url: currentDatabaseUrl
        }
      }
    })
    globalForPrisma.databaseUrl = currentDatabaseUrl
    console.log('✅ Prisma Client initialized with DATABASE_URL:', currentDatabaseUrl?.substring(0, 50) + '...')
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
        hod: true,
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

  async getKpiActuals(filters?: { kpiDefinitionId?: string; status?: string; userId?: string; cycleId?: string }) {
    return await this.client.kpiActual.findMany({
      where: {
        ...(filters?.kpiDefinitionId && { kpiDefinitionId: filters.kpiDefinitionId }),
        ...(filters?.status && { status: filters.status }),
        ...((filters?.userId || filters?.cycleId) && {
          kpiDefinition: {
            ...(filters?.userId && { userId: filters.userId }),
            ...(filters?.cycleId && { cycleId: filters.cycleId }),
          }
        }),
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
    kpiDefinitionId?: string
    entityId?: string
  }) {
    return await this.client.approval.findMany({
      where: {
        ...(filters?.approverId && { approverId: filters.approverId }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.entityType && { entityType: filters.entityType }),
        ...(filters?.kpiDefinitionId && { kpiDefinitionId: filters.kpiDefinitionId }),
        ...(filters?.entityId && { entityId: filters.entityId }),
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

  async getKpiTemplates(filters?: { department?: string; isActive?: boolean; status?: string }) {
    return await this.client.kpiTemplate.findMany({
      where: {
        ...(filters?.department && { department: filters.department }),
        ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters?.status && { status: filters.status }),
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

  async getKpiResources(filters?: {
    category?: string
    department?: string
    status?: string
    approvalStatus?: string
    isPublic?: boolean
    searchQuery?: string
  }): Promise<any[]> {
    return await this.client.kpiResource.findMany({
      where: {
        ...(filters?.category && { category: filters.category }),
        ...(filters?.department && { department: filters.department }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.approvalStatus && { approvalStatus: filters.approvalStatus }),
        ...(filters?.isPublic !== undefined && { isPublic: filters.isPublic }),
        ...(filters?.searchQuery && {
          OR: [
            { title: { contains: filters.searchQuery } },
            { description: { contains: filters.searchQuery } }
          ]
        })
      },
      include: {
        uploader: true,
        approver: true
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    })
  }

  async getKpiResourceById(id: string): Promise<any | null> {
    return await this.client.kpiResource.findUnique({
      where: { id },
      include: {
        uploader: true,
        approver: true
      }
    })
  }

  async createKpiResource(data: any): Promise<any> {
    return await this.client.kpiResource.create({
      data,
      include: {
        uploader: true
      }
    })
  }

  async updateKpiResource(id: string, data: any): Promise<any> {
    return await this.client.kpiResource.update({
      where: { id },
      data
    })
  }

  async deleteKpiResource(id: string): Promise<any> {
    return await this.client.kpiResource.delete({
      where: { id }
    })
  }

  async getKpiResourceStatistics(): Promise<any> {
    const [total, pending, featured, byCategory] = await Promise.all([
      this.client.kpiResource.count(),
      this.client.kpiResource.count({ where: { approvalStatus: 'PENDING' } }),
      this.client.kpiResource.count({ where: { isFeatured: true } }),
      this.client.kpiResource.groupBy({
        by: ['category'],
        _count: {
          category: true
        }
      })
    ])

    return {
      total,
      pending,
      featured,
      byCategory: byCategory.reduce((acc, curr) => ({
        ...acc,
        [curr.category]: curr._count.category
      }), {})
    }
  }

  async approveKpiResource(id: string, approvedBy: string, comment?: string): Promise<any> {
    return await this.client.kpiResource.update({
      where: { id },
      data: {
        approvalStatus: 'APPROVED',
        status: 'ACTIVE',
        approvedBy,
        approvedAt: new Date(),
        rejectionReason: comment ? null : undefined
      }
    })
  }

  async rejectKpiResource(id: string, approvedBy: string, reason: string): Promise<any> {
    return await this.client.kpiResource.update({
      where: { id },
      data: {
        approvalStatus: 'REJECTED',
        status: 'INACTIVE',
        approvedBy,
        approvedAt: new Date(),
        rejectionReason: reason
      }
    })
  }

  async incrementDownloadCount(id: string): Promise<void> {
    await this.client.kpiResource.update({
      where: { id },
      data: {
        downloadCount: {
          increment: 1
        }
      }
    })
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.client.kpiResource.update({
      where: { id },
      data: {
        viewCount: {
          increment: 1
        }
      }
    })
  }

  async getBIDashboards(filters?: { dashboardType?: string; department?: string }): Promise<any[]> {
    return await this.client.kpiResource.findMany({
      where: {
        resourceType: 'BI_DASHBOARD',
        ...(filters?.dashboardType && { dashboardType: filters.dashboardType }),
        ...(filters?.department && { department: filters.department }),
        status: 'ACTIVE'
      },
      orderBy: {
        title: 'asc'
      }
    })
  }

  // ==================== KPI LIBRARY UPLOAD OPERATIONS ====================

  async getKpiLibraryUploads(filters?: { status?: string }): Promise<any[]> {
    return await this.client.kpiLibraryUpload.findMany({
      where: {
        ...(filters?.status && { status: filters.status })
      },
      include: {
        uploader: true
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    })
  }

  async getKpiLibraryUploadById(id: string): Promise<any | null> {
    return await this.client.kpiLibraryUpload.findUnique({
      where: { id },
      include: {
        uploader: true
      }
    })
  }

  async createKpiLibraryUpload(data: any): Promise<any> {
    return await this.client.kpiLibraryUpload.create({
      data,
      include: {
        uploader: true
      }
    })
  }

  async approveKpiLibraryUpload(id: string, reviewedBy: string, comment?: string): Promise<any> {
    return await this.client.$transaction(async (tx) => {
      const upload = await tx.kpiLibraryUpload.findUnique({ where: { id } })

      if (!upload) {
        throw new Error(`Upload not found: ${id}`)
      }

      if (upload.status !== 'PENDING') {
        throw new Error(`Upload is not pending: ${upload.status}`)
      }

      const rawData = upload.rawData as any[]
      if (!Array.isArray(rawData)) {
        throw new Error('Invalid rawData format')
      }

      const dataRows = rawData.slice(6)
      const entriesToCreate: any[] = []
      const templatesToCreate: any[] = []
      let validCount = 0

      for (const row of dataRows) {
        const dept = row[2]?.toString().trim()
        const kpiName = row[4]?.toString().trim()

        if (dept && kpiName) {
          const typeStr = row[5]?.toString().trim().toUpperCase()
          // Normalize KPI Type
          let normalizedType = 'I'
          if (typeStr === '1') normalizedType = 'I'
          else if (typeStr === '2') normalizedType = 'II'
          else if (typeStr === '3') normalizedType = 'III'
          else if (typeStr === '4') normalizedType = 'IV'
          else if (['I', 'II', 'III', 'IV'].includes(typeStr)) normalizedType = typeStr

          // Parse numeric values
          const targetVal = parseFloat(row[7]?.toString().trim() || '0')
          const weightVal = parseFloat(row[8]?.toString().trim() || '0')

          // 1. Create Library Entry (Legacy/Raw Record)
          entriesToCreate.push({
            stt: parseInt(row[0]?.toString() || '0') || 0,
            ogsmTarget: row[1]?.toString() || '',
            department: dept,
            jobTitle: row[3]?.toString() || '',
            kpiName: kpiName,
            kpiType: normalizedType,
            unit: row[6]?.toString() || '',
            dataSource: row[10]?.toString() || '', // Now mapped from row[10]
            yearlyTarget: row[7]?.toString() || '', // Target as string
            quarterlyTarget: null,
            uploadedBy: upload.uploadedBy,
            uploadId: upload.id,
            status: 'ACTIVE',
            version: 1,
            isTemplate: true
          })

          // 2. Create Actual KpiTemplate (For usage)
          templatesToCreate.push({
            name: kpiName,
            description: `Imported from ${upload.fileName}`,
            department: dept,
            jobTitle: row[3]?.toString() || '',
            category: 'OPERATIONAL', // Default
            kpiType: normalizedType,
            unit: row[6]?.toString() || '',
            formula: '',
            dataSource: row[10]?.toString() || '',
            targetValue: isNaN(targetVal) ? null : targetVal,
            weight: isNaN(weightVal) ? null : weightVal,
            frequency: row[9]?.toString() || 'MONTHLY',
            source: 'EXCEL_UPLOAD',
            uploadId: upload.id,
            status: 'APPROVED', // Auto-approve
            version: 1,
            usageCount: 0,
            isActive: true,
            createdBy: upload.uploadedBy,
            reviewedBy,
            reviewedAt: new Date(),
            reviewComment: comment
          })

          validCount++
        }
      }

      if (entriesToCreate.length > 0) {
        await tx.kpiLibraryEntry.createMany({
          data: entriesToCreate
        })
      }

      // Bulk create templates
      if (templatesToCreate.length > 0) {
        await tx.kpiTemplate.createMany({
          data: templatesToCreate
        })
      }

      return await tx.kpiLibraryUpload.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedBy,
          reviewedAt: new Date(),
          reviewComment: comment,
          processedCount: validCount,
          processedAt: new Date()
        }
      })
    })
  }

  async rejectKpiLibraryUpload(id: string, reviewedBy: string, reason: string): Promise<any> {
    return await this.client.kpiLibraryUpload.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy,
        reviewedAt: new Date(),
        rejectionReason: reason
      }
    })
  }

  async getKpiLibraryUploadStatistics(): Promise<any> {
    const [total, pending] = await Promise.all([
      this.client.kpiLibraryUpload.count(),
      this.client.kpiLibraryUpload.count({ where: { status: 'PENDING' } })
    ])

    return { total, pending }
  }

  // ==================== ENHANCED KPI TEMPLATE OPERATIONS ====================

  async submitForReview(id: string, submittedBy: string): Promise<any> {
    return await this.client.kpiTemplate.update({
      where: { id },
      data: {
        status: 'PENDING',
        submittedBy,
        submittedAt: new Date()
      }
    })
  }

  async approveTemplate(id: string, reviewedBy: string, comment?: string): Promise<any> {
    return await this.client.kpiTemplate.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy,
        reviewedAt: new Date(),
        reviewComment: comment
      }
    })
  }

  async rejectTemplate(id: string, reviewedBy: string, reason: string): Promise<any> {
    return await this.client.kpiTemplate.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy,
        reviewedAt: new Date(),
        rejectionReason: reason
      }
    })
  }

  async cloneTemplate(id: string, createdBy: string, overrides?: any): Promise<any> {
    // 1. Get original template
    const template = await this.client.kpiTemplate.findUnique({ where: { id } })
    if (!template) throw new Error(`Template not found: ${id}`)

    // 2. Create new template based on original
    const { id: _id, createdAt, updatedAt, creator, ...dataToClone } = template as any // Exclude system fields

    return await this.client.kpiTemplate.create({
      data: {
        ...dataToClone,
        ...overrides,
        name: overrides?.name || `${template.name} (Copy)`,
        source: 'CLONED',
        clonedFromId: id,
        createdBy,
        usageCount: 0,
        status: 'DRAFT',
        version: 1
      }
    })
  }

  async incrementUsage(id: string): Promise<void> {
    await this.client.kpiTemplate.update({
      where: { id },
      data: {
        usageCount: {
          increment: 1
        },
        lastUsedAt: new Date()
      }
    })
  }

  async archiveTemplate(id: string): Promise<any> {
    return await this.client.kpiTemplate.update({
      where: { id },
      data: {
        status: 'ARCHIVED'
      }
    })
  }

  async getTemplateStatistics(): Promise<any> {
    const [total, approved, pending, drafts] = await Promise.all([
      this.client.kpiTemplate.count({ where: { status: { not: 'ARCHIVED' } } }),
      this.client.kpiTemplate.count({ where: { status: 'APPROVED' } }),
      this.client.kpiTemplate.count({ where: { status: 'PENDING' } }),
      this.client.kpiTemplate.count({ where: { status: 'DRAFT' } })
    ])

    return { total, approved, pending, drafts }
  }
}
