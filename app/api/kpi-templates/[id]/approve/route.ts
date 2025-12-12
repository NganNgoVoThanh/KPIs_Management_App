// app/api/kpi-templates/[id]/approve/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/repositories/DatabaseFactory'
import { getAuthenticatedUser } from '@/lib/auth-server'

/**
 * POST /api/kpi-templates/[id]/approve
 * Approve template
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
    const { comment } = body

    const db = getDatabase()
    const template = await db.approveTemplate(params.id, user.id, comment)

    // TODO: Send notification to template creator
    // await sendNotification({
    //   userId: template.createdBy,
    //   type: 'TEMPLATE_APPROVED',
    //   message: `Your template "${template.name}" has been approved`
    // })

    return NextResponse.json({
      success: true,
      data: template,
      message: 'Template approved successfully'
    })
  } catch (error: any) {
    console.error('Error approving template:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to approve template'
    }, { status: 500 })
  }
}
