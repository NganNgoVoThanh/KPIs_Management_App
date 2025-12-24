// lib/repositories/IRepository.ts
// Database Repository Interface - Contract for all database implementations
// This allows switching between MySQL, OneLake, PostgreSQL, etc. without code changes

export interface IUserRepository {
  getUsers(filters?: { role?: string; department?: string; status?: string }): Promise<any[]>
  getUserById(id: string): Promise<any | null>
  getUserByEmail(email: string): Promise<any | null>
  createUser(data: any): Promise<any>
  updateUser(id: string, data: any): Promise<any>
}

export interface IOrgUnitRepository {
  getOrgUnits(filters?: { type?: string; parentId?: string }): Promise<any[]>
  createOrgUnit(data: any): Promise<any>
}

export interface ICycleRepository {
  getCycles(status?: string): Promise<any[]>
  getCycleById(id: string): Promise<any | null>
  createCycle(data: any): Promise<any>
  updateCycle(id: string, data: any): Promise<any>
  getActiveCycle(): Promise<any | null>
}

export interface IKpiDefinitionRepository {
  getKpiDefinitions(filters?: {
    cycleId?: string
    userId?: string
    status?: string
    orgUnitId?: string
  }): Promise<any[]>
  getKpiDefinitionById(id: string): Promise<any | null>
  createKpiDefinition(data: any): Promise<any>
  updateKpiDefinition(id: string, data: any): Promise<any>
  deleteKpiDefinition(id: string): Promise<any>
}

export interface IKpiActualRepository {
  getKpiActuals(filters?: { kpiDefinitionId?: string; status?: string }): Promise<any[]>
  getKpiActualById(id: string): Promise<any | null>
  createKpiActual(data: any): Promise<any>
  updateKpiActual(id: string, data: any): Promise<any>
  deleteKpiActual(id: string): Promise<any>
}

export interface IApprovalRepository {
  getApprovals(filters?: {
    approverId?: string
    status?: string
    entityType?: string
    kpiDefinitionId?: string
    entityId?: string
  }): Promise<any[]>
  getApprovalById(id: string): Promise<any | null>
  createApproval(data: any): Promise<any>
  updateApproval(id: string, data: any): Promise<any>
}

export interface IChangeRequestRepository {
  getChangeRequests(filters?: {
    kpiDefinitionId?: string
    requesterId?: string
    status?: string
  }): Promise<any[]>
  getChangeRequestById(id: string): Promise<any | null>
  createChangeRequest(data: any): Promise<any>
  updateChangeRequest(id: string, data: any): Promise<any>
}

export interface INotificationRepository {
  getNotifications(filters?: { userId?: string; status?: string }): Promise<any[]>
  createNotification(data: any): Promise<any>
  updateNotification(id: string, data: any): Promise<any>
  markAllAsRead(userId: string): Promise<any>
}

export interface IAuditLogRepository {
  createAuditLog(data: any): Promise<any>
  getAuditLogs(filters?: {
    actorId?: string
    entityType?: string
    entityId?: string
  }): Promise<any[]>
}

export interface IEvidenceRepository {
  createEvidence(data: any): Promise<any>
  getEvidencesByActualId(actualId: string): Promise<any[]>
}

export interface IKpiLibraryRepository {
  getKpiLibraryEntries(filters?: {
    department?: string
    jobTitle?: string
    status?: string
  }): Promise<any[]>
  getKpiLibraryEntryById(id: string): Promise<any | null>
  createKpiLibraryEntry(data: any): Promise<any>
  updateKpiLibraryEntry(id: string, data: any): Promise<any>
  deleteKpiLibraryEntry(id: string): Promise<any>
}

export interface IApprovalHierarchyRepository {
  getApprovalHierarchy(userId: string): Promise<any | null>
  getActiveApprovalHierarchy(userId: string): Promise<any | null>
  createApprovalHierarchy(data: any): Promise<any>
}

