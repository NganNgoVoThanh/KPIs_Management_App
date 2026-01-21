// app/api/kpi-library/uploads/[id]/approve/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/repositories/DatabaseFactory'
import { getAuthenticatedUser } from '@/lib/auth-server'

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic'


export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 403 })
    }

    const body = await request.json()
    const { comment } = body

    const db = getDatabase()
    const upload = await db.approveKpiLibraryUpload(
      params.id,
      user.id,
      comment
    )

    return NextResponse.json({
      success: true,
      data: upload,
      message: `Approved. Processed ${upload.processedCount} entries.`
    })
  } catch (error: any) {
    console.error('Error approving:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
