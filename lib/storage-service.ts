// lib/storage-service.ts
import type { 
  KpiDefinition, 
  KpiActual, 
  Cycle, 
  KpiTemplate,
  Approval,
  ChangeRequest,
  Evidence,
  Notification,
  OrgUnit
} from './types'

/**
 * Storage Service - Manages all LocalStorage operations
 */
class StorageService {
  private readonly PREFIX = 'vicc_kpi_'
  
  // Storage keys
  private readonly KEYS = {
    KPI_DEFINITIONS: `${this.PREFIX}definitions`,
    KPI_ACTUALS: `${this.PREFIX}actuals`,
    KPI_TEMPLATES: `${this.PREFIX}templates`,
    CYCLES: `${this.PREFIX}cycles`,
    APPROVALS: `${this.PREFIX}approvals`,
    CHANGE_REQUESTS: `${this.PREFIX}change_requests`,
    EVIDENCES: `${this.PREFIX}evidences`,
    NOTIFICATIONS: `${this.PREFIX}notifications`,
    ORG_UNITS: `${this.PREFIX}org_units`,
    AUDIT_LOGS: `${this.PREFIX}audit_logs`,
    CALIBRATIONS: `${this.PREFIX}calibrations`
  }

  /**
   * Generic storage methods - PUBLIC
   */
  setItem<T>(key: string, data: T[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      console.error(`Error saving to localStorage (${key}):`, error)
      // Handle quota exceeded error
      if (error instanceof DOMException && error.code === 22) {
        this.clearOldData()
        localStorage.setItem(key, JSON.stringify(data))
      }
    }
  }

