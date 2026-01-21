// app/api/kpi-templates/[id]/submit/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/repositories/DatabaseFactory'
import { getAuthenticatedUser } from '@/lib/auth-server'

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic'


/**
 * POST /api/kpi-templates/[id]/submit
 * Submit template for review
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const db = getDatabase()
    const template = await db.submitForReview(params.id, user.id)

    // TODO: Send notification to approvers
    // await sendNotificationToApprovers({
    //   type: 'TEMPLATE_SUBMITTED',
    //   templateId: params.id,
    //   templateName: template.name
    // })

    return NextResponse.json({
      success: true,
      data: template,
      message: 'Template submitted for review successfully'
    })
  } catch (error: any) {
    console.error('Error submitting template:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to submit template'
    }, { status: 500 })
  }
}
