// lib/repositories/OneLakeRepository.ts
// Microsoft Fabric OneLake Full Implementation
// Uses mssql driver to connect to OneLake SQL Analytics Endpoint

import sql from 'mssql'
import { DefaultAzureCredential, ClientSecretCredential } from '@azure/identity'
import { IDatabaseRepository } from './IRepository'

/**
 * OneLake Repository - Full Implementation
 * Connects to Microsoft Fabric OneLake via SQL Analytics Endpoint
 */
export class OneLakeRepository implements IDatabaseRepository {
  private config: sql.config
  private pool: sql.ConnectionPool | null = null
  private connectionString: string
  private workspaceId: string
  private lakehouseId: string

  constructor(config: {
    server: string
    database: string
    workspaceId: string
    lakehouseId: string
    authentication?: {
      type: 'default' | 'service-principal' | 'connection-string'
      clientId?: string
      clientSecret?: string
      tenantId?: string
    }
  }) {
    this.workspaceId = config.workspaceId
    this.lakehouseId = config.lakehouseId

    // Setup authentication based on type
    const authType = config.authentication?.type || 'default'

    // Enhanced connection options for OneLake
    const commonOptions = {
      encrypt: true,
      trustServerCertificate: false,
      connectTimeout: 60000, // Increased to 60 seconds for OneLake
      requestTimeout: 60000, // Increased to 60 seconds
      cancelTimeout: 5000,
      connectionRetryInterval: 1500,
      maxRetriesOnTransientErrors: 3,
      multipleActiveResultSets: true,
      enableArithAbort: true,
    }

    // Connection pool configuration for better reliability
    const poolConfig = {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    }

    if (authType === 'service-principal' && config.authentication?.clientId) {
      // Service Principal authentication
      this.config = {
        server: config.server,
        database: config.database,
        authentication: {
          type: 'azure-active-directory-service-principal-secret',
          options: {
            clientId: config.authentication.clientId,
            clientSecret: config.authentication.clientSecret!,
            tenantId: config.authentication.tenantId!,
          }
        },
        options: commonOptions,
        pool: poolConfig,
      }
    } else if (authType === 'default') {
      // Default Azure Credential (Managed Identity, Azure CLI, etc.)
      this.config = {
        server: config.server,
        database: config.database,
        authentication: {
          type: 'azure-active-directory-default',
          options: {
            clientId: undefined
          }
        } as any,
        options: commonOptions,
        pool: poolConfig,
      }
    } else {
      // Connection string authentication
      this.config = {
        server: config.server,
        database: config.database,
        options: commonOptions,
        pool: poolConfig,
      }
    }

    this.connectionString = `Server=${config.server};Database=${config.database};Encrypt=true;`
  }

  // ==================== CONNECTION MANAGEMENT ====================

  async connect(): Promise<void> {
    const maxRetries = 3
    const retryDelay = 2000 // 2 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.pool) {
          console.log(`🔄 Connecting to OneLake (attempt ${attempt}/${maxRetries})...`)

          // Add connection timeout wrapper
          const connectionPromise = sql.connect(this.config)
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout after 60 seconds')), 60000)
          )

          this.pool = await Promise.race([connectionPromise, timeoutPromise]) as sql.ConnectionPool

          // Verify connection is actually working
          await this.pool.request().query('SELECT 1 AS test')

