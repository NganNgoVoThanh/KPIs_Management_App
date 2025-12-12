// app/api/kpi-resources/dashboards/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/repositories/DatabaseFactory'
import { getAuthenticatedUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filters: any = {}

    if (searchParams.get('type')) {
      filters.dashboardType = searchParams.get('type')
    }
    if (searchParams.get('department')) {
      filters.department = searchParams.get('department')
    }

    const db = getDatabase()
    const dashboards = await db.getBIDashboards(filters)

    return NextResponse.json({
      success: true,
      data: dashboards
    })
  } catch (error: any) {
    console.error('Error fetching dashboards:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
