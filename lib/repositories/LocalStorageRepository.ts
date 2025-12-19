// lib/repositories/LocalStorageRepository.ts
// Local JSON File Storage Repository - For Development/Testing
// Stores data in JSON files instead of a real database

import { IDatabaseRepository } from './IRepository'
import { promises as fs } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

export interface LocalStorageConfig {
  dataDir?: string // Directory to store JSON files
}

export class LocalStorageRepository implements IDatabaseRepository {
  private dataDir: string
  private initialized = false

  constructor(config: LocalStorageConfig = {}) {
    this.dataDir = config.dataDir || path.join(process.cwd(), '.local-storage')
  }

  // ==================== Connection Management ====================

  async connect(): Promise<void> {
    if (this.initialized) return

    // Create data directory if it doesn't exist
    await fs.mkdir(this.dataDir, { recursive: true })

    // Create subdirectories for each table
    const tables = [
      'users',
      'orgUnits',
      'cycles',
      'kpiDefinitions',
      'kpiActuals',
      'approvals',
      'changeRequests',
      'notifications',
      'auditLogs',
      'evidences',
      'kpiLibrary',
      'approvalHierarchy',
      'proxyActions',
      'historicalData',
      'kpiTemplates',
      'companyDocuments',
      'kpiResources',
      'kpiLibraryUploads'
    ]

    for (const table of tables) {
      await fs.mkdir(path.join(this.dataDir, table), { recursive: true })
    }

    this.initialized = true
    console.log('✅ LocalStorage initialized at:', this.dataDir)
  }

  async disconnect(): Promise<void> {
    this.initialized = false
    console.log('✅ LocalStorage disconnected')
  }

