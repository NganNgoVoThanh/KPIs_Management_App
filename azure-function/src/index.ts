// Azure Function - All-in-one file for OneLake Proxy
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import sql from 'mssql'
import { DefaultAzureCredential } from '@azure/identity'

// Connection pool
let pool: sql.ConnectionPool | null = null

async function getPool(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    return pool
  }

  const config: sql.config = {
    server: process.env.ONELAKE_SERVER!,
    database: process.env.ONELAKE_DATABASE!,
    authentication: {
      type: 'azure-active-directory-default',
      options: { clientId: undefined }
    } as any,
    options: {
      encrypt: true,
      trustServerCertificate: false,
      connectTimeout: 60000,
      requestTimeout: 60000,
      enableArithAbort: true,
    },
    pool: {
      max: 10,
      min: 2,
      idleTimeoutMillis: 30000,
    }
  }

  pool = new sql.ConnectionPool(config)
  await pool.connect()
  console.log('✅ Connected to OneLake')
  return pool
}

// Health endpoint
app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const p = await getPool()
      const result = await p.request().query('SELECT 1 AS test')

      return {
        status: 200,
        jsonBody: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          connection: {
            isConnected: p.connected,
            server: process.env.ONELAKE_SERVER,
            database: process.env.ONELAKE_DATABASE
          },
          test: result.recordset[0]
        }
      }
    } catch (error: any) {
      return {
        status: 503,
        jsonBody: {
          status: 'unhealthy',
          error: error.message
        }
      }
    }
  }
})

// Query endpoint
app.http('query', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'query',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const startTime = Date.now()

    try {
      const body: any = await request.json()

      if (!body.query) {
        return {
          status: 400,
          jsonBody: { success: false, error: 'Query is required' }
        }
      }

      context.log(`Executing: ${body.query}`)

      const p = await getPool()
      const req = p.request()

      if (body.params) {
        Object.entries(body.params).forEach(([key, value]) => {
          req.input(key, value as any)
        })
      }

      const result = await req.query(body.query)

      return {
        status: 200,
        jsonBody: {
          success: true,
          data: result.recordset,
          rowCount: result.recordset.length,
          executionTime: Date.now() - startTime
        }
      }
    } catch (error: any) {
      context.error('Query failed:', error)
      return {
        status: 500,
        jsonBody: {
          success: false,
          error: error.message,
          executionTime: Date.now() - startTime
        }
      }
    }
  }
})

// Execute endpoint
app.http('execute', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'execute',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const startTime = Date.now()

    try {
      const body: any = await request.json()

      if (!body.query) {
        return {
          status: 400,
          jsonBody: { success: false, error: 'Query is required' }
        }
      }

      context.log(`Executing: ${body.query}`)

      const p = await getPool()
      const req = p.request()

      if (body.params) {
        Object.entries(body.params).forEach(([key, value]) => {
          req.input(key, value as any)
        })
      }

      const result = await req.query(body.query)

      return {
        status: 200,
        jsonBody: {
          success: true,
          rowsAffected: result.rowsAffected[0],
          executionTime: Date.now() - startTime
        }
      }
    } catch (error: any) {
      context.error('Execute failed:', error)
      return {
        status: 500,
        jsonBody: {
          success: false,
          error: error.message,
          executionTime: Date.now() - startTime
        }
      }
    }
  }
})