  getItem<T>(key: string): T[] {
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error(`Error reading from localStorage (${key}):`, error)
      return []
    }
  }

  updateItem<T extends { id: string }>(
    key: string, 
    id: string, 
    update: Partial<T>
  ): T | null {
    const items = this.getItem<T>(key)
    const index = items.findIndex(item => item.id === id)
    
    if (index === -1) return null
    
    items[index] = { ...items[index], ...update, updatedAt: new Date().toISOString() } as T
    this.setItem(key, items)
    
    this.logAudit('update', key, id, items[index])
    return items[index]
  }

  deleteItem<T extends { id: string }>(key: string, id: string): boolean {
    const items = this.getItem<T>(key)
    const filtered = items.filter(item => item.id !== id)
    
    if (filtered.length === items.length) return false
    
    this.setItem(key, filtered)
    this.logAudit('delete', key, id, null)
    return true
  }

  /**
   * KPI Definitions
   */
  saveKpiDefinition(kpi: KpiDefinition): KpiDefinition {
    const kpis = this.getKpiDefinitions()
    const existingIndex = kpis.findIndex(k => k.id === kpi.id)
    
    if (existingIndex > -1) {
      kpis[existingIndex] = kpi
    } else {
      kpis.push(kpi)
    }
    
    this.setItem(this.KEYS.KPI_DEFINITIONS, kpis)
    this.logAudit('save', 'kpi_definition', kpi.id, kpi)
    return kpi
  }

  getKpiDefinitions(filters?: {
    cycleId?: string
    userId?: string
    status?: string
    orgUnitId?: string
  }): KpiDefinition[] {
    let kpis = this.getItem<KpiDefinition>(this.KEYS.KPI_DEFINITIONS)
    
    if (filters) {
      if (filters.cycleId) {
        kpis = kpis.filter(k => k.cycleId === filters.cycleId)
      }
      if (filters.userId) {
        kpis = kpis.filter(k => k.userId === filters.userId)
      }
      if (filters.status) {
        kpis = kpis.filter(k => k.status === filters.status)
      }
      if (filters.orgUnitId) {
        kpis = kpis.filter(k => k.orgUnitId === filters.orgUnitId)
      }
    }
    
    return kpis
  }

  updateKpiDefinition(id: string, update: Partial<KpiDefinition>): KpiDefinition | null {
    return this.updateItem<KpiDefinition>(this.KEYS.KPI_DEFINITIONS, id, update)
  }

  deleteKpiDefinition(id: string): boolean {
    // Also delete related actuals
    const actuals = this.getKpiActuals({ kpiDefinitionId: id })
    actuals.forEach(actual => this.deleteKpiActual(actual.id))
    
    return this.deleteItem<KpiDefinition>(this.KEYS.KPI_DEFINITIONS, id)
  }

  /**
   * KPI Actuals
   */
  saveKpiActual(actual: KpiActual): KpiActual {
    const actuals = this.getKpiActuals()
    const existingIndex = actuals.findIndex(a => a.id === actual.id)
    
    if (existingIndex > -1) {
      actuals[existingIndex] = actual
    } else {
      actuals.push(actual)
    }
    
    this.setItem(this.KEYS.KPI_ACTUALS, actuals)
    this.logAudit('save', 'kpi_actual', actual.id, actual)
    return actual
  }

  getKpiActuals(filters?: {
    kpiDefinitionId?: string
    status?: string
  }): KpiActual[] {
    let actuals = this.getItem<KpiActual>(this.KEYS.KPI_ACTUALS)
    
    if (filters) {
      if (filters.kpiDefinitionId) {
        actuals = actuals.filter(a => a.kpiDefinitionId === filters.kpiDefinitionId)
      }
      if (filters.status) {
        actuals = actuals.filter(a => a.status === filters.status)
      }
    }
    
    return actuals
  }

  updateKpiActual(id: string, update: Partial<KpiActual>): KpiActual | null {
    return this.updateItem<KpiActual>(this.KEYS.KPI_ACTUALS, id, update)
  }

  deleteKpiActual(id: string): boolean {
    // Also delete related evidences
    const evidences = this.getEvidences(id)
    evidences.forEach(e => this.deleteEvidence(e.id))
    
    return this.deleteItem<KpiActual>(this.KEYS.KPI_ACTUALS, id)
  }

  /**
   * KPI Templates
   */
  saveTemplate(template: KpiTemplate): KpiTemplate {
    const templates = this.getTemplates()
    const existingIndex = templates.findIndex(t => t.id === template.id)
    
    if (existingIndex > -1) {
      templates[existingIndex] = template
    } else {
      templates.push(template)
    }
    
    this.setItem(this.KEYS.KPI_TEMPLATES, templates)
    return template
  }

  getTemplates(department?: string): KpiTemplate[] {
    let templates = this.getItem<KpiTemplate>(this.KEYS.KPI_TEMPLATES)
    
    if (department) {
      templates = templates.filter(t => t.department === department)
    }
    
    return templates.filter(t => t.isActive !== false)
  }

  updateTemplate(id: string, update: Partial<KpiTemplate>): KpiTemplate | null {
    return this.updateItem<KpiTemplate>(this.KEYS.KPI_TEMPLATES, id, update)
  }

  deleteTemplate(id: string): boolean {
    // Soft delete - just mark as inactive
    return this.updateTemplate(id, { isActive: false }) !== null
  }

  /**
   * Cycles
   */
  saveCycle(cycle: Cycle): Cycle {
    const cycles = this.getCycles()
    const existingIndex = cycles.findIndex(c => c.id === cycle.id)
    
    if (existingIndex > -1) {
      cycles[existingIndex] = cycle
    } else {
      cycles.push(cycle)
    }
    
    this.setItem(this.KEYS.CYCLES, cycles)
    return cycle
  }

  getCycles(status?: string): Cycle[] {
    let cycles = this.getItem<Cycle>(this.KEYS.CYCLES)
    
    if (status) {
      cycles = cycles.filter(c => c.status === status)
    }
    
    return cycles
  }

  getCurrentCycle(): Cycle | null {
    const cycles = this.getCycles('ACTIVE')
    return cycles.length > 0 ? cycles[0] : null
  }

  updateCycle(id: string, update: Partial<Cycle>): Cycle | null {
    return this.updateItem<Cycle>(this.KEYS.CYCLES, id, update)
  }

  /**
   * Approvals
   */
  saveApproval(approval: Approval): Approval {
    const approvals = this.getItem<Approval>(this.KEYS.APPROVALS)
    
    // Check if approval already exists and update instead
    const existingIndex = approvals.findIndex(a => a.id === approval.id)
    if (existingIndex > -1) {
      approvals[existingIndex] = approval
    } else {
      approvals.push(approval)
    }
    
    this.setItem(this.KEYS.APPROVALS, approvals)
    this.logAudit('approval', approval.entityType, approval.entityId, approval)
    return approval
  }

  getApprovals(entityId: string, entityType: 'KPI' | 'ACTUAL' | 'CHANGE_REQUEST'): Approval[] {
    const approvals = this.getItem<Approval>(this.KEYS.APPROVALS)
    return approvals.filter(a => a.entityId === entityId && a.entityType === entityType)
  }

  /**
   * Change Requests
   */
  saveChangeRequest(changeRequest: ChangeRequest): ChangeRequest {
    const requests = this.getItem<ChangeRequest>(this.KEYS.CHANGE_REQUESTS)
    const existingIndex = requests.findIndex(r => r.id === changeRequest.id)
    
    if (existingIndex > -1) {
      requests[existingIndex] = changeRequest
    } else {
      requests.push(changeRequest)
    }
    
    this.setItem(this.KEYS.CHANGE_REQUESTS, requests)
    return changeRequest
  }

  getChangeRequests(kpiDefinitionId?: string): ChangeRequest[] {
    let requests = this.getItem<ChangeRequest>(this.KEYS.CHANGE_REQUESTS)
    
    if (kpiDefinitionId) {
      requests = requests.filter(r => r.kpiDefinitionId === kpiDefinitionId)
    }
    
    return requests
  }

  /**
   * Evidence Files
   */
  saveEvidence(evidence: Evidence): Evidence {
    const evidences = this.getItem<Evidence>(this.KEYS.EVIDENCES)
    evidences.push(evidence)
    this.setItem(this.KEYS.EVIDENCES, evidences)
    return evidence
  }

  getEvidences(actualId: string): Evidence[] {
    const evidences = this.getItem<Evidence>(this.KEYS.EVIDENCES)
    return evidences.filter(e => e.actualId === actualId)
  }

  deleteEvidence(id: string): boolean {
    return this.deleteItem<Evidence>(this.KEYS.EVIDENCES, id)
  }

  /**
   * Notifications
   */
  saveNotification(notification: Notification): Notification {
    const notifications = this.getItem<Notification>(this.KEYS.NOTIFICATIONS)
    notifications.push(notification)
    
    // Keep only last 100 notifications per user
    const userNotifications = notifications.filter(n => n.userId === notification.userId)
    if (userNotifications.length > 100) {
      const toDelete = userNotifications.slice(0, userNotifications.length - 100)
      toDelete.forEach(n => this.deleteItem<Notification>(this.KEYS.NOTIFICATIONS, n.id))
    }
    
    this.setItem(this.KEYS.NOTIFICATIONS, notifications)
    return notification
  }

  getNotifications(userId: string, unreadOnly = false): Notification[] {
    let notifications = this.getItem<Notification>(this.KEYS.NOTIFICATIONS)
    notifications = notifications.filter(n => n.userId === userId)
    
    if (unreadOnly) {
      notifications = notifications.filter(n => n.status === 'UNREAD')
    }
    
    return notifications.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  markNotificationAsRead(id: string): void {
    this.updateItem<Notification>(this.KEYS.NOTIFICATIONS, id, { 
      status: 'READ',
      readAt: new Date().toISOString()
    })
  }

  /**
   * Organization Units
   */
  getOrgUnits(): OrgUnit[] {
    let units = this.getItem<OrgUnit>(this.KEYS.ORG_UNITS)
    
    // Initialize default org units if empty
    if (units.length === 0) {
      units = this.initializeOrgUnits()
      this.setItem(this.KEYS.ORG_UNITS, units)
    }
    
    return units
  }

  /**
   * Audit Logging
   */
  logAudit(action: string, entity: string, entityId: string, data: any): void {
    const logs = this.getItem<any>(this.KEYS.AUDIT_LOGS)
    const user = this.getCurrentUser()
    
    logs.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action,
      entity,
      entityId,
      userId: user?.id || 'system',
      data: JSON.stringify(data),
      timestamp: new Date().toISOString()
    })
    
    // Keep only last 1000 audit logs
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000)
    }
    
    this.setItem(this.KEYS.AUDIT_LOGS, logs)
  }

  getAuditLogs(filters?: {
    entity?: string
    entityId?: string
    userId?: string
    action?: string
  }): any[] {
    let logs = this.getItem<any>(this.KEYS.AUDIT_LOGS)
    
    if (filters) {
      if (filters.entity) logs = logs.filter(l => l.entity === filters.entity)
      if (filters.entityId) logs = logs.filter(l => l.entityId === filters.entityId)
      if (filters.userId) logs = logs.filter(l => l.userId === filters.userId)
      if (filters.action) logs = logs.filter(l => l.action === filters.action)
    }
    
    return logs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }

  /**
   * Utility Methods
   */
  getCurrentUser(): any {
    const stored = localStorage.getItem('vicc_kpi_current_user')
    if (!stored) return null
    
    try {
      const { user } = JSON.parse(stored)
      return user
    } catch {
      return null
    }
  }

  clearOldData(): void {
    // Clear data older than 6 months
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    
    // Clear old audit logs
    const logs = this.getItem<any>(this.KEYS.AUDIT_LOGS)
    const recentLogs = logs.filter(l => 
      new Date(l.timestamp) > sixMonthsAgo
    )
    this.setItem(this.KEYS.AUDIT_LOGS, recentLogs)
    
    // Clear old notifications
    const notifications = this.getItem<Notification>(this.KEYS.NOTIFICATIONS)
    const recentNotifications = notifications.filter(n => 
      new Date(n.createdAt) > sixMonthsAgo
    )
    this.setItem(this.KEYS.NOTIFICATIONS, recentNotifications)
  }

  /**
   * Export/Import functionality
   */
  exportData(): string {
    const data = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      kpiDefinitions: this.getKpiDefinitions(),
      kpiActuals: this.getKpiActuals(),
      templates: this.getTemplates(),
      cycles: this.getCycles(),
      approvals: this.getItem<Approval>(this.KEYS.APPROVALS),
      changeRequests: this.getChangeRequests(),
      evidences: this.getItem<Evidence>(this.KEYS.EVIDENCES),
      orgUnits: this.getOrgUnits()
    }
    
    return JSON.stringify(data, null, 2)
  }

  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData)
      
      if (!data.version || !data.exportDate) {
        throw new Error('Invalid import file format')
      }
      
      // Import data with validation
      if (data.kpiDefinitions) {
        this.setItem(this.KEYS.KPI_DEFINITIONS, data.kpiDefinitions)
      }
      if (data.kpiActuals) {
        this.setItem(this.KEYS.KPI_ACTUALS, data.kpiActuals)
      }
      if (data.templates) {
        this.setItem(this.KEYS.KPI_TEMPLATES, data.templates)
      }
      if (data.cycles) {
        this.setItem(this.KEYS.CYCLES, data.cycles)
      }
      if (data.approvals) {
        this.setItem(this.KEYS.APPROVALS, data.approvals)
      }
      if (data.changeRequests) {
        this.setItem(this.KEYS.CHANGE_REQUESTS, data.changeRequests)
      }
      if (data.evidences) {
        this.setItem(this.KEYS.EVIDENCES, data.evidences)
      }
      if (data.orgUnits) {
        this.setItem(this.KEYS.ORG_UNITS, data.orgUnits)
      }
      
      this.logAudit('import', 'system', 'bulk-import', { 
        recordCount: Object.keys(data).length 
      })
      
      return true
    } catch (error) {
      console.error('Import failed:', error)
      return false
    }
  }

  /**
   * Clear all data (for testing/reset)
   */
  clearAllData(): void {
    Object.values(this.KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
  }

  /**
   * Private helper methods
   */
  private initializeOrgUnits(): OrgUnit[] {
    return [
      { id: 'org-vicc', name: 'VICC', parentId: null, type: 'COMPANY' },
      { id: 'org-executive', name: 'Executive', parentId: 'org-vicc', type: 'DEPARTMENT' },
      { id: 'org-hr', name: 'Human Resources', parentId: 'org-vicc', type: 'DEPARTMENT' },
      { id: 'org-it', name: 'IT', parentId: 'org-vicc', type: 'DEPARTMENT' },
      { id: 'org-production', name: 'Production', parentId: 'org-vicc', type: 'DEPARTMENT' },
      { id: 'org-quality', name: 'Quality', parentId: 'org-vicc', type: 'DEPARTMENT' },
      { id: 'org-r&d', name: 'R&D', parentId: 'org-vicc', type: 'DEPARTMENT' },
      { id: 'org-sales', name: 'Sales', parentId: 'org-vicc', type: 'DEPARTMENT' },
      { id: 'org-marketing', name: 'Marketing', parentId: 'org-vicc', type: 'DEPARTMENT' },
      { id: 'org-finance', name: 'Finance', parentId: 'org-vicc', type: 'DEPARTMENT' }
    ]
  }
}

// Create singleton instance
export const storageService = new StorageService()

// Export for backward compatibility
export default storageService