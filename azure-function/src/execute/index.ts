// Azure Function: Execute Non-Query
// Handles INSERT, UPDATE, DELETE operations

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getConnectionPool } from '../lib/connection'

interface ExecuteRequest {
  query: string
  params?: Record<string, any>
  timeout?: number
}

interface ExecuteResponse {
  success: boolean
  rowsAffected?: number
  error?: string
  executionTime?: number
}

export async function executeHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const startTime = Date.now()

  try {
    const body = await request.json() as ExecuteRequest

    if (!body.query) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'Query is required'
        }
      }
    }

    context.log(`Executing non-query: ${body.query}`)

    const pool = await getConnectionPool()
    const sqlRequest = pool.request()

    // Note: timeout is configured at pool level in connection.ts

    if (body.params) {
      Object.entries(body.params).forEach(([key, value]) => {
        sqlRequest.input(key, value)
      })
    }

    const result = await sqlRequest.query(body.query)

    const executionTime = Date.now() - startTime

    context.log(`Execute completed in ${executionTime}ms, rows affected: ${result.rowsAffected}`)

    return {
      status: 200,
      jsonBody: {
        success: true,
        rowsAffected: result.rowsAffected[0],
        executionTime
      } as ExecuteResponse
    }

  } catch (error: any) {
    context.error('Execute failed:', error)

    return {
      status: 500,
      jsonBody: {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      } as ExecuteResponse
    }
  }
}

app.http('execute', {
  methods: ['POST'],
  authLevel: 'function',
  handler: executeHandler
})
