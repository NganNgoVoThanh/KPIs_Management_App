// app/api/kpi-library/statistics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/repositories/DatabaseFactory'
import { getAuthenticatedUser } from '@/lib/auth-server'

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic'


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

    // Get stats from multiple sources
    // 1. Upload Stats (Legacy)
    let uploadStats = { activeEntries: 0, pendingUploads: 0 }
    try {
      if (typeof db.getKpiLibraryUploadStatistics === 'function') {
        uploadStats = await db.getKpiLibraryUploadStatistics()
      }
    } catch (e) {
      console.warn('getKpiLibraryUploadStatistics not implemented', e)
    }

    // 2. Kpi Template Stats
    const templates = await db.getKpiTemplates({})
    const activeTemplates = templates.filter((t: any) => t.status === 'ACTIVE' || t.status === 'APPROVED').length
    const pendingTemplates = templates.filter((t: any) => t.status === 'DRAFT' || t.status === 'PENDING').length

    // Combine or prefer Template stats for the "KPI Templates" card
    const stats = {
      activeEntries: activeTemplates, // Use direct template count
      pendingUploads: pendingTemplates // Use direct template count
    }

    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error: any) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
