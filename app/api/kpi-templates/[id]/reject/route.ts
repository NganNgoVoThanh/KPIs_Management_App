// app/api/kpi-templates/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/repositories/DatabaseFactory'
import { getAuthenticatedUser } from '@/lib/auth-server'

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic'


/**
 * POST /api/kpi-templates/[id]/reject
 * Reject template with reason
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Admin access required'
      }, { status: 403 })
    }

    const body = await request.json()
    const { reason } = body

    if (!reason || !reason.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Rejection reason is required'
      }, { status: 400 })
    }

    const db = getDatabase()
    const template = await db.rejectTemplate(params.id, user.id, reason)

    // TODO: Send notification to template creator
    // await sendNotification({
    //   userId: template.createdBy,
    //   type: 'TEMPLATE_REJECTED',
    //   message: `Your template "${template.name}" has been rejected`,
    //   reason: reason
    // })

    return NextResponse.json({
      success: true,
      data: template,
      message: 'Template rejected'
    })
  } catch (error: any) {
    console.error('Error rejecting template:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to reject template'
    }, { status: 500 })
  }
}