export interface IProxyActionRepository {
  createProxyAction(data: any): Promise<any>
  getProxyActions(filters?: {
    performedBy?: string
    actionType?: string
    entityId?: string
  }): Promise<any[]>
}

export interface IHistoricalDataRepository {
  createHistoricalKpiData(data: any): Promise<any>
  getHistoricalKpiData(filters?: {
    userId?: string
    year?: number
    quarter?: number
  }): Promise<any[]>
}

export interface IKpiTemplateRepository {
  getKpiTemplates(filters?: { department?: string; isActive?: boolean; status?: string }): Promise<any[]>
  getKpiTemplateById(id: string): Promise<any | null>
  createKpiTemplate(data: any): Promise<any>
  updateKpiTemplate(id: string, data: any): Promise<any>
}

export interface ICompanyDocumentRepository {
  getCompanyDocuments(filters?: {
    type?: string
    department?: string
  }): Promise<any[]>
  getCompanyDocumentById(id: string): Promise<any | null>
  createCompanyDocument(data: any): Promise<any>
  updateCompanyDocument(id: string, data: any): Promise<any>
  deleteCompanyDocument(id: string): Promise<any>
}

export interface IKpiResourceRepository {
  getKpiResources(filters?: {
    category?: string
    resourceType?: string
    department?: string
    status?: string
    approvalStatus?: string
    isPublic?: boolean
    isFeatured?: boolean
    dashboardType?: string
    searchQuery?: string
  }): Promise<any[]>
  getKpiResourceById(id: string): Promise<any | null>
  createKpiResource(data: any): Promise<any>
  updateKpiResource(id: string, data: any): Promise<any>
  deleteKpiResource(id: string): Promise<any>
  approveKpiResource(id: string, approvedBy: string, comment?: string): Promise<any>
  rejectKpiResource(id: string, approvedBy: string, reason: string): Promise<any>
  incrementDownloadCount(id: string): Promise<void>
  incrementViewCount(id: string): Promise<void>
  getKpiResourceStatistics(): Promise<any>
  getBIDashboards(filters?: { dashboardType?: string; department?: string }): Promise<any[]>
}

export interface IKpiLibraryUploadRepository {
  getKpiLibraryUploads(filters?: { status?: string }): Promise<any[]>
  getKpiLibraryUploadById(id: string): Promise<any | null>
  createKpiLibraryUpload(data: any): Promise<any>
  approveKpiLibraryUpload(id: string, reviewedBy: string, comment?: string): Promise<any>
  rejectKpiLibraryUpload(id: string, reviewedBy: string, reason: string): Promise<any>
  getKpiLibraryUploadStatistics(): Promise<any>
}

export interface IEnhancedKpiTemplateRepository extends IKpiTemplateRepository {
  submitForReview(id: string, submittedBy: string): Promise<any>
  approveTemplate(id: string, reviewedBy: string, comment?: string): Promise<any>
  rejectTemplate(id: string, reviewedBy: string, reason: string): Promise<any>
  cloneTemplate(id: string, createdBy: string, overrides?: any): Promise<any>
  incrementUsage(id: string): Promise<void>
  archiveTemplate(id: string): Promise<any>
  getTemplateStatistics(): Promise<any>
}

// Main Database Repository Interface
// This combines all repository interfaces
export interface IDatabaseRepository
  extends IUserRepository,
  IOrgUnitRepository,
  ICycleRepository,
  IKpiDefinitionRepository,
  IKpiActualRepository,
  IApprovalRepository,
  IChangeRequestRepository,
  INotificationRepository,
  IAuditLogRepository,
  IEvidenceRepository,
  IKpiLibraryRepository,
  IApprovalHierarchyRepository,
  IProxyActionRepository,
  IHistoricalDataRepository,
  IEnhancedKpiTemplateRepository,
  ICompanyDocumentRepository,
  IKpiResourceRepository,
  IKpiLibraryUploadRepository {
  // Transaction support
  transaction<T>(fn: (tx: any) => Promise<T>): Promise<T>

  // Connection management
  connect(): Promise<void>
  disconnect(): Promise<void>
}
