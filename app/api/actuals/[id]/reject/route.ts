// app/api/actuals/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-service'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/actuals/[id]/reject
 * Reject actual and send back to owner
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = authService.getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { reason } = body

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      )
    }

    const actuals = await db.getKpiActuals({ kpiDefinitionId: id })
    if (actuals.length === 0) {
      return NextResponse.json(
        { error: 'Actual not found' },
        { status: 404 }
      )
    }

    const actual = actuals[0]
    const kpi = await db.getKpiDefinitionById(actual.kpiDefinitionId)
    if (!kpi) {
      return NextResponse.json(
        { error: 'Associated KPI not found' },
        { status: 404 }
      )
    }

    // Get pending approval for this user
    const approvals = await db.getApprovals({ 
      entityId: actual.id, 
      entityType: 'ACTUAL' 
    })
    
    const pendingApproval = approvals.find(
      a => a.approverId === user.id && a.status === 'PENDING'
    )

    if (!pendingApproval) {
      return NextResponse.json(
        { error: 'No pending approval found for this user' },
        { status: 403 }
      )
    }

    const currentLevel = pendingApproval.level

    // Update approval record as rejected
    await db.updateApproval(pendingApproval.id, {
      status: 'REJECTED',
      comment: reason,
      decidedAt: new Date()
    })

    // Cancel all other pending approvals
    const otherPendingApprovals = approvals.filter(
      a => a.status === 'PENDING' && a.id !== pendingApproval.id
    )
    for (const approval of otherPendingApprovals) {
      await db.updateApproval(approval.id, {
        status: 'CANCELLED'
      })
    }

    // Update actual status to REJECTED
    await db.updateKpiActual(actual.id, {
      status: 'REJECTED',
      rejectedAt: new Date(),
      rejectedBy: user.id,
      rejectionReason: reason,
      updatedAt: new Date()
    })

    // Notify KPI owner
    await db.createNotification({
      userId: kpi.userId,
      type: 'ACTUAL_REJECTED',
      title: 'Actual Results Rejected',
      message: `Your actual results for KPI "${kpi.title}" have been rejected at Level ${currentLevel} by ${user.name}.`,
      priority: 'HIGH',
      status: 'UNREAD',
      actionRequired: true,
      actionUrl: `/evaluation/${actual.id}`,
      metadata: {
        actualId: actual.id,
        kpiId: kpi.id,
        kpiTitle: kpi.title,
        rejectedBy: user.id,
        rejectedByName: user.name,
        level: currentLevel,
        reason: reason
      },
      createdAt: new Date()
    })

    return NextResponse.json({
      success: true,
      data: {
        actualId: actual.id,
        rejectedAt: currentLevel,
        rejectedBy: user.name,
        reason
      },
      message: `Actual results rejected at Level ${currentLevel}. Owner has been notified.`
    })

  } catch (error: any) {
    console.error('POST /api/actuals/[id]/reject error:', error)
    return NextResponse.json(
      { error: 'Failed to reject actual', details: error.message },
      { status: 500 }
    )
  }
}