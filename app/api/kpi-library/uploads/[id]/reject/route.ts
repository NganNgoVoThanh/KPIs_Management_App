// app/api/kpi-library/uploads/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/repositories/DatabaseFactory'
import { getAuthenticatedUser } from '@/lib/auth-server'

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
    const { reason } = body

    if (!reason?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Rejection reason required'
      }, { status: 400 })
    }

    const db = getDatabase()
    const upload = await db.rejectKpiLibraryUpload(
      params.id,
      user.id,
      reason
    )

    return NextResponse.json({
      success: true,
      data: upload,
      message: 'Upload rejected'
    })
  } catch (error: any) {
    console.error('Error rejecting:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
