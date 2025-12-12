// lib/repositories/DatabaseFactory.ts
// Database Factory - Strategy Pattern for Database Selection
// Switch database by changing one environment variable

import { IDatabaseRepository } from './IRepository'
import { MySQLRepository } from './MySQLRepository'
import { OneLakeRepository } from './OneLakeRepository'
import { AzureFunctionRepository } from './AzureFunctionRepository'
import { LocalStorageRepository } from './LocalStorageRepository'

export type DatabaseType = 'mysql' | 'onelake' | 'azure-function' | 'local' | 'postgres' | 'mongodb'

export class DatabaseFactory {
  private static instance: IDatabaseRepository | null = null

  /**
   * Get database instance (Singleton pattern)
   * The database type is determined by environment variable DB_TYPE
   */
  static getInstance(): IDatabaseRepository {
    if (!this.instance) {
      this.instance = this.createDatabase()
    }
    return this.instance
  }

  /**
   * Create database instance based on configuration
   */
  private static createDatabase(): IDatabaseRepository {
    const dbType = (process.env.DB_TYPE || 'mysql').toLowerCase() as DatabaseType

    switch (dbType) {
      case 'mysql':
        return this.createMySQLRepository()

      case 'onelake':
        return this.createOneLakeRepository()

      case 'azure-function':
        return this.createAzureFunctionRepository()

      case 'local':
        return this.createLocalStorageRepository()

      case 'postgres':
        throw new Error('PostgreSQL repository not yet implemented. Please implement PostgreSQLRepository class.')

      case 'mongodb':
        throw new Error('MongoDB repository not yet implemented. Please implement MongoDBRepository class.')

      default:
        console.warn(`Unknown database type: ${dbType}. Falling back to MySQL.`)
        return this.createMySQLRepository()
    }
  }

  /**
   * Create MySQL/Prisma repository
   */
  private static createMySQLRepository(): MySQLRepository {
    return new MySQLRepository()
  }

  /**
   * Create OneLake/Fabric repository
   */
  private static createOneLakeRepository(): OneLakeRepository {
    const server = process.env.ONELAKE_SERVER || ''
    const database = process.env.ONELAKE_DATABASE || ''
    const workspaceId = process.env.ONELAKE_WORKSPACE_ID || ''
    const lakehouseId = process.env.ONELAKE_LAKEHOUSE_ID || ''

    // Validate required configuration
    if (!server || !database || !workspaceId || !lakehouseId) {
      throw new Error(
        'OneLake configuration is incomplete. Please set ONELAKE_SERVER, ONELAKE_DATABASE, ONELAKE_WORKSPACE_ID, and ONELAKE_LAKEHOUSE_ID environment variables.'
      )
    }

    // Determine authentication type
    const clientId = process.env.AZURE_CLIENT_ID
    const clientSecret = process.env.AZURE_CLIENT_SECRET
    const tenantId = process.env.AZURE_TENANT_ID

    const config: any = {
      server,
      database,
      workspaceId,
      lakehouseId,
    }

    // Use Service Principal if credentials are provided
    if (clientId && clientSecret && tenantId) {
      config.authentication = {
        type: 'service-principal',
        clientId,
        clientSecret,
        tenantId,
      }
      console.log('✅ Using Service Principal authentication for OneLake')
    } else {
      config.authentication = {
        type: 'default',
      }
      console.log('✅ Using Default Azure Credential for OneLake')
    }

    return new OneLakeRepository(config)
  }

  /**
   * Create Azure Function repository
   */
  private static createAzureFunctionRepository(): AzureFunctionRepository {
    const functionUrl = process.env.AZURE_FUNCTION_URL || ''
    const functionKey = process.env.AZURE_FUNCTION_KEY || ''

    // Validate required configuration
    if (!functionUrl || !functionKey) {
      throw new Error(
        'Azure Function configuration is incomplete. Please set AZURE_FUNCTION_URL and AZURE_FUNCTION_KEY environment variables.'
      )
    }

    console.log('✅ Using Azure Function Proxy for OneLake')

    return new AzureFunctionRepository({
      functionUrl,
      functionKey,
      defaultTimeout: 30000
    })
  }

  /**
   * Create Local Storage repository (JSON files)
   */
  private static createLocalStorageRepository(): LocalStorageRepository {
    const dataDir = process.env.LOCAL_STORAGE_DIR || undefined

    console.log('✅ Using Local Storage (JSON files) for development')
    if (dataDir) {
      console.log(`📁 Data directory: ${dataDir}`)
    } else {
      console.log('📁 Data directory: .local-storage (default)')
    }

    return new LocalStorageRepository({
      dataDir
    })
  }

  /**
   * Reset instance (useful for testing or switching databases at runtime)
   */
  static resetInstance(): void {
    this.instance = null
  }

  /**
   * Set custom database instance (useful for testing with mocks)
   */
  static setInstance(repository: IDatabaseRepository): void {
    this.instance = repository
  }

  /**
   * Get current database type
   */
  static getCurrentDatabaseType(): DatabaseType {
    return (process.env.DB_TYPE || 'mysql').toLowerCase() as DatabaseType
  }
}

/**
 * Convenience function to get database instance
 * Use this in your API routes and services
 */
export function getDatabase(): IDatabaseRepository {
  return DatabaseFactory.getInstance()
}

/**
 * Type guard to check if database is MySQL
 */
export function isMySQLDatabase(db: IDatabaseRepository): db is MySQLRepository {
  return db instanceof MySQLRepository
}

/**
 * Type guard to check if database is OneLake
 */
export function isOneLakeDatabase(db: IDatabaseRepository): db is OneLakeRepository {
  return db instanceof OneLakeRepository
}

/**
 * Type guard to check if database is Azure Function
 */
export function isAzureFunctionDatabase(db: IDatabaseRepository): db is AzureFunctionRepository {
  return db instanceof AzureFunctionRepository
}

/**
 * Type guard to check if database is Local Storage
 */
export function isLocalStorageDatabase(db: IDatabaseRepository): db is LocalStorageRepository {
  return db instanceof LocalStorageRepository
}
