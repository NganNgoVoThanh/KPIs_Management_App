// app/api/kpis/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-service'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/kpis/[id]/reject
 * Reject KPI and send back to owner
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

    const kpi = await db.getKpiDefinitionById(id)
    if (!kpi) {
      return NextResponse.json(
        { error: 'KPI not found' },
        { status: 404 }
      )
    }

    // Get pending approval for this user
    const approvals = await db.getApprovals({ entityId: id, entityType: 'KPI' })
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

    // Cancel all other pending approvals for this KPI
    const otherPendingApprovals = approvals.filter(
      a => a.status === 'PENDING' && a.id !== pendingApproval.id
    )
    for (const approval of otherPendingApprovals) {
      await db.updateApproval(approval.id, {
        status: 'CANCELLED'
      })
    }

    // Update KPI status to REJECTED
    await db.updateKpiDefinition(id, {
      status: 'REJECTED',
      rejectedAt: new Date(),
      rejectedBy: user.id,
      rejectionReason: reason,
      updatedAt: new Date()
    })

    // Notify KPI owner
    await db.createNotification({
      userId: kpi.userId,
      type: 'KPI_REJECTED',
      title: 'KPI Rejected',
      message: `Your KPI "${kpi.title}" has been rejected at Level ${currentLevel} by ${user.name}.`,
      priority: 'HIGH',
      status: 'UNREAD',
      actionRequired: true,
      actionUrl: `/kpis/${id}`,
      metadata: {
        kpiId: id,
        kpiTitle: kpi.title,
        rejectedBy: user.id,
        rejectedByName: user.name,
        level: currentLevel,
        reason: reason
      },
      createdAt: new Date()
    })

    // Notify all Admins about KPI rejection
    const kpiOwner = await db.getUserById(kpi.userId)
    const admins = await db.getUsers({ role: 'ADMIN', status: 'ACTIVE' })
    for (const admin of admins) {
      await db.createNotification({
        userId: admin.id,
        type: 'SYSTEM',
        title: 'KPI Rejected',
        message: `KPI "${kpi.title}" by ${kpiOwner?.name || 'Unknown'} was rejected at Level ${currentLevel} by ${user.name}. Reason: ${reason}`,
        priority: 'LOW',
        status: 'UNREAD',
        actionRequired: false,
        actionUrl: `/kpis/${id}`,
        metadata: {
          kpiId: id,
          kpiTitle: kpi.title,
          kpiOwnerId: kpi.userId,
          kpiOwnerName: kpiOwner?.name,
          rejectedBy: user.id,
          rejectedByName: user.name,
          level: currentLevel,
          reason: reason
        },
        createdAt: new Date()
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        kpiId: id,
        rejectedAt: currentLevel,
        rejectedBy: user.name,
        reason
      },
      message: `KPI rejected at Level ${currentLevel}. Owner has been notified.`
    })

  } catch (error: any) {
    console.error('POST /api/kpis/[id]/reject error:', error)
    return NextResponse.json(
      { error: 'Failed to reject KPI', details: error.message },
      { status: 500 }
    )
  }
}