  async transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    // For local storage, we don't have real transactions
    // Just execute the function
    return await fn(this)
  }

  // ==================== Helper Methods ====================

  private getFilePath(table: string, id: string): string {
    return path.join(this.dataDir, table, `${id}.json`)
  }

  private getIndexPath(table: string): string {
    return path.join(this.dataDir, table, '_index.json')
  }

  private async readFile<T>(filePath: string): Promise<T | null> {
    try {
      const data = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(data)
    } catch (error: any) {
      if (error.code === 'ENOENT') return null
      throw error
    }
  }

  private async writeFile(filePath: string, data: any): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
  }

  private async getAllRecords<T>(table: string): Promise<T[]> {
    await this.connect()
    const tableDir = path.join(this.dataDir, table)

    try {
      const files = await fs.readdir(tableDir)
      const records: T[] = []

      for (const file of files) {
        if (file === '_index.json' || !file.endsWith('.json')) continue

        const filePath = path.join(tableDir, file)
        const record = await this.readFile<T>(filePath)
        if (record) records.push(record)
      }

      return records
    } catch (error) {
      return []
    }
  }

  private async saveRecord(table: string, id: string, data: any): Promise<any> {
    await this.connect()
    const filePath = this.getFilePath(table, id)
    const record = { ...data, id }
    await this.writeFile(filePath, record)
    return record
  }

  private async deleteRecord(table: string, id: string): Promise<void> {
    await this.connect()
    const filePath = this.getFilePath(table, id)
    try {
      await fs.unlink(filePath)
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error
    }
  }

  private matchesFilters(record: any, filters: any = {}): boolean {
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null) continue
      if (record[key] !== value) return false
    }
    return true
  }

  // ==================== User Repository ====================

  async getUsers(filters?: { role?: string; department?: string; status?: string }): Promise<any[]> {
    const users = await this.getAllRecords<any>('users')
    return users.filter(user => this.matchesFilters(user, filters))
  }

  async getUserById(id: string): Promise<any | null> {
    await this.connect()
    return await this.readFile(this.getFilePath('users', id))
  }

  async getUserByEmail(email: string): Promise<any | null> {
    const users = await this.getAllRecords<any>('users')
    return users.find(u => u.email === email) || null
  }

  async createUser(data: any): Promise<any> {
    const id = data.id || uuidv4()
    return await this.saveRecord('users', id, {
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }

  async updateUser(id: string, data: any): Promise<any> {
    const existing = await this.getUserById(id)
    if (!existing) throw new Error(`User ${id} not found`)

    return await this.saveRecord('users', id, {
      ...existing,
      ...data,
      id,
      updatedAt: new Date().toISOString()
    })
  }

  // ==================== OrgUnit Repository ====================

  async getOrgUnits(filters?: { type?: string; parentId?: string }): Promise<any[]> {
    const orgUnits = await this.getAllRecords<any>('orgUnits')
    return orgUnits.filter(ou => this.matchesFilters(ou, filters))
  }

  async createOrgUnit(data: any): Promise<any> {
    const id = data.id || uuidv4()
    return await this.saveRecord('orgUnits', id, {
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }

  // ==================== Cycle Repository ====================

  async getCycles(status?: string): Promise<any[]> {
    const cycles = await this.getAllRecords<any>('cycles')
    if (status) {
      return cycles.filter(c => c.status === status)
    }
    return cycles
  }

  async getCycleById(id: string): Promise<any | null> {
    await this.connect()
    return await this.readFile(this.getFilePath('cycles', id))
  }

  async createCycle(data: any): Promise<any> {
    const id = data.id || uuidv4()
    return await this.saveRecord('cycles', id, {
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }

  async updateCycle(id: string, data: any): Promise<any> {
    const existing = await this.getCycleById(id)
    if (!existing) throw new Error(`Cycle ${id} not found`)

    return await this.saveRecord('cycles', id, {
      ...existing,
      ...data,
      id,
      updatedAt: new Date().toISOString()
    })
  }

  async getActiveCycle(): Promise<any | null> {
    const cycles = await this.getCycles('ACTIVE')
    return cycles[0] || null
  }

  // ==================== KPI Definition Repository ====================

  async getKpiDefinitions(filters?: {
    cycleId?: string
    userId?: string
    status?: string
    orgUnitId?: string
  }): Promise<any[]> {
    const kpis = await this.getAllRecords<any>('kpiDefinitions')
    return kpis.filter(kpi => this.matchesFilters(kpi, filters))
  }

  async getKpiDefinitionById(id: string): Promise<any | null> {
    await this.connect()
    return await this.readFile(this.getFilePath('kpiDefinitions', id))
  }

  async createKpiDefinition(data: any): Promise<any> {
    const id = data.id || uuidv4()
    return await this.saveRecord('kpiDefinitions', id, {
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }

  async updateKpiDefinition(id: string, data: any): Promise<any> {
    const existing = await this.getKpiDefinitionById(id)
    if (!existing) throw new Error(`KPI Definition ${id} not found`)

    return await this.saveRecord('kpiDefinitions', id, {
      ...existing,
      ...data,
      id,
      updatedAt: new Date().toISOString()
    })
  }

  async deleteKpiDefinition(id: string): Promise<any> {
    const existing = await this.getKpiDefinitionById(id)
    if (!existing) throw new Error(`KPI Definition ${id} not found`)

    await this.deleteRecord('kpiDefinitions', id)
    return existing
  }

  // ==================== KPI Actual Repository ====================

  async getKpiActuals(filters?: { kpiDefinitionId?: string; status?: string }): Promise<any[]> {
    const actuals = await this.getAllRecords<any>('kpiActuals')
    return actuals.filter(actual => this.matchesFilters(actual, filters))
  }

  async getKpiActualById(id: string): Promise<any | null> {
    await this.connect()
    return await this.readFile(this.getFilePath('kpiActuals', id))
  }

  async createKpiActual(data: any): Promise<any> {
    const id = data.id || uuidv4()
    return await this.saveRecord('kpiActuals', id, {
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }

  async updateKpiActual(id: string, data: any): Promise<any> {
    const existing = await this.getKpiActualById(id)
    if (!existing) throw new Error(`KPI Actual ${id} not found`)

    return await this.saveRecord('kpiActuals', id, {
      ...existing,
      ...data,
      id,
      updatedAt: new Date().toISOString()
    })
  }

  async deleteKpiActual(id: string): Promise<any> {
    const existing = await this.getKpiActualById(id)
    if (!existing) throw new Error(`KPI Actual ${id} not found`)

    await this.deleteRecord('kpiActuals', id)
    return existing
  }

  // ==================== Approval Repository ====================

  async getApprovals(filters?: {
    approverId?: string
    status?: string
    entityType?: string
  }): Promise<any[]> {
    const approvals = await this.getAllRecords<any>('approvals')
    return approvals.filter(approval => this.matchesFilters(approval, filters))
  }

  async getApprovalById(id: string): Promise<any | null> {
    await this.connect()
    return await this.readFile(this.getFilePath('approvals', id))
  }

  async createApproval(data: any): Promise<any> {
    const id = data.id || uuidv4()
    return await this.saveRecord('approvals', id, {
      ...data,
      createdAt: data.createdAt || new Date().toISOString()
    })
  }

  async updateApproval(id: string, data: any): Promise<any> {
    const existing = await this.getApprovalById(id)
    if (!existing) throw new Error(`Approval ${id} not found`)

    return await this.saveRecord('approvals', id, {
      ...existing,
      ...data,
      id
    })
  }

  // ==================== Change Request Repository ====================

  async getChangeRequests(filters?: {
    kpiDefinitionId?: string
    requesterId?: string
    status?: string
  }): Promise<any[]> {
    const requests = await this.getAllRecords<any>('changeRequests')
    return requests.filter(req => this.matchesFilters(req, filters))
  }

  async getChangeRequestById(id: string): Promise<any | null> {
    await this.connect()
    return await this.readFile(this.getFilePath('changeRequests', id))
  }

  async createChangeRequest(data: any): Promise<any> {
    const id = data.id || uuidv4()
    return await this.saveRecord('changeRequests', id, {
      ...data,
      createdAt: data.createdAt || new Date().toISOString()
    })
  }

  async updateChangeRequest(id: string, data: any): Promise<any> {
    const existing = await this.getChangeRequestById(id)
    if (!existing) throw new Error(`Change Request ${id} not found`)

    return await this.saveRecord('changeRequests', id, {
      ...existing,
      ...data,
      id
    })
  }

  // ==================== Notification Repository ====================

  async getNotifications(filters?: { userId?: string; status?: string }): Promise<any[]> {
    const notifications = await this.getAllRecords<any>('notifications')
    return notifications.filter(notif => this.matchesFilters(notif, filters))
  }

  async createNotification(data: any): Promise<any> {
    const id = data.id || uuidv4()
    return await this.saveRecord('notifications', id, {
      ...data,
      createdAt: data.createdAt || new Date().toISOString()
    })
  }

  async updateNotification(id: string, data: any): Promise<any> {
    const existing = await this.readFile<any>(this.getFilePath('notifications', id))
    if (!existing) throw new Error(`Notification ${id} not found`)

    return await this.saveRecord('notifications', id, {
      ...existing,
      ...data,
      id
    })
  }

  async markAllAsRead(userId: string): Promise<any> {
    const notifications = await this.getNotifications({ userId, status: 'UNREAD' })
    const now = new Date().toISOString()

    for (const notif of notifications) {
      await this.saveRecord('notifications', notif.id, {
        ...notif,
        status: 'READ',
        readAt: now
      })
    }

    return { updated: notifications.length }
  }

  // ==================== Audit Log Repository ====================

  async createAuditLog(data: any): Promise<any> {
    const id = data.id || uuidv4()
    return await this.saveRecord('auditLogs', id, {
      ...data,
      createdAt: data.createdAt || new Date().toISOString()
    })
  }

  async getAuditLogs(filters?: {
    actorId?: string
    entityType?: string
    entityId?: string
  }): Promise<any[]> {
    const logs = await this.getAllRecords<any>('auditLogs')
    return logs.filter(log => this.matchesFilters(log, filters))
  }

  // ==================== Evidence Repository ====================

  async createEvidence(data: any): Promise<any> {
    const id = data.id || uuidv4()
    return await this.saveRecord('evidences', id, {
      ...data,
      uploadedAt: data.uploadedAt ? new Date(data.uploadedAt).toISOString() : new Date().toISOString()
    })
  }

  async getEvidencesByActualId(actualId: string): Promise<any[]> {
    const evidences = await this.getAllRecords<any>('evidences')
    return evidences.filter(e => e.actualId === actualId)
  }

  // ==================== KPI Library Repository ====================

  async getKpiLibraryEntries(filters?: {
    department?: string
    jobTitle?: string
    status?: string
  }): Promise<any[]> {
    const entries = await this.getAllRecords<any>('kpiLibrary')
    return entries.filter(entry => this.matchesFilters(entry, filters))
  }

  async getKpiLibraryEntryById(id: string): Promise<any | null> {
    await this.connect()
    return await this.readFile(this.getFilePath('kpiLibrary', id))
  }

  async createKpiLibraryEntry(data: any): Promise<any> {
    const id = data.id || uuidv4()
    return await this.saveRecord('kpiLibrary', id, {
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }

  async updateKpiLibraryEntry(id: string, data: any): Promise<any> {
    const existing = await this.getKpiLibraryEntryById(id)
    if (!existing) throw new Error(`KPI Library Entry ${id} not found`)

    return await this.saveRecord('kpiLibrary', id, {
      ...existing,
      ...data,
      id,
      updatedAt: new Date().toISOString()
    })
  }

  async deleteKpiLibraryEntry(id: string): Promise<any> {
    const existing = await this.getKpiLibraryEntryById(id)
    if (!existing) throw new Error(`KPI Library Entry ${id} not found`)

    await this.deleteRecord('kpiLibrary', id)
    return existing
  }

  // ==================== Approval Hierarchy Repository ====================

  async getApprovalHierarchy(userId: string): Promise<any | null> {
    const hierarchies = await this.getAllRecords<any>('approvalHierarchy')
    return hierarchies.find(h => h.userId === userId) || null
  }

  async getActiveApprovalHierarchy(userId: string): Promise<any | null> {
    const hierarchies = await this.getAllRecords<any>('approvalHierarchy')
    return hierarchies.find(h => h.userId === userId && h.isActive) || null
  }

  async createApprovalHierarchy(data: any): Promise<any> {
    const id = data.id || uuidv4()
    return await this.saveRecord('approvalHierarchy', id, {
      ...data,
      createdAt: data.createdAt || new Date().toISOString()
    })
  }

  // ==================== Proxy Action Repository ====================

  async createProxyAction(data: any): Promise<any> {
    const id = data.id || uuidv4()
    return await this.saveRecord('proxyActions', id, {
      ...data,
      performedAt: data.performedAt || new Date().toISOString()
    })
  }

  async getProxyActions(filters?: {
    performedBy?: string
    actionType?: string
    entityId?: string
  }): Promise<any[]> {
    const actions = await this.getAllRecords<any>('proxyActions')
    return actions.filter(action => this.matchesFilters(action, filters))
  }

  // ==================== Historical Data Repository ====================

  async createHistoricalKpiData(data: any): Promise<any> {
    const id = data.id || uuidv4()
    return await this.saveRecord('historicalData', id, data)
  }

  async getHistoricalKpiData(filters?: {
    userId?: string
    year?: number
    quarter?: number
  }): Promise<any[]> {
    const data = await this.getAllRecords<any>('historicalData')
    return data.filter(item => this.matchesFilters(item, filters))
  }

  // ==================== KPI Template Repository ====================

  async getKpiTemplates(filters?: { department?: string; isActive?: boolean }): Promise<any[]> {
    const templates = await this.getAllRecords<any>('kpiTemplates')
    return templates.filter(template => this.matchesFilters(template, filters))
  }

  async getKpiTemplateById(id: string): Promise<any | null> {
    await this.connect()
    return await this.readFile(this.getFilePath('kpiTemplates', id))
  }

  async createKpiTemplate(data: any): Promise<any> {
    const id = data.id || uuidv4()
    return await this.saveRecord('kpiTemplates', id, {
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }

  async updateKpiTemplate(id: string, data: any): Promise<any> {
    const existing = await this.getKpiTemplateById(id)
    if (!existing) throw new Error(`KPI Template ${id} not found`)

    return await this.saveRecord('kpiTemplates', id, {
      ...existing,
      ...data,
      id,
      updatedAt: new Date().toISOString()
    })
  }

  // ==================== Company Document Repository ====================

  async getCompanyDocuments(filters?: {
    type?: string
    department?: string
    aiIndexed?: boolean
  }): Promise<any[]> {
    const documents = await this.getAllRecords<any>('companyDocuments')
    return documents.filter(doc => this.matchesFilters(doc, filters))
  }

  async getCompanyDocumentById(id: string): Promise<any | null> {
    await this.connect()
    return await this.readFile(this.getFilePath('companyDocuments', id))
  }

  async createCompanyDocument(data: any): Promise<any> {
    const id = data.id || uuidv4()
    return await this.saveRecord('companyDocuments', id, {
      ...data,
      uploadedAt: data.uploadedAt || new Date().toISOString()
    })
  }

  async updateCompanyDocument(id: string, data: any): Promise<any> {
    const existing = await this.getCompanyDocumentById(id)
    if (!existing) throw new Error(`Company Document ${id} not found`)

    return await this.saveRecord('companyDocuments', id, {
      ...existing,
      ...data,
      id
    })
  }

  async deleteCompanyDocument(id: string): Promise<any> {
    const existing = await this.getCompanyDocumentById(id)
    if (!existing) throw new Error(`Company Document ${id} not found`)

    await this.deleteRecord('companyDocuments', id)
    return existing
  }

  // ==================== KPI Resource Repository ====================

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
  }): Promise<any[]> {
    let resources = await this.getAllRecords<any>('kpiResources')

    if (filters) {
      if (filters.category) {
        resources = resources.filter(r => r.category === filters.category)
      }
      if (filters.resourceType) {
        resources = resources.filter(r => r.resourceType === filters.resourceType)
      }
      if (filters.department) {
        resources = resources.filter(r =>
          r.department?.toLowerCase().includes(filters.department!.toLowerCase())
        )
      }
      if (filters.status) {
        resources = resources.filter(r => r.status === filters.status)
      }
      if (filters.approvalStatus) {
        resources = resources.filter(r => r.approvalStatus === filters.approvalStatus)
      }
      if (filters.isPublic !== undefined) {
        resources = resources.filter(r => r.isPublic === filters.isPublic)
      }
      if (filters.isFeatured !== undefined) {
        resources = resources.filter(r => r.isFeatured === filters.isFeatured)
      }
      if (filters.dashboardType) {
        resources = resources.filter(r => r.dashboardType === filters.dashboardType)
      }
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase()
        resources = resources.filter(r =>
          r.title?.toLowerCase().includes(query) ||
          r.description?.toLowerCase().includes(query) ||
          r.fileName?.toLowerCase().includes(query) ||
          r.tags?.some((tag: string) => tag.toLowerCase().includes(query))
        )
      }
    }

    return resources.sort((a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )
  }

  async getKpiResourceById(id: string): Promise<any | null> {
    await this.connect()
    return await this.readFile(this.getFilePath('kpiResources', id))
  }

  async createKpiResource(data: any): Promise<any> {
    const id = data.id || uuidv4()
    return await this.saveRecord('kpiResources', id, {
      ...data,
      uploadedAt: data.uploadedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      downloadCount: data.downloadCount || 0,
      viewCount: data.viewCount || 0,
      status: data.status || 'ACTIVE',
      approvalStatus: data.approvalStatus || 'PENDING'
    })
  }

  async updateKpiResource(id: string, data: any): Promise<any> {
    const existing = await this.getKpiResourceById(id)
    if (!existing) throw new Error(`KPI Resource ${id} not found`)

    return await this.saveRecord('kpiResources', id, {
      ...existing,
      ...data,
      id,
      updatedAt: new Date().toISOString()
    })
  }

  async deleteKpiResource(id: string): Promise<any> {
    const existing = await this.getKpiResourceById(id)
    if (!existing) throw new Error(`KPI Resource ${id} not found`)

    return await this.saveRecord('kpiResources', id, {
      ...existing,
      status: 'DELETED',
      updatedAt: new Date().toISOString()
    })
  }

  async getKpiResourceStatistics(): Promise<any> {
    const resources = await this.getAllRecords<any>('kpiResources')

    return {
      total: resources.length,
      active: resources.filter(r => r.status === 'ACTIVE').length,
      archived: resources.filter(r => r.status === 'ARCHIVED').length,
      pending: resources.filter(r => r.approvalStatus === 'PENDING').length,
      approved: resources.filter(r => r.approvalStatus === 'APPROVED').length,
      rejected: resources.filter(r => r.approvalStatus === 'REJECTED').length,
      totalDownloads: resources.reduce((sum, r) => sum + (r.downloadCount || 0), 0),
      totalViews: resources.reduce((sum, r) => sum + (r.viewCount || 0), 0)
    }
  }

  async approveKpiResource(id: string, approvedBy: string, comment?: string): Promise<any> {
    return await this.updateKpiResource(id, {
      approvalStatus: 'APPROVED',
      approvedBy,
      approvedAt: new Date().toISOString()
    })
  }

  async rejectKpiResource(id: string, approvedBy: string, reason: string): Promise<any> {
    return await this.updateKpiResource(id, {
      approvalStatus: 'REJECTED',
      approvedBy,
      approvedAt: new Date().toISOString(),
      rejectionReason: reason
    })
  }

  async incrementDownloadCount(id: string): Promise<void> {
    const resource = await this.getKpiResourceById(id)
    if (resource) {
      await this.updateKpiResource(id, {
        downloadCount: (resource.downloadCount || 0) + 1
      })
    }
  }

  async incrementViewCount(id: string): Promise<void> {
    const resource = await this.getKpiResourceById(id)
    if (resource) {
      await this.updateKpiResource(id, {
        viewCount: (resource.viewCount || 0) + 1
      })
    }
  }

  async getBIDashboards(filters?: { dashboardType?: string; department?: string }): Promise<any[]> {
    let resources = await this.getKpiResources({ resourceType: 'BI_DASHBOARD' })

    if (filters) {
      if (filters.dashboardType) {
        resources = resources.filter(r => r.dashboardType === filters.dashboardType)
      }
      if (filters.department) {
        resources = resources.filter(r => r.department === filters.department)
      }
    }

    return resources
  }

  // ==================== KPI Library Upload Repository ====================

  async getKpiLibraryUploads(filters?: { status?: string }): Promise<any[]> {
    let uploads = await this.getAllRecords<any>('kpiLibraryUploads')

    if (filters?.status) {
      uploads = uploads.filter(u => u.status === filters.status)
    }

    return uploads.sort((a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )
  }

  async getKpiLibraryUploadById(id: string): Promise<any | null> {
    await this.connect()
    return await this.readFile(this.getFilePath('kpiLibraryUploads', id))
  }

  async createKpiLibraryUpload(data: any): Promise<any> {
    const id = data.id || uuidv4()
    return await this.saveRecord('kpiLibraryUploads', id, {
      ...data,
      uploadedAt: data.uploadedAt || new Date().toISOString(),
      status: data.status || 'PENDING'
    })
  }

  async approveKpiLibraryUpload(id: string, reviewedBy: string, comment?: string): Promise<any> {
    const upload = await this.getKpiLibraryUploadById(id)
    if (!upload) throw new Error(`KPI Library Upload ${id} not found`)

    // Extract valid rows and create templates
    const rawData = upload.rawData || []
    const dataRows = rawData.slice(6) // Skip header rows as per upload logic
    let processedCount = 0

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      const rowNumber = i + 7 // Actual row number in Excel (starts at row 7)
      const kpiName = row[4]?.toString().trim()
      const department = row[2]?.toString().trim()
      const kpiType = row[5]?.toString().trim()
      const jobTitle = row[3]?.toString().trim()

      // Basic validation matching upload route
      if (kpiName && department) {
        // Create more descriptive name to differentiate templates
        const templateDescription = jobTitle
          ? `${kpiName} - ${jobTitle} (Row ${rowNumber} from ${upload.fileName})`
          : `${kpiName} - ${department} (Row ${rowNumber} from ${upload.fileName})`

        await this.createKpiTemplate({
          name: kpiName,
          description: templateDescription,
          department: department,
          jobTitle: jobTitle,
          category: this.mapKpiTypeToCategory(kpiType),
          kpiType: kpiType || 'Custom',
          unit: row[6]?.toString().trim(),
          formula: row[7]?.toString().trim(),
          dataSource: row[8]?.toString().trim(),
          targetValue: row[9] ? parseFloat(row[9].toString()) : undefined,
          weight: row[10] ? parseFloat(row[10].toString()) : undefined,
          source: 'EXCEL_IMPORT',
          uploadId: id,
          status: 'ACTIVE',
          isActive: true,
          createdBy: upload.uploadedBy, // Attribute to uploader
          createdAt: new Date().toISOString(),
          version: 1,
          usageCount: 0
        })
        processedCount++
      }
    }

    return await this.saveRecord('kpiLibraryUploads', id, {
      ...upload,
      status: 'APPROVED',
      reviewedBy,
      reviewedAt: new Date().toISOString(),
      reviewComment: comment,
      processedCount
    })
  }

  private mapKpiTypeToCategory(type: string): string {
    const map: Record<string, string> = {
      'I': 'FINANCIAL',
      'II': 'CUSTOMER',
      'III': 'OPERATIONAL',
      'IV': 'LEARNING'
    }
    return map[type] || 'OPERATIONAL'
  }

  async rejectKpiLibraryUpload(id: string, reviewedBy: string, reason: string): Promise<any> {
    const existing = await this.getKpiLibraryUploadById(id)
    if (!existing) throw new Error(`KPI Library Upload ${id} not found`)

    return await this.saveRecord('kpiLibraryUploads', id, {
      ...existing,
      status: 'REJECTED',
      reviewedBy,
      reviewedAt: new Date().toISOString(),
      rejectionReason: reason
    })
  }

  async getKpiLibraryUploadStatistics(): Promise<any> {
    const uploads = await this.getAllRecords<any>('kpiLibraryUploads')

    return {
      total: uploads.length,
      pending: uploads.filter(u => u.status === 'PENDING').length,
      approved: uploads.filter(u => u.status === 'APPROVED').length,
      rejected: uploads.filter(u => u.status === 'REJECTED').length
    }
  }

  // ==================== Enhanced KPI Template Repository ====================

  async submitForReview(id: string, submittedBy: string): Promise<any> {
    return await this.updateKpiTemplate(id, {
      status: 'PENDING_REVIEW',
      submittedBy,
      submittedAt: new Date().toISOString()
    })
  }

  async approveTemplate(id: string, reviewedBy: string, comment?: string): Promise<any> {
    return await this.updateKpiTemplate(id, {
      status: 'APPROVED',
      reviewedBy,
      reviewedAt: new Date().toISOString(),
      reviewComment: comment,
      isActive: true
    })
  }

  async rejectTemplate(id: string, reviewedBy: string, reason: string): Promise<any> {
    return await this.updateKpiTemplate(id, {
      status: 'REJECTED',
      reviewedBy,
      reviewedAt: new Date().toISOString(),
      rejectionReason: reason,
      isActive: false
    })
  }

  async cloneTemplate(id: string, createdBy: string, overrides?: any): Promise<any> {
    const template = await this.getKpiTemplateById(id)
    if (!template) throw new Error(`KPI Template ${id} not found`)

    const newId = uuidv4()
    return await this.saveRecord('kpiTemplates', newId, {
      ...template,
      ...overrides,
      id: newId,
      createdBy,
      createdAt: new Date().toISOString(),
      clonedFrom: id,
      usageCount: 0
    })
  }

  async incrementUsage(id: string): Promise<void> {
    const template = await this.getKpiTemplateById(id)
    if (template) {
      await this.updateKpiTemplate(id, {
        usageCount: (template.usageCount || 0) + 1
      })
    }
  }

  async archiveTemplate(id: string): Promise<any> {
    return await this.updateKpiTemplate(id, {
      isActive: false,
      archivedAt: new Date().toISOString()
    })
  }

  async getTemplateStatistics(): Promise<any> {
    const templates = await this.getAllRecords<any>('kpiTemplates')

    // Only count templates that haven't been deleted or archived
    const activeTemplates = templates.filter(t => !t.deletedAt && !t.isDeleted && !t.archivedAt)

    return {
      total: activeTemplates.length,
      active: activeTemplates.filter(t => t.isActive && t.status === 'ACTIVE').length,
      pending: activeTemplates.filter(t => t.status === 'PENDING_REVIEW').length,
      approved: activeTemplates.filter(t => t.status === 'APPROVED').length,
      rejected: activeTemplates.filter(t => t.status === 'REJECTED').length,
      totalUsage: activeTemplates.reduce((sum, t) => sum + (t.usageCount || 0), 0)
    }
  }
}
