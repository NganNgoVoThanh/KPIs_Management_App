// app/api/kpi-resources/statistics/route.ts
import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/repositories/DatabaseFactory';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/kpi-resources/statistics
 * Get KPI resources statistics
 */
export async function GET() {
  try {
    const db = getDatabase();
    const statistics = await db.getKpiResourceStatistics();

    return NextResponse.json({
      success: true,
      data: statistics
    });

  } catch (error: any) {
    console.error('Failed to fetch statistics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statistics', details: error.message },
      { status: 500 }
    );
  }
}
