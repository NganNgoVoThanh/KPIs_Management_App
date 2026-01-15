// lib/db-new.ts - New Database Service using Repository Pattern
// This replaces lib/db.ts with a flexible, database-agnostic implementation

import { getDatabase } from './repositories/DatabaseFactory'
import { IDatabaseRepository } from './repositories/IRepository'

/**
 * DatabaseService - Backward compatible wrapper
 * This class maintains the same interface as the old DatabaseService
 * but uses the new Repository Pattern under the hood
 */
export class DatabaseService implements IDatabaseRepository {
  private repository: IDatabaseRepository

  constructor() {
    // Get the appropriate repository based on DB_TYPE env variable
    this.repository = getDatabase()
  }

  // ==================== CONNECTION MANAGEMENT ====================

  async connect(): Promise<void> {
    return this.repository.connect()
  }

  async disconnect(): Promise<void> {
    return this.repository.disconnect()
  }

  async transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return this.repository.transaction(fn)
  }

  // ==================== USER OPERATIONS ====================

  async getUsers(filters?: { role?: string; department?: string; status?: string }) {
    return this.repository.getUsers(filters)
  }

  async getUserById(id: string) {
    return this.repository.getUserById(id)
  }

  async getUserByEmail(email: string) {
    return this.repository.getUserByEmail(email)
  }

  async createUser(data: any) {
    return this.repository.createUser(data)
  }

  async updateUser(id: string, data: any) {
    return this.repository.updateUser(id, data)
  }

  // ==================== ORG UNIT OPERATIONS ====================

  async getOrgUnits(filters?: { type?: string; parentId?: string }) {
    return this.repository.getOrgUnits(filters)
  }

  async createOrgUnit(data: any) {
    return this.repository.createOrgUnit(data)
  }

  // ==================== CYCLE OPERATIONS ====================

  async getCycles(status?: string) {
    return this.repository.getCycles(status)
  }

  async getCycleById(id: string) {
    return this.repository.getCycleById(id)
  }

  async createCycle(data: any) {
    return this.repository.createCycle(data)
  }

  async updateCycle(id: string, data: any) {
    return this.repository.updateCycle(id, data)
  }

  async getActiveCycle() {
    return this.repository.getActiveCycle()
  }

  // ==================== KPI DEFINITION OPERATIONS ====================

  async getKpiDefinitions(filters?: {
    cycleId?: string
    userId?: string
    status?: string
    orgUnitId?: string
  }) {
    return this.repository.getKpiDefinitions(filters)
  }

  async getKpiDefinitionById(id: string) {
    return this.repository.getKpiDefinitionById(id)
  }

  async createKpiDefinition(data: any) {
    return this.repository.createKpiDefinition(data)
  }

  async updateKpiDefinition(id: string, data: any) {
    return this.repository.updateKpiDefinition(id, data)
  }

  async deleteKpiDefinition(id: string) {
    return this.repository.deleteKpiDefinition(id)
  }

  // ==================== KPI ACTUAL OPERATIONS ====================

  async getKpiActuals(filters?: { kpiDefinitionId?: string; status?: string; userId?: string; cycleId?: string }) {
    return this.repository.getKpiActuals(filters)
  }

  async getKpiActualById(id: string) {
    return this.repository.getKpiActualById(id)
  }

  async createKpiActual(data: any) {
    return this.repository.createKpiActual(data)
  }

  async updateKpiActual(id: string, data: any) {
    return this.repository.updateKpiActual(id, data)
  }

  async deleteKpiActual(id: string) {
    return this.repository.deleteKpiActual(id)
  }

  // ==================== APPROVAL OPERATIONS ====================

  async getApprovals(filters?: {
    approverId?: string
    status?: string
    entityType?: string
    kpiDefinitionId?: string
    entityId?: string
  }) {
    return this.repository.getApprovals(filters)
  }

  async getApprovalById(id: string) {
    return this.repository.getApprovalById(id)
  }

  async createApproval(data: any) {
    return this.repository.createApproval(data)
  }

  async updateApproval(id: string, data: any) {
    return this.repository.updateApproval(id, data)
  }

  // ==================== CHANGE REQUEST OPERATIONS ====================

  async getChangeRequests(filters?: {
    kpiDefinitionId?: string
    requesterId?: string
    status?: string
  }) {
    return this.repository.getChangeRequests(filters)
  }

  async getChangeRequestById(id: string) {
    return this.repository.getChangeRequestById(id)
  }

  async createChangeRequest(data: any) {
    return this.repository.createChangeRequest(data)
  }

  async updateChangeRequest(id: string, data: any) {
    return this.repository.updateChangeRequest(id, data)
  }

  // ==================== NOTIFICATION OPERATIONS ====================

  async getNotifications(filters?: { userId?: string; status?: string }) {
    return this.repository.getNotifications(filters)
  }

  async createNotification(data: any) {
    return this.repository.createNotification(data)
  }

  async updateNotification(id: string, data: any) {
    return this.repository.updateNotification(id, data)
  }

  async markAllAsRead(userId: string) {
    return this.repository.markAllAsRead(userId)
  }

  // Backward compatibility methods
  async markNotificationAsRead(id: string) {
    return this.repository.updateNotification(id, {
      status: 'READ',
      readAt: new Date()
    })
  }

  async markAllNotificationsAsRead(userId: string) {
    return this.repository.markAllAsRead(userId)
  }

  // ==================== AUDIT LOG OPERATIONS ====================

  async createAuditLog(data: any) {
    return this.repository.createAuditLog(data)
  }

  async getAuditLogs(filters?: {
    actorId?: string
    entityType?: string
    entityId?: string
  }) {
    return this.repository.getAuditLogs(filters)
  }

  // ==================== EVIDENCE OPERATIONS ====================

  async createEvidence(data: any) {
    return this.repository.createEvidence(data)
  }

  async getEvidencesByActualId(actualId: string) {
    return this.repository.getEvidencesByActualId(actualId)
  }

  // ==================== KPI LIBRARY OPERATIONS ====================

  async getKpiLibraryEntries(filters?: {
    department?: string
    jobTitle?: string
    status?: string
  }) {
    return this.repository.getKpiLibraryEntries(filters)
  }

  async getKpiLibraryEntryById(id: string) {
    return this.repository.getKpiLibraryEntryById(id)
  }

  async createKpiLibraryEntry(data: any) {
    return this.repository.createKpiLibraryEntry(data)
  }

  async updateKpiLibraryEntry(id: string, data: any) {
    return this.repository.updateKpiLibraryEntry(id, data)
  }

  async deleteKpiLibraryEntry(id: string) {
    return this.repository.deleteKpiLibraryEntry(id)
  }

  // ==================== APPROVAL HIERARCHY OPERATIONS ====================

  async getApprovalHierarchies(userId?: string) {
    if (userId) {
      return [await this.repository.getApprovalHierarchy(userId)]
    }
    throw new Error('getApprovalHierarchies without userId not supported in new implementation')
  }

  async getApprovalHierarchy(userId: string) {
    return this.repository.getApprovalHierarchy(userId)
  }

  async getActiveApprovalHierarchy(userId: string) {
    return this.repository.getActiveApprovalHierarchy(userId)
  }

  async createApprovalHierarchy(data: any) {
    return this.repository.createApprovalHierarchy(data)
  }

  // ==================== PROXY ACTION OPERATIONS ====================

  async createProxyAction(data: any) {
    return this.repository.createProxyAction(data)
  }

  async getProxyActions(filters?: {
    performedBy?: string
    actionType?: string
    entityId?: string
  }) {
    return this.repository.getProxyActions(filters)
  }

  // ==================== HISTORICAL DATA OPERATIONS ====================

  async createHistoricalKpiData(data: any) {
    return this.repository.createHistoricalKpiData(data)
  }

  async getHistoricalKpiData(filters?: {
    userId?: string
    year?: number
    quarter?: number
  }) {
    return this.repository.getHistoricalKpiData(filters)
  }

  // ==================== KPI TEMPLATE OPERATIONS ====================

  async getKpiTemplates(filters?: { department?: string; isActive?: boolean }) {
    return this.repository.getKpiTemplates(filters)
  }

  async getKpiTemplateById(id: string) {
    return this.repository.getKpiTemplateById(id)
  }

  async createKpiTemplate(data: any) {
    return this.repository.createKpiTemplate(data)
  }

  async updateKpiTemplate(id: string, data: any) {
    return this.repository.updateKpiTemplate(id, data)
  }

  // ==================== COMPANY DOCUMENT OPERATIONS ====================

  async getCompanyDocuments(filters?: {
    type?: string
    department?: string
  }) {
    return this.repository.getCompanyDocuments(filters)
  }

  async getCompanyDocumentById(id: string) {
    return this.repository.getCompanyDocumentById(id)
  }

  async createCompanyDocument(data: any) {
    return this.repository.createCompanyDocument(data)
  }

  async updateCompanyDocument(id: string, data: any) {
    return this.repository.updateCompanyDocument(id, data)
  }

  async deleteCompanyDocument(id: string) {
    return this.repository.deleteCompanyDocument(id)
  }

  // ==================== KPI RESOURCE OPERATIONS ====================

  async getKpiResources(filters?: {
    category?: string
    resourceType?: string
    department?: string
    status?: string
    approvalStatus?: string
    isPublic?: boolean
    isFeatured?: boolean
    dashboardType?: string
    searchQuery?: string
  }) {
    return this.repository.getKpiResources(filters)
  }

  async getKpiResourceById(id: string) {
    return this.repository.getKpiResourceById(id)
  }

  async createKpiResource(data: any) {
    return this.repository.createKpiResource(data)
  }

  async updateKpiResource(id: string, data: any) {
    return this.repository.updateKpiResource(id, data)
  }

  async deleteKpiResource(id: string) {
    return this.repository.deleteKpiResource(id)
  }

  async approveKpiResource(id: string, approvedBy: string, comment?: string) {
    return this.repository.approveKpiResource(id, approvedBy, comment)
  }

  async rejectKpiResource(id: string, approvedBy: string, reason: string) {
    return this.repository.rejectKpiResource(id, approvedBy, reason)
  }

  async incrementDownloadCount(id: string) {
    return this.repository.incrementDownloadCount(id)
  }

  async incrementViewCount(id: string) {
    return this.repository.incrementViewCount(id)
  }

  async getKpiResourceStatistics() {
    return this.repository.getKpiResourceStatistics()
  }

  async getBIDashboards(filters?: { dashboardType?: string; department?: string }) {
    return this.repository.getBIDashboards(filters)
  }

  // ==================== KPI LIBRARY UPLOAD OPERATIONS ====================

  async getKpiLibraryUploads(filters?: { status?: string }) {
    return this.repository.getKpiLibraryUploads(filters)
  }

  async getKpiLibraryUploadById(id: string) {
    return this.repository.getKpiLibraryUploadById(id)
  }

  async createKpiLibraryUpload(data: any) {
    return this.repository.createKpiLibraryUpload(data)
  }

  async approveKpiLibraryUpload(id: string, reviewedBy: string, comment?: string) {
    return this.repository.approveKpiLibraryUpload(id, reviewedBy, comment)
  }

  async rejectKpiLibraryUpload(id: string, reviewedBy: string, reason: string) {
    return this.repository.rejectKpiLibraryUpload(id, reviewedBy, reason)
  }

  async getKpiLibraryUploadStatistics() {
    return this.repository.getKpiLibraryUploadStatistics()
  }

  // ==================== ENHANCED KPI TEMPLATE OPERATIONS ====================

  async submitForReview(id: string, submittedBy: string) {
    return this.repository.submitForReview(id, submittedBy)
  }

  async approveTemplate(id: string, reviewedBy: string, comment?: string) {
    return this.repository.approveTemplate(id, reviewedBy, comment)
  }

  async rejectTemplate(id: string, reviewedBy: string, reason: string) {
    return this.repository.rejectTemplate(id, reviewedBy, reason)
  }

  async cloneTemplate(id: string, createdBy: string, overrides?: any) {
    return this.repository.cloneTemplate(id, createdBy, overrides)
  }

  async incrementUsage(id: string) {
    return this.repository.incrementUsage(id)
  }

  async archiveTemplate(id: string) {
    return this.repository.archiveTemplate(id)
  }

  async getTemplateStatistics() {
    return this.repository.getTemplateStatistics()
  }
}

// Export singleton instance for backward compatibility
export const db = new DatabaseService()

// Also export the repository getter for advanced use cases
export { getDatabase } from './repositories/DatabaseFactory'
