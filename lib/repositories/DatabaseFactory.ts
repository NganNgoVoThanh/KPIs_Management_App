// lib/repositories/DatabaseFactory.ts
// Database Factory - Strategy Pattern for Database Selection
// Currently simplified to support only MySQL/Prisma

import { IDatabaseRepository } from './IRepository'
import { MySQLRepository } from './MySQLRepository'

export type DatabaseType = 'mysql'

export class DatabaseFactory {
  private static instance: IDatabaseRepository | null = null

  /**
   * Get database instance (Singleton pattern)
   */
  static getInstance(): IDatabaseRepository {
    if (!this.instance) {
      this.instance = this.createDatabase()
    }
    return this.instance
  }

  /**
   * Create database instance
   * Defaults to MySQL
   */
  private static createDatabase(): IDatabaseRepository {
    // Force usage of MySQLRepository
    return this.createMySQLRepository()
  }

  /**
   * Create MySQL/Prisma repository
   */
  private static createMySQLRepository(): MySQLRepository {
    return new MySQLRepository()
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
    return 'mysql'
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
