// Azure Function: Query Executor
// Handles SQL queries to OneLake using Managed Identity

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getConnectionPool, closeAllPools } from '../lib/connection'
import sql from 'mssql'

interface QueryRequest {
  query: string
  params?: Record<string, any>
  timeout?: number
}

interface QueryResponse {
  success: boolean
  data?: any[]
  rowCount?: number
  error?: string
  executionTime?: number
}

export async function queryHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const startTime = Date.now()

  try {
    // Parse request body
    const body = await request.json() as QueryRequest

    if (!body.query) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'Query is required'
        }
      }
    }

    context.log(`Executing query: ${body.query}`)

    // Get connection pool
    const pool = await getConnectionPool()

    // Create request
    const sqlRequest = pool.request()

    // Note: timeout is configured at pool level in connection.ts

    // Add parameters if provided
    if (body.params) {
      Object.entries(body.params).forEach(([key, value]) => {
        sqlRequest.input(key, value)
      })
    }

    // Execute query
    const result = await sqlRequest.query(body.query)

    const executionTime = Date.now() - startTime

    context.log(`Query executed successfully in ${executionTime}ms`)

    // Return results
    return {
      status: 200,
      jsonBody: {
        success: true,
        data: result.recordset,
        rowCount: result.recordset.length,
        executionTime
      } as QueryResponse
    }

  } catch (error: any) {
    context.error('Query execution failed:', error)

    const executionTime = Date.now() - startTime

    return {
      status: 500,
      jsonBody: {
        success: false,
        error: error.message,
        executionTime
      } as QueryResponse
    }
  }
}

// Register HTTP trigger
app.http('query', {
  methods: ['POST'],
  authLevel: 'function',
  handler: queryHandler
})
