// Azure Function: Health Check
// Tests connection to OneLake and returns status

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getConnectionPool, getConnectionStatus } from '../lib/connection'

export async function healthHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const status = getConnectionStatus()

    // Try a simple query
    const pool = await getConnectionPool()
    const result = await pool.request().query('SELECT 1 AS test')

    return {
      status: 200,
      jsonBody: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        connection: {
          isConnected: status.isConnected,
          server: process.env.ONELAKE_SERVER,
          database: process.env.ONELAKE_DATABASE,
          poolSize: status.poolSize
        },
        test: result.recordset[0]
      }
    }

  } catch (error: any) {
    context.error('Health check failed:', error)

    return {
      status: 503,
      jsonBody: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      }
    }
  }
}

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: healthHandler
})
