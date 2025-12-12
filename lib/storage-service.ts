// lib/storage-service.ts
import type { 
  User, 
  Cycle, 
  CycleStatus,
  KpiDefinition, 
  KpiTemplate, 
  Approval, 
  ChangeRequest, 
  KpiActual,
  Evidence,
  Notification,
  OrgUnit
} from './types'

class StorageService {
  public readonly KEYS = {
    USERS: 'vicc_users',
    ORG_UNITS: 'vicc_org_units',
    CYCLES: 'vicc_cycles',
    KPI_DEFINITIONS: 'vicc_kpi_definitions',
    KPI_ACTUALS: 'vicc_kpi_actuals',
    KPI_TEMPLATES: 'vicc_kpi_templates',
    APPROVALS: 'vicc_approvals',
    CHANGE_REQUESTS: 'vicc_change_requests',
    EVIDENCES: 'vicc_evidences',
    NOTIFICATIONS: 'vicc_notifications',
    AUDIT_LOGS: 'vicc_audit_logs',
    // â­ NEW KEYS - ThÃªm vÃ o cuá»‘i
    KPI_LIBRARY: 'vicc_kpi_library',
    KPI_LIBRARY_UPLOADS: 'vicc_kpi_library_uploads',
    KPI_LIBRARY_CHANGE_REQUESTS: 'vicc_kpi_library_change_requests',
    ADMIN_PROXY_ACTIONS: 'vicc_admin_proxy_actions'
  }

  public getItem<T>(key: string): T[] {
    if (typeof window === 'undefined') return []
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : []
  }

