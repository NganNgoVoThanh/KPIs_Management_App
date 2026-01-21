import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-server'
import { getDatabase } from '@/lib/repositories/DatabaseFactory'

export const dynamic = 'force-dynamic'

// POST - Resolve a change request (mark as completed after user makes changes)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Auth required' }, { status: 401 })
    }

    const changeRequestId = params.id
    const body = await request.json()
    const { comment } = body

    const db = getDatabase()

    // Get the change request
    const changeRequest = await db.getChangeRequestById(changeRequestId)
    if (!changeRequest) {
      return NextResponse.json({ error: 'Change request not found' }, { status: 404 })
    }

    // Get the KPI
    const kpi = await db.getKpiDefinitionById(changeRequest.kpiDefinitionId)
    if (!kpi) {
      return NextResponse.json({ error: 'KPI not found' }, { status: 404 })
    }

    // Only the KPI owner can resolve the change request
    if (kpi.userId !== user.id) {
      return NextResponse.json({
        error: 'Only the KPI owner can resolve this change request'
      }, { status: 403 })
    }

    // Check if already resolved
    if (changeRequest.status !== 'PENDING') {
      return NextResponse.json({
        error: 'This change request has already been resolved'
      }, { status: 400 })
    }

    console.log('[CHANGE-REQUEST-RESOLVE] Resolving change request:', {
      id: changeRequestId,
      kpiId: kpi.id,
      kpiTitle: kpi.title,
      resolvedBy: user.email,
      comment
    })

    // Update change request status to COMPLETED
    await db.updateChangeRequest(changeRequestId, {
      status: 'COMPLETED',
      resolvedAt: new Date(),
      resolvedBy: user.id,
      resolutionComment: comment || 'Changes have been made as requested'
    })

    // Update KPI status back to APPROVED (assuming user made the changes)
    await db.updateKpiDefinition(kpi.id, {
      status: 'APPROVED'
    })

    console.log('[CHANGE-REQUEST-RESOLVE] Change request resolved and KPI status updated to APPROVED')

    // Notify the requester (ADMIN) that the change has been completed
    await db.createNotification({
      userId: changeRequest.requesterId,
      type: 'CHANGE_REQUEST_COMPLETED',
      title: 'Change Request Completed',
      message: `${user.name} has completed the requested changes for KPI: "${kpi.title}"${comment ? `. Comment: ${comment}` : ''}`,
      priority: 'NORMAL',
      status: 'UNREAD',
      actionRequired: false,
      actionUrl: `/kpis/${kpi.id}`,
      createdAt: new Date()
    })

    console.log('[CHANGE-REQUEST-RESOLVE] Notification sent to requester')

    return NextResponse.json({
      success: true,
      message: 'Change request marked as completed'
    })

  } catch (error: any) {
    console.error('[CHANGE-REQUEST-RESOLVE-ERROR]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