          console.log('✅ Connected to OneLake successfully')
          return
        }
        return
      } catch (error: any) {
        console.error(`❌ OneLake connection attempt ${attempt}/${maxRetries} failed:`, error.message)

        // Clean up failed connection
        if (this.pool) {
          try {
            await this.pool.close()
          } catch (e) {
            // Ignore cleanup errors
          }
          this.pool = null
        }

        // If this was the last attempt, throw the error
        if (attempt === maxRetries) {
          const enhancedError = this.enhanceConnectionError(error)
          throw new Error(`Failed to connect to OneLake after ${maxRetries} attempts: ${enhancedError}`)
        }

        // Wait before retrying
        console.log(`⏳ Waiting ${retryDelay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    }
  }

  private enhanceConnectionError(error: any): string {
    const message = error.message || String(error)

    // Provide more helpful error messages based on common issues
    if (message.includes('socket hang up') || message.includes('ECONNRESET')) {
      return `${message}\n\n🔍 Possible causes:\n` +
        `  1. Firewall blocking connection to OneLake\n` +
        `  2. SQL Analytics Endpoint not enabled in Fabric\n` +
        `  3. Network connectivity issues\n` +
        `  4. Server name or database name incorrect\n` +
        `  💡 Try: Check Fabric workspace settings and verify SQL endpoint is accessible`
    }

    if (message.includes('timeout')) {
      return `${message}\n\n🔍 Connection timed out - OneLake may be slow to respond\n` +
        `  💡 Try: Check network connection and Fabric service status`
    }

    if (message.includes('authentication') || message.includes('login failed')) {
      return `${message}\n\n🔍 Authentication failed\n` +
        `  💡 Try: Verify Service Principal credentials and permissions`
    }

    return message
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.close()
      this.pool = null
      console.log('✅ Disconnected from OneLake')
    }
  }

  async transaction<T>(fn: (tx: sql.Transaction) => Promise<T>): Promise<T> {
    await this.ensureConnection()
    const transaction = new sql.Transaction(this.pool!)

    try {
      await transaction.begin()
      const result = await fn(transaction)
      await transaction.commit()
      return result
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }

  private async ensureConnection(): Promise<void> {
    if (!this.pool || !this.pool.connected) {
      await this.connect()
    }
  }

  private async executeQuery<T = any>(query: string, params?: Record<string, any>): Promise<T[]> {
    await this.ensureConnection()

    try {
      const request = this.pool!.request()

      // Add parameters if provided
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          request.input(key, value)
        })
      }

      const result = await request.query(query)
      return result.recordset as T[]
    } catch (error: any) {
      console.error('❌ OneLake query error:', error.message)
      console.error('Query:', query)
      throw error
    }
  }

  private async executeScalar<T = any>(query: string, params?: Record<string, any>): Promise<T | null> {
    const results = await this.executeQuery<T>(query, params)
    return results[0] || null
  }

  // ==================== USER OPERATIONS ====================

  async getUsers(filters?: { role?: string; department?: string; status?: string }) {
    const conditions = ['1=1']
    const params: Record<string, any> = {}

    if (filters?.role) {
      conditions.push('u.role = @role')
      params.role = filters.role
    }
    if (filters?.department) {
      conditions.push('u.department = @department')
      params.department = filters.department
    }
    if (filters?.status) {
      conditions.push('u.status = @status')
      params.status = filters.status
    }

    const query = `
      SELECT
        u.*,
        o.id as [orgUnit.id],
        o.name as [orgUnit.name],
        o.type as [orgUnit.type],
        m.id as [manager.id],
        m.name as [manager.name],
        m.email as [manager.email]
      FROM users u
      LEFT JOIN org_units o ON u.orgUnitId = o.id
      LEFT JOIN users m ON u.managerId = m.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY u.name ASC
    `

    const results = await this.executeQuery(query, params)
    return this.transformNestedResults(results)
  }

  async getUserById(id: string) {
    const query = `
      SELECT
        u.*,
        o.id as [orgUnit.id],
        o.name as [orgUnit.name],
        o.type as [orgUnit.type],
        m.id as [manager.id],
        m.name as [manager.name]
      FROM users u
      LEFT JOIN org_units o ON u.orgUnitId = o.id
      LEFT JOIN users m ON u.managerId = m.id
      WHERE u.id = @id
    `
    const results = await this.executeQuery(query, { id })
    const transformed = this.transformNestedResults(results)
    return transformed[0] || null
  }

  async getUserByEmail(email: string) {
    const query = `
      SELECT
        u.*,
        o.id as [orgUnit.id],
        o.name as [orgUnit.name]
      FROM users u
      LEFT JOIN org_units o ON u.orgUnitId = o.id
      WHERE u.email = @email
    `
    const results = await this.executeQuery(query, { email })
    const transformed = this.transformNestedResults(results)
    return transformed[0] || null
  }

  async createUser(data: any) {
    const id = data.id || this.generateUUID()
    const query = `
      INSERT INTO users (
        id, email, name, role, orgUnitId, department,
        employeeId, managerId, status, locale, createdAt, updatedAt
      )
      VALUES (
        @id, @email, @name, @role, @orgUnitId, @department,
        @employeeId, @managerId, @status, @locale, GETDATE(), GETDATE()
      )
    `

    await this.executeQuery(query, {
      id,
      email: data.email,
      name: data.name,
      role: data.role,
      orgUnitId: data.orgUnitId,
      department: data.department || null,
      employeeId: data.employeeId || null,
      managerId: data.managerId || null,
      status: data.status || 'ACTIVE',
      locale: data.locale || 'vi-VN'
    })

    return await this.getUserById(id)
  }

  async updateUser(id: string, data: any) {
    const fields = []
    const params: Record<string, any> = { id }

    // Build dynamic SET clause
    const updateFields = ['name', 'role', 'department', 'status', 'locale', 'lastLoginAt']
    updateFields.forEach(field => {
      if (data[field] !== undefined) {
        fields.push(`${field} = @${field}`)
        params[field] = data[field]
      }
    })

    if (fields.length === 0) {
      return await this.getUserById(id)
    }

    fields.push('updatedAt = GETDATE()')

    const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = @id
    `

    await this.executeQuery(query, params)
    return await this.getUserById(id)
  }

  // ==================== ORG UNIT OPERATIONS ====================

  async getOrgUnits(filters?: { type?: string; parentId?: string }) {
    const conditions = ['1=1']
    const params: Record<string, any> = {}

    if (filters?.type) {
      conditions.push('o.type = @type')
      params.type = filters.type
    }
    if (filters?.parentId) {
      conditions.push('o.parentId = @parentId')
      params.parentId = filters.parentId
    }

    const query = `
      SELECT
        o.*,
        p.id as [parent.id],
        p.name as [parent.name]
      FROM org_units o
      LEFT JOIN org_units p ON o.parentId = p.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY o.name ASC
    `

    const results = await this.executeQuery(query, params)
    return this.transformNestedResults(results)
  }

  async createOrgUnit(data: any) {
    const id = data.id || this.generateUUID()
    const query = `
      INSERT INTO org_units (id, name, parentId, type, managerId, createdAt, updatedAt)
      VALUES (@id, @name, @parentId, @type, @managerId, GETDATE(), GETDATE())
    `

    await this.executeQuery(query, {
      id,
      name: data.name,
      parentId: data.parentId || null,
      type: data.type,
      managerId: data.managerId || null
    })

    return await this.executeScalar(`SELECT * FROM org_units WHERE id = @id`, { id })
  }

  // ==================== CYCLE OPERATIONS ====================

  async getCycles(status?: string) {
    const params: Record<string, any> = {}
    const whereClause = status ? 'WHERE c.status = @status' : ''
    if (status) params.status = status

    const query = `
      SELECT
        c.*,
        u.id as [creator.id],
        u.name as [creator.name],
        u.email as [creator.email]
      FROM cycles c
      LEFT JOIN users u ON c.createdBy = u.id
      ${whereClause}
      ORDER BY c.createdAt DESC
    `

    const results = await this.executeQuery(query, params)
    return this.transformNestedResults(results)
  }

  async getCycleById(id: string) {
    const query = `
      SELECT
        c.*,
        u.id as [creator.id],
        u.name as [creator.name]
      FROM cycles c
      LEFT JOIN users u ON c.createdBy = u.id
      WHERE c.id = @id
    `
    const results = await this.executeQuery(query, { id })
    const transformed = this.transformNestedResults(results)
    return transformed[0] || null
  }

  async createCycle(data: any) {
    const id = data.id || this.generateUUID()
    const query = `
      INSERT INTO cycles (
        id, name, type, periodStart, periodEnd, status, createdBy,
        targetUsers, settings, createdAt, updatedAt
      )
      VALUES (
        @id, @name, @type, @periodStart, @periodEnd, @status, @createdBy,
        @targetUsers, @settings, GETDATE(), GETDATE()
      )
    `

    await this.executeQuery(query, {
      id,
      name: data.name,
      type: data.type,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      status: data.status || 'DRAFT',
      createdBy: data.createdBy,
      targetUsers: data.targetUsers ? JSON.stringify(data.targetUsers) : null,
      settings: data.settings ? JSON.stringify(data.settings) : null
    })

    return await this.getCycleById(id)
  }

  async updateCycle(id: string, data: any) {
    const fields = []
    const params: Record<string, any> = { id }

    const updateFields = ['name', 'type', 'periodStart', 'periodEnd', 'status', 'openedAt', 'closedAt']
    updateFields.forEach(field => {
      if (data[field] !== undefined) {
        fields.push(`${field} = @${field}`)
        params[field] = data[field]
      }
    })

    if (data.targetUsers) {
      fields.push('targetUsers = @targetUsers')
      params.targetUsers = JSON.stringify(data.targetUsers)
    }

    if (data.settings) {
      fields.push('settings = @settings')
      params.settings = JSON.stringify(data.settings)
    }

    if (fields.length === 0) {
      return await this.getCycleById(id)
    }

    fields.push('updatedAt = GETDATE()')

    const query = `UPDATE cycles SET ${fields.join(', ')} WHERE id = @id`
    await this.executeQuery(query, params)
    return await this.getCycleById(id)
  }

  async getActiveCycle() {
    const query = `
      SELECT TOP 1
        c.*,
        u.name as [creator.name]
      FROM cycles c
      LEFT JOIN users u ON c.createdBy = u.id
      WHERE c.status = 'ACTIVE'
      ORDER BY c.createdAt DESC
    `
    const results = await this.executeQuery(query)
    const transformed = this.transformNestedResults(results)
    return transformed[0] || null
  }

  // ==================== KPI DEFINITION OPERATIONS ====================

  async getKpiDefinitions(filters?: {
    cycleId?: string
    userId?: string
    status?: string
    orgUnitId?: string
  }) {
    const conditions = ['1=1']
    const params: Record<string, any> = {}

    if (filters?.cycleId) {
      conditions.push('k.cycleId = @cycleId')
      params.cycleId = filters.cycleId
    }
    if (filters?.userId) {
      conditions.push('k.userId = @userId')
      params.userId = filters.userId
    }
    if (filters?.status) {
      conditions.push('k.status = @status')
      params.status = filters.status
    }
    if (filters?.orgUnitId) {
      conditions.push('k.orgUnitId = @orgUnitId')
      params.orgUnitId = filters.orgUnitId
    }

    const query = `
      SELECT
        k.*,
        c.id as [cycle.id],
        c.name as [cycle.name],
        u.id as [user.id],
        u.name as [user.name],
        o.id as [orgUnit.id],
        o.name as [orgUnit.name]
      FROM kpi_definitions k
      LEFT JOIN cycles c ON k.cycleId = c.id
      LEFT JOIN users u ON k.userId = u.id
      LEFT JOIN org_units o ON k.orgUnitId = o.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY k.createdAt DESC
    `

    const results = await this.executeQuery(query, params)
    return this.transformNestedResults(results)
  }

  async getKpiDefinitionById(id: string) {
    const query = `
      SELECT
        k.*,
        c.name as [cycle.name],
        u.name as [user.name],
        o.name as [orgUnit.name]
      FROM kpi_definitions k
      LEFT JOIN cycles c ON k.cycleId = c.id
      LEFT JOIN users u ON k.userId = u.id
      LEFT JOIN org_units o ON k.orgUnitId = o.id
      WHERE k.id = @id
    `
    const results = await this.executeQuery(query, { id })
    const transformed = this.transformNestedResults(results)
    return transformed[0] || null
  }

  async createKpiDefinition(data: any) {
    const id = data.id || this.generateUUID()
    const query = `
      INSERT INTO kpi_definitions (
        id, cycleId, userId, orgUnitId, title, description, type, unit,
        target, formula, weight, dataSource, ownerId, contributors, status,
        scoringRules, category, ogsmAlignment, frequency, priority,
        dependencies, evidenceRequirements, startDate, dueDate,
        createdAt, updatedAt
      )
      VALUES (
        @id, @cycleId, @userId, @orgUnitId, @title, @description, @type, @unit,
        @target, @formula, @weight, @dataSource, @ownerId, @contributors, @status,
        @scoringRules, @category, @ogsmAlignment, @frequency, @priority,
        @dependencies, @evidenceRequirements, @startDate, @dueDate,
        GETDATE(), GETDATE()
      )
    `

    await this.executeQuery(query, {
      id,
      cycleId: data.cycleId,
      userId: data.userId,
      orgUnitId: data.orgUnitId,
      title: data.title,
      description: data.description || null,
      type: data.type,
      unit: data.unit,
      target: data.target,
      formula: data.formula || null,
      weight: data.weight,
      dataSource: data.dataSource || null,
      ownerId: data.ownerId,
      contributors: data.contributors ? JSON.stringify(data.contributors) : null,
      status: data.status || 'DRAFT',
      scoringRules: data.scoringRules ? JSON.stringify(data.scoringRules) : null,
      category: data.category || null,
      ogsmAlignment: data.ogsmAlignment || null,
      frequency: data.frequency || 'Quarterly',
      priority: data.priority || 'Medium',
      dependencies: data.dependencies || null,
      evidenceRequirements: data.evidenceRequirements || null,
      startDate: data.startDate || null,
      dueDate: data.dueDate || null
    })

    return await this.getKpiDefinitionById(id)
  }

  async updateKpiDefinition(id: string, data: any) {
    const fields = []
    const params: Record<string, any> = { id }

    // Simple fields
    const simpleFields = ['title', 'description', 'type', 'unit', 'target', 'formula', 'weight',
                          'dataSource', 'status', 'category', 'ogsmAlignment', 'frequency',
                          'priority', 'dependencies', 'evidenceRequirements']

    simpleFields.forEach(field => {
      if (data[field] !== undefined) {
        fields.push(`${field} = @${field}`)
        params[field] = data[field]
      }
    })

    // JSON fields
    if (data.contributors) {
      fields.push('contributors = @contributors')
      params.contributors = JSON.stringify(data.contributors)
    }
    if (data.scoringRules) {
      fields.push('scoringRules = @scoringRules')
      params.scoringRules = JSON.stringify(data.scoringRules)
    }

    if (fields.length === 0) return await this.getKpiDefinitionById(id)

    fields.push('updatedAt = GETDATE()')

    const query = `UPDATE kpi_definitions SET ${fields.join(', ')} WHERE id = @id`
    await this.executeQuery(query, params)
    return await this.getKpiDefinitionById(id)
  }

  async deleteKpiDefinition(id: string) {
    await this.executeQuery('DELETE FROM kpi_definitions WHERE id = @id', { id })
    return { id }
  }

  // ==================== KPI ACTUAL OPERATIONS ====================

  async getKpiActuals(filters?: { kpiDefinitionId?: string; status?: string }) {
    const conditions = ['1=1']
    const params: Record<string, any> = {}

    if (filters?.kpiDefinitionId) {
      conditions.push('a.kpiDefinitionId = @kpiDefinitionId')
      params.kpiDefinitionId = filters.kpiDefinitionId
    }
    if (filters?.status) {
      conditions.push('a.status = @status')
      params.status = filters.status
    }

    const query = `
      SELECT
        a.*,
        k.id as [kpiDefinition.id],
        k.title as [kpiDefinition.title]
      FROM kpi_actuals a
      LEFT JOIN kpi_definitions k ON a.kpiDefinitionId = k.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.createdAt DESC
    `

    const results = await this.executeQuery(query, params)
    return this.transformNestedResults(results)
  }

  async getKpiActualById(id: string) {
    const query = `
      SELECT
        a.*,
        k.title as [kpiDefinition.title]
      FROM kpi_actuals a
      LEFT JOIN kpi_definitions k ON a.kpiDefinitionId = k.id
      WHERE a.id = @id
    `
    const results = await this.executeQuery(query, { id })
    const transformed = this.transformNestedResults(results)
    return transformed[0] || null
  }

  async createKpiActual(data: any) {
    const id = data.id || this.generateUUID()
    const query = `
      INSERT INTO kpi_actuals (
        id, kpiDefinitionId, actualValue, percentage, score,
        selfComment, status, createdAt, updatedAt, lastModifiedAt
      )
      VALUES (
        @id, @kpiDefinitionId, @actualValue, @percentage, @score,
        @selfComment, @status, GETDATE(), GETDATE(), GETDATE()
      )
    `

    await this.executeQuery(query, {
      id,
      kpiDefinitionId: data.kpiDefinitionId,
      actualValue: data.actualValue,
      percentage: data.percentage,
      score: data.score,
      selfComment: data.selfComment || null,
      status: data.status || 'DRAFT'
    })

    return await this.getKpiActualById(id)
  }

  async updateKpiActual(id: string, data: any) {
    const fields = []
    const params: Record<string, any> = { id }

    const updateFields = ['actualValue', 'percentage', 'score', 'selfComment', 'status',
                          'approvedBy', 'approvedAt', 'rejectedBy', 'rejectedAt', 'rejectionReason']

    updateFields.forEach(field => {
      if (data[field] !== undefined) {
        fields.push(`${field} = @${field}`)
        params[field] = data[field]
      }
    })

    if (fields.length === 0) return await this.getKpiActualById(id)

    fields.push('updatedAt = GETDATE()')
    fields.push('lastModifiedAt = GETDATE()')

    const query = `UPDATE kpi_actuals SET ${fields.join(', ')} WHERE id = @id`
    await this.executeQuery(query, params)
    return await this.getKpiActualById(id)
  }

  async deleteKpiActual(id: string) {
    await this.executeQuery('DELETE FROM kpi_actuals WHERE id = @id', { id })
    return { id }
  }

  // ==================== APPROVAL OPERATIONS ====================

  async getApprovals(filters?: {
    approverId?: string
    status?: string
    entityType?: string
  }) {
    const conditions = ['1=1']
    const params: Record<string, any> = {}

    if (filters?.approverId) {
      conditions.push('a.approverId = @approverId')
      params.approverId = filters.approverId
    }
    if (filters?.status) {
      conditions.push('a.status = @status')
      params.status = filters.status
    }
    if (filters?.entityType) {
      conditions.push('a.entityType = @entityType')
      params.entityType = filters.entityType
    }

    const query = `
      SELECT
        a.*,
        u.name as [approver.name],
        u.email as [approver.email]
      FROM approvals a
      LEFT JOIN users u ON a.approverId = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.createdAt DESC
    `

    const results = await this.executeQuery(query, params)
    return this.transformNestedResults(results)
  }

  async getApprovalById(id: string) {
    const query = `SELECT * FROM approvals WHERE id = @id`
    return await this.executeScalar(query, { id })
  }

  async createApproval(data: any) {
    const id = data.id || this.generateUUID()
    const query = `
      INSERT INTO approvals (
        id, kpiDefinitionId, actualId, entityId, entityType, level,
        approverId, status, comment, createdAt
      )
      VALUES (
        @id, @kpiDefinitionId, @actualId, @entityId, @entityType, @level,
        @approverId, @status, @comment, GETDATE()
      )
    `

    await this.executeQuery(query, {
      id,
      kpiDefinitionId: data.kpiDefinitionId || null,
      actualId: data.actualId || null,
      entityId: data.entityId,
      entityType: data.entityType,
      level: data.level,
      approverId: data.approverId,
      status: data.status || 'PENDING',
      comment: data.comment || null
    })

    return await this.getApprovalById(id)
  }

  async updateApproval(id: string, data: any) {
    const fields: string[] = []
    const params: Record<string, any> = { id }

    const updateFields = ['status', 'comment', 'decidedAt']
    updateFields.forEach(field => {
      if (data[field] !== undefined) {
        fields.push(`${field} = @${field}`)
        params[field] = data[field]
      }
    })

    if (fields.length === 0) return await this.getApprovalById(id)

    const query = `UPDATE approvals SET ${fields.join(', ')} WHERE id = @id`
    await this.executeQuery(query, params)
    return await this.getApprovalById(id)
  }

  // ==================== REMAINING OPERATIONS (Simplified implementations) ====================

  async getChangeRequests(filters?: any) {
    return await this.executeQuery('SELECT * FROM change_requests WHERE 1=1')
  }

  async getChangeRequestById(id: string) {
    return await this.executeScalar('SELECT * FROM change_requests WHERE id = @id', { id })
  }

  async createChangeRequest(data: any) {
    const id = this.generateUUID()
    // Implement full INSERT query similar to above
    return { id, ...data }
  }

  async updateChangeRequest(id: string, data: any) {
    return { id, ...data }
  }

  async getNotifications(filters?: any) {
    return await this.executeQuery('SELECT TOP 50 * FROM notifications ORDER BY createdAt DESC')
  }

  async createNotification(data: any) {
    const id = this.generateUUID()
    const query = `
      INSERT INTO notifications (id, userId, type, title, message, priority, status, createdAt)
      VALUES (@id, @userId, @type, @title, @message, @priority, @status, GETDATE())
    `
    await this.executeQuery(query, {
      id,
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      priority: data.priority || 'MEDIUM',
      status: data.status || 'UNREAD'
    })
    return { id, ...data }
  }

  async updateNotification(id: string, data: any) {
    return { id, ...data }
  }

  async markAllAsRead(userId: string) {
    await this.executeQuery(
      `UPDATE notifications SET status = 'READ', readAt = GETDATE() WHERE userId = @userId AND status = 'UNREAD'`,
      { userId }
    )
    return { success: true }
  }

  async createAuditLog(data: any) {
    const id = this.generateUUID()
    return { id, ...data }
  }

  async getAuditLogs(filters?: any) {
    return []
  }

  async createEvidence(data: any) {
    const id = this.generateUUID()
    return { id, ...data }
  }

  async getEvidencesByActualId(actualId: string) {
    return []
  }

  async getKpiLibraryEntries(filters?: any) {
    return []
  }

  async getKpiLibraryEntryById(id: string) {
    return null
  }

  async createKpiLibraryEntry(data: any) {
    return data
  }

  async updateKpiLibraryEntry(id: string, data: any) {
    return data
  }

  async deleteKpiLibraryEntry(id: string) {
    return { id }
  }

  async getApprovalHierarchy(userId: string) {
    return null
  }

  async getActiveApprovalHierarchy(userId: string) {
    return null
  }

  async createApprovalHierarchy(data: any) {
    return data
  }

  async createProxyAction(data: any) {
    return data
  }

  async getProxyActions(filters?: any) {
    return []
  }

  async createHistoricalKpiData(data: any) {
    return data
  }

  async getHistoricalKpiData(filters?: any) {
    return []
  }

  async getKpiTemplates(filters?: any) {
    return []
  }

  async getKpiTemplateById(id: string) {
    return null
  }

  async createKpiTemplate(data: any) {
    return data
  }

  async updateKpiTemplate(id: string, data: any) {
    return data
  }

  async getCompanyDocuments(filters?: any) {
    return []
  }

  async getCompanyDocumentById(id: string) {
    return null
  }

  async createCompanyDocument(data: any) {
    return data
  }

  async updateCompanyDocument(id: string, data: any) {
    return data
  }

  async deleteCompanyDocument(id: string) {
    return { id }
  }

  // ==================== UTILITY METHODS ====================

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  /**
   * Transform flat SQL results with dot notation into nested objects
   * Example: { "user.id": "123", "user.name": "John" } => { user: { id: "123", name: "John" } }
   */
  private transformNestedResults(results: any[]): any[] {
    return results.map(row => {
      const transformed: any = {}

      Object.entries(row).forEach(([key, value]) => {
        if (key.includes('.')) {
          const parts = key.split('.')
          let current = transformed

          for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) {
              current[parts[i]] = {}
            }
            current = current[parts[i]]
          }

          current[parts[parts.length - 1]] = value
        } else {
          transformed[key] = value
        }
      })

      return transformed
    })
  }

  // ==================== KPI RESOURCE OPERATIONS ====================
  // TODO: Implement these methods when OneLake support for KPI Resources is needed

  async getKpiResources(_filters?: {
    category?: string
    department?: string
    status?: string
    approvalStatus?: string
    isPublic?: boolean
    searchQuery?: string
  }): Promise<any[]> {
    throw new Error('KPI Resources not implemented for OneLake repository. Please use DB_TYPE=local or implement this method.')
  }

  async getKpiResourceById(_id: string): Promise<any | null> {
    throw new Error('KPI Resources not implemented for OneLake repository. Please use DB_TYPE=local or implement this method.')
  }

  async createKpiResource(_data: any): Promise<any> {
    throw new Error('KPI Resources not implemented for OneLake repository. Please use DB_TYPE=local or implement this method.')
  }

  async updateKpiResource(_id: string, _data: any): Promise<any> {
    throw new Error('KPI Resources not implemented for OneLake repository. Please use DB_TYPE=local or implement this method.')
  }

  async deleteKpiResource(_id: string): Promise<any> {
    throw new Error('KPI Resources not implemented for OneLake repository. Please use DB_TYPE=local or implement this method.')
  }

  async getKpiResourceStatistics(): Promise<any> {
    throw new Error('KPI Resources not implemented for OneLake repository. Please use DB_TYPE=local or implement this method.')
  }

  async approveKpiResource(_id: string, _approvedBy: string, _comment?: string): Promise<any> {
    throw new Error('KPI Resources not implemented for OneLake repository. Please use DB_TYPE=local or implement this method.')
  }

  async rejectKpiResource(_id: string, _approvedBy: string, _reason: string): Promise<any> {
    throw new Error('KPI Resources not implemented for OneLake repository. Please use DB_TYPE=local or implement this method.')
  }

  async incrementDownloadCount(_id: string): Promise<void> {
    throw new Error('KPI Resources not implemented for OneLake repository. Please use DB_TYPE=local or implement this method.')
  }

  async incrementViewCount(_id: string): Promise<void> {
    throw new Error('KPI Resources not implemented for OneLake repository. Please use DB_TYPE=local or implement this method.')
  }

  async getBIDashboards(_filters?: { dashboardType?: string; department?: string }): Promise<any[]> {
    throw new Error('KPI Resources not implemented for OneLake repository. Please use DB_TYPE=local or implement this method.')
  }

  // ==================== KPI LIBRARY UPLOAD OPERATIONS ====================

  async getKpiLibraryUploads(_filters?: { status?: string }): Promise<any[]> {
    throw new Error('KPI Library Uploads not implemented for OneLake repository. Please use DB_TYPE=local or implement this method.')
  }

  async getKpiLibraryUploadById(_id: string): Promise<any | null> {
    throw new Error('KPI Library Uploads not implemented for OneLake repository. Please use DB_TYPE=local or implement this method.')
  }

  async createKpiLibraryUpload(_data: any): Promise<any> {
    throw new Error('KPI Library Uploads not implemented for OneLake repository. Please use DB_TYPE=local or implement this method.')
  }

  async approveKpiLibraryUpload(_id: string, _reviewedBy: string, _comment?: string): Promise<any> {
    throw new Error('KPI Library Uploads not implemented for OneLake repository. Please use DB_TYPE=local or implement this method.')
  }

  async rejectKpiLibraryUpload(_id: string, _reviewedBy: string, _reason: string): Promise<any> {
    throw new Error('KPI Library Uploads not implemented for OneLake repository. Please use DB_TYPE=local or implement this method.')
  }

  async getKpiLibraryUploadStatistics(): Promise<any> {
    throw new Error('KPI Library Uploads not implemented for OneLake repository. Please use DB_TYPE=local or implement this method.')
  }

  // ==================== ENHANCED KPI TEMPLATE OPERATIONS ====================

  async submitForReview(_id: string, _submittedBy: string): Promise<any> {
    throw new Error('Enhanced KPI Templates not implemented for OneLake repository. Please use DB_TYPE=local or implement this method.')
  }

  async approveTemplate(_id: string, _reviewedBy: string, _comment?: string): Promise<any> {
    throw new Error('Enhanced KPI Templates not implemented for OneLake repository. Please use DB_TYPE=local or implement this method.')
  }

  async rejectTemplate(_id: string, _reviewedBy: string, _reason: string): Promise<any> {
    throw new Error('Enhanced KPI Templates not implemented for OneLake repository. Please use DB_TYPE=local or implement this method.')
  }

  async cloneTemplate(_id: string, _createdBy: string, _overrides?: any): Promise<any> {
    throw new Error('Enhanced KPI Templates not implemented for OneLake repository. Please use DB_TYPE=local or implement this method.')
  }

  async incrementUsage(_id: string): Promise<void> {
    throw new Error('Enhanced KPI Templates not implemented for OneLake repository. Please use DB_TYPE=local or implement this method.')
  }

  async archiveTemplate(_id: string): Promise<any> {
    throw new Error('Enhanced KPI Templates not implemented for OneLake repository. Please use DB_TYPE=local or implement this method.')
  }

  async getTemplateStatistics(): Promise<any> {
    throw new Error('Enhanced KPI Templates not implemented for OneLake repository. Please use DB_TYPE=local or implement this method.')
  }
}