  public setItem<T>(key: string, data: T[]): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(key, JSON.stringify(data))
  }

  private updateItem<T extends { id: string }>(
    key: string, 
    id: string, 
    update: Partial<T>
  ): T | null {
    const items = this.getItem<T>(key)
    const index = items.findIndex(item => item.id === id)
    
    if (index === -1) return null
    
    items[index] = { ...items[index], ...update }
    this.setItem(key, items)
    this.logAudit('update', key, id, update)
    
    return items[index]
  }

  private deleteItem<T extends { id: string }>(key: string, id: string): boolean {
    const items = this.getItem<T>(key)
    const index = items.findIndex(item => item.id === id)
    
    if (index === -1) return false
    
    items.splice(index, 1)
    this.setItem(key, items)
    this.logAudit('delete', key, id, {})
    
    return true
  }

  /**
   * Users
   */
  getUsers(filters?: { role?: string; department?: string; status?: string }): User[] {
    let users = this.getItem<User>(this.KEYS.USERS)
    
    if (filters) {
      if (filters.role) {
        users = users.filter(u => u.role === filters.role)
      }
      if (filters.department) {
        users = users.filter(u => u.department === filters.department)
      }
      if (filters.status) {
        users = users.filter(u => u.status === filters.status)
      }
    }
    
    return users
  }

  getUserById(id: string): User | undefined {
    const users = this.getItem<User>(this.KEYS.USERS)
    return users.find(u => u.id === id)
  }

  saveUser(user: User): User {
    const users = this.getItem<User>(this.KEYS.USERS)
    const existingIndex = users.findIndex(u => u.id === user.id)
    
    if (existingIndex > -1) {
      users[existingIndex] = user
    } else {
      users.push(user)
    }
    
    this.setItem(this.KEYS.USERS, users)
    return user
  }

  /**
   * Cycles
   */
  saveCycle(cycle: Cycle): Cycle {
    const cycles = this.getItem<Cycle>(this.KEYS.CYCLES)
    const existingIndex = cycles.findIndex(c => c.id === cycle.id)
    
    if (existingIndex > -1) {
      cycles[existingIndex] = { ...cycles[existingIndex], ...cycle }
    } else {
      cycles.push(cycle)
    }
    
    this.setItem(this.KEYS.CYCLES, cycles)
    this.logAudit('save', 'cycle', cycle.id, cycle)
    return cycle
  }

  getCycles(filters?: { 
    status?: CycleStatus | string
    type?: string
    userId?: string 
  }): Cycle[] {
    let cycles = this.getItem<Cycle>(this.KEYS.CYCLES)
    
    if (filters) {
      if (filters.status) {
        cycles = cycles.filter(c => c.status === filters.status)
      }
      if (filters.type) {
        cycles = cycles.filter(c => c.type === filters.type)
      }
      if (filters.userId) {
        cycles = cycles.filter(c => c.createdBy === filters.userId)
      }
    }
    
    cycles.sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime())
    
    return cycles
  }

  getCycleById(id: string): Cycle | undefined {
    const cycles = this.getItem<Cycle>(this.KEYS.CYCLES)
    return cycles.find(c => c.id === id)
  }

  getCurrentCycle(): Cycle | null {
    const cycles = this.getCycles({ status: 'ACTIVE' })
    if (cycles.length === 0) {
      const defaultCycle = this.createDefaultCycle()
      if (defaultCycle) {
        return this.saveCycle(defaultCycle)
      }
      return null
    }
    
    return cycles[0]
  }

  createDefaultCycle(): Cycle {
    const currentYear = new Date().getFullYear()
    const cycleId = `cycle-${currentYear}-annual`
    
    return {
      id: cycleId,
      name: `${currentYear} Annual Performance Cycle`,
      type: 'YEARLY',
      periodStart: `${currentYear}-01-01`,
      periodEnd: `${currentYear}-12-31`,
      status: 'ACTIVE',
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      openedAt: new Date().toISOString(),
      settings: {
        allowLateSubmission: false,
        requireEvidence: true,
        minKpisPerUser: 3,
        maxKpisPerUser: 5,
        totalWeightMustEqual: 100
      }
    }
  }

  updateCycle(id: string, update: Partial<Cycle>): Cycle | null {
    return this.updateItem<Cycle>(this.KEYS.CYCLES, id, update)
  }

  updateCycleStatus(cycleId: string, status: CycleStatus): Cycle | null {
    const cycles = this.getItem<Cycle>(this.KEYS.CYCLES)
    const cycle = cycles.find(c => c.id === cycleId)
    
    if (!cycle) return null
    
    if (status === 'ACTIVE') {
      cycles.forEach(c => {
        if (c.id !== cycleId && c.status === 'ACTIVE') {
          c.status = 'CLOSED'
          c.closedAt = new Date().toISOString()
        }
      })
    }
    
    cycle.status = status
    cycle.updatedAt = new Date().toISOString()
    
    if (status === 'ACTIVE') {
      cycle.openedAt = new Date().toISOString()
    } else if (status === 'CLOSED') {
      cycle.closedAt = new Date().toISOString()
    }
    
    this.setItem(this.KEYS.CYCLES, cycles)
    this.logAudit('update_status', 'cycle', cycleId, { status })
    
    return cycle
  }

  getCycleStatistics(cycleId: string): {
    totalUsers: number
    usersWithKpis: number
    totalKpis: number
    avgKpisPerUser: number
    submittedKpis: number
    approvedKpis: number
    completionRate: number
  } {
    const kpis = this.getKpiDefinitions({ cycleId })
    const uniqueUsers = new Set(kpis.map(k => k.userId))
    const submittedKpis = kpis.filter(k => k.status !== 'DRAFT').length
    const approvedKpis = kpis.filter(k => k.status === 'APPROVED' || k.status === 'LOCKED_GOALS').length
    
    return {
      totalUsers: uniqueUsers.size,
      usersWithKpis: uniqueUsers.size,
      totalKpis: kpis.length,
      avgKpisPerUser: uniqueUsers.size > 0 ? kpis.length / uniqueUsers.size : 0,
      submittedKpis,
      approvedKpis,
      completionRate: kpis.length > 0 ? (approvedKpis / kpis.length) * 100 : 0
    }
  }

  /**
   * KPI Definitions
   */
  saveKpiDefinition(kpi: KpiDefinition): KpiDefinition {
    const kpis = this.getItem<KpiDefinition>(this.KEYS.KPI_DEFINITIONS)
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

  getKpiDefinitionById(id: string): KpiDefinition | undefined {
    const kpis = this.getItem<KpiDefinition>(this.KEYS.KPI_DEFINITIONS)
    return kpis.find(k => k.id === id)
  }

  updateKpiDefinition(id: string, update: Partial<KpiDefinition>): KpiDefinition | null {
    return this.updateItem<KpiDefinition>(this.KEYS.KPI_DEFINITIONS, id, update)
  }

  // â­ ADDED METHOD - This was missing in your original file
  deleteKpiDefinition(id: string): boolean {
    return this.deleteItem<KpiDefinition>(this.KEYS.KPI_DEFINITIONS, id)
  }

  userHasKpisForCycle(userId: string, cycleId: string): boolean {
    const kpis = this.getKpiDefinitions({ 
      userId, 
      cycleId 
    })
    return kpis.length > 0
  }

  /**
   * KPI Templates
   */
  saveTemplate(template: KpiTemplate): KpiTemplate {
    const templates = this.getItem<KpiTemplate>(this.KEYS.KPI_TEMPLATES)
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

  getTemplateById(id: string): KpiTemplate | undefined {
    const templates = this.getItem<KpiTemplate>(this.KEYS.KPI_TEMPLATES)
    return templates.find(t => t.id === id)
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

  getChangeRequests(filters?: {
    kpiDefinitionId?: string
    requesterId?: string
    requesterType?: 'USER' | 'ADMIN'
    status?: string
  }): ChangeRequest[] {
    let requests = this.getItem<ChangeRequest>(this.KEYS.CHANGE_REQUESTS)
    
    if (filters) {
      if (filters.kpiDefinitionId) {
        requests = requests.filter(r => r.kpiDefinitionId === filters.kpiDefinitionId)
      }
      if (filters.requesterId) {
        requests = requests.filter(r => r.requesterId === filters.requesterId)
      }
      if (filters.requesterType) {
        requests = requests.filter(r => r.requesterType === filters.requesterType)
      }
      if (filters.status) {
        requests = requests.filter(r => r.status === filters.status)
      }
    }
    
    return requests
  }

  updateChangeRequest(id: string, update: Partial<ChangeRequest>): ChangeRequest | null {
    return this.updateItem<ChangeRequest>(this.KEYS.CHANGE_REQUESTS, id, update)
  }

  /**
   * Approvals
   */
  saveApproval(approval: Approval): Approval {
    const approvals = this.getItem<Approval>(this.KEYS.APPROVALS)
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
   * KPI Actuals
   */
  saveKpiActual(actual: KpiActual): KpiActual {
    const actuals = this.getItem<KpiActual>(this.KEYS.KPI_ACTUALS)
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

  /**
   * Evidences
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
    this.setItem(this.KEYS.NOTIFICATIONS, notifications)
    return notification
  }

  getNotifications(userId: string, unreadOnly: boolean = false): Notification[] {
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
    const notifications = this.getItem<Notification>(this.KEYS.NOTIFICATIONS)
    const index = notifications.findIndex(n => n.id === id)
    
    if (index !== -1) {
      notifications[index] = {
        ...notifications[index],
        status: 'READ',
        readAt: new Date().toISOString()
      }
      this.setItem(this.KEYS.NOTIFICATIONS, notifications)
    }
  }

  /**
   * Organization Units
   */
  getOrgUnits(): OrgUnit[] {
    return this.getItem<OrgUnit>(this.KEYS.ORG_UNITS)
  }

  saveOrgUnit(orgUnit: OrgUnit): OrgUnit {
    const orgUnits = this.getItem<OrgUnit>(this.KEYS.ORG_UNITS)
    const existingIndex = orgUnits.findIndex(o => o.id === orgUnit.id)
    
    if (existingIndex > -1) {
      orgUnits[existingIndex] = orgUnit
    } else {
      orgUnits.push(orgUnit)
    }
    
    this.setItem(this.KEYS.ORG_UNITS, orgUnits)
    return orgUnit
  }

  /**
   * Audit Logging
   */
  public logAudit(action: string, entity: string, entityId: string, data: any): void {
    const logs = this.getItem<any>(this.KEYS.AUDIT_LOGS)
    logs.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action,
      entity,
      entityId,
      data,
      timestamp: new Date().toISOString()
    })
    
    if (logs.length > 1000) {
      logs.shift()
    }
    
    this.setItem(this.KEYS.AUDIT_LOGS, logs)
  }

  getAuditLogs(filters?: {
    entity?: string
    entityId?: string
    userId?: string
    dateFrom?: string
    dateTo?: string
  }): any[] {
    let logs = this.getItem<any>(this.KEYS.AUDIT_LOGS)

    if (filters) {
      if (filters.entity) {
        logs = logs.filter(l => l.entity === filters.entity)
      }
      if (filters.entityId) {
        logs = logs.filter(l => l.entityId === filters.entityId)
      }
      if (filters.userId) {
        logs = logs.filter(l => l.actorId === filters.userId)
      }
      if (filters.dateFrom) {
        logs = logs.filter(l => new Date(l.timestamp) >= new Date(filters.dateFrom!))
      }
      if (filters.dateTo) {
        logs = logs.filter(l => new Date(l.timestamp) <= new Date(filters.dateTo!))
      }
    }

    return logs.reverse()
  }

  /**
   * Initialize default cycles if none exist
   */
  initializeDefaultCycles(): void {
    const cycles = this.getCycles()
    
    if (cycles.length === 0) {
      const defaultCycle = this.createDefaultCycle()
      this.saveCycle(defaultCycle)
      
      const currentYear = new Date().getFullYear()
      const quarters = [
        { q: 1, start: '01-01', end: '03-31' },
        { q: 2, start: '04-01', end: '06-30' },
        { q: 3, start: '07-01', end: '09-30' },
        { q: 4, start: '10-01', end: '12-31' }
      ]
      
      quarters.forEach(quarter => {
        const quarterlyCycle: Cycle = {
          id: `cycle-${currentYear}-q${quarter.q}`,
          name: `${currentYear} Q${quarter.q} Performance Review`,
          type: 'QUARTERLY',
          periodStart: `${currentYear}-${quarter.start}`,
          periodEnd: `${currentYear}-${quarter.end}`,
          status: 'DRAFT',
          createdBy: 'system',
          createdAt: new Date().toISOString(),
          settings: {
            allowLateSubmission: false,
            requireEvidence: true,
            minKpisPerUser: 3,
            maxKpisPerUser: 5,
            totalWeightMustEqual: 100
          }
        }
        this.saveCycle(quarterlyCycle)
      })
    }
  }

  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    if (typeof window === 'undefined') return
    Object.values(this.KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
  }
}

export const storageService = new StorageService()

// Initialize cycles on first load
if (typeof window !== 'undefined') {
  storageService.initializeDefaultCycles()
}

export default storageService