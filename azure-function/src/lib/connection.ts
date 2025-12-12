// Connection Pool Manager
// Manages SQL connection pool with Managed Identity

import sql from 'mssql'
import { DefaultAzureCredential } from '@azure/identity'

let pool: sql.ConnectionPool | null = null
let isConnecting = false

interface ConnectionConfig {
  server: string
  database: string
  workspaceId: string
  lakehouseId: string
}

function getConfig(): ConnectionConfig {
  return {
    server: process.env.ONELAKE_SERVER!,
    database: process.env.ONELAKE_DATABASE!,
    workspaceId: process.env.ONELAKE_WORKSPACE_ID!,
    lakehouseId: process.env.ONELAKE_LAKEHOUSE_ID!
  }
}

export async function getConnectionPool(): Promise<sql.ConnectionPool> {
  // Return existing pool if available
  if (pool && pool.connected) {
    return pool
  }

  // Prevent concurrent connection attempts
  if (isConnecting) {
    // Wait for existing connection attempt
    while (isConnecting) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    if (pool && pool.connected) {
      return pool
    }
  }

  isConnecting = true

  try {
    const config = getConfig()

    // Validate configuration
    if (!config.server || !config.database) {
      throw new Error('OneLake configuration is incomplete. Check environment variables.')
    }

    console.log(`Connecting to OneLake: ${config.server}/${config.database}`)

    // Create connection config with Managed Identity
    const sqlConfig: sql.config = {
      server: config.server,
      database: config.database,
      authentication: {
        type: 'azure-active-directory-default',
        options: {
          clientId: undefined // Will use system-assigned managed identity
        }
      } as any,
      options: {
        encrypt: true,
        trustServerCertificate: false,
        connectTimeout: 60000,
        requestTimeout: 60000,
        cancelTimeout: 5000,
        enableArithAbort: true,
      },
      pool: {
        max: 10,
        min: 2,
        idleTimeoutMillis: 30000,
      }
    }

    // Create and connect pool
    pool = new sql.ConnectionPool(sqlConfig)

    await pool.connect()

    // Test connection
    await pool.request().query('SELECT 1 AS test')

    console.log('✅ Connected to OneLake successfully with Managed Identity')

    return pool

  } catch (error: any) {
    console.error('❌ Failed to connect to OneLake:', error.message)
    pool = null
    throw error
  } finally {
    isConnecting = false
  }
}

export async function closeAllPools(): Promise<void> {
  if (pool) {
    await pool.close()
    pool = null
    console.log('✅ Connection pool closed')
  }
}

export function getConnectionStatus() {
  return {
    isConnected: pool?.connected || false,
    poolSize: pool?.size || 0,
    isConnecting
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing connections...')
  await closeAllPools()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing connections...')
  await closeAllPools()
  process.exit(0)
})
