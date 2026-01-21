// app/api/kpi-resources/init/route.ts
import { NextResponse } from 'next/server';
import { onelakeDbService } from '@/lib/onelake-db-service';
import { onelakeStorageService } from '@/lib/onelake-storage-service';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * POST /api/kpi-resources/init
 * Initialize OneLake resources (create table, test connection)
 */
export async function POST() {
  try {
    const results: any = {
      storage: { success: false, message: '' },
      database: { success: false, message: '' },
      table: { success: false, message: '' }
    };

    // Test storage connection
    results.storage = await onelakeStorageService.testConnection();

    // Test database connection
    results.database = await onelakeDbService.testConnection();

    // Initialize table
    if (results.database.success) {
      try {
        await onelakeDbService.initializeTable();
        results.table = {
          success: true,
          message: 'Table kpi_resources initialized successfully'
        };
      } catch (error: any) {
        results.table = {
          success: false,
          message: `Failed to initialize table: ${error.message}`
        };
      }
    }

    const allSuccess = results.storage.success && results.database.success && results.table.success;

    return NextResponse.json({
      success: allSuccess,
      message: allSuccess
        ? 'OneLake initialization completed successfully'
        : 'OneLake initialization completed with errors',
      details: results
    });

  } catch (error: any) {
    console.error('OneLake initialization error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Initialization failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/kpi-resources/init
 * Get OneLake connection status
 */
export async function GET() {
  try {
    const storage = await onelakeStorageService.testConnection();
    const database = await onelakeDbService.testConnection();

    return NextResponse.json({
      success: storage.success && database.success,
      storage,
      database,
      configured: onelakeStorageService.isConfigured()
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}
