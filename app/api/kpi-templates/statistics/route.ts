// app/api/kpi-templates/statistics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/repositories/DatabaseFactory'
import { getAuthenticatedUser } from '@/lib/auth-server'

/**
 * GET /api/kpi-templates/statistics
 * Get KPI templates statistics
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const db = getDatabase()
    const stats = await db.getTemplateStatistics()

    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error: any) {
    console.error('Error fetching statistics:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch statistics'
    }, { status: 500 })
  }
}
