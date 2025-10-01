// app/api/kpis/[id]/submit/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-service'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/kpis/[id]/submit
 * Submit KPI for approval
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
    const kpi = await db.getKpiDefinitionById(id)

    if (!kpi) {
      return NextResponse.json(
        { error: 'KPI not found' },
        { status: 404 }
      )
    }

    // Authorization: only owner can submit
    if (kpi.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to submit this KPI' },
        { status: 403 }
      )
    }

    // Can only submit from DRAFT or REJECTED status
    if (!['DRAFT', 'REJECTED'].includes(kpi.status)) {
      return NextResponse.json(
        { error: `Cannot submit KPI in ${kpi.status} status` },
        { status: 400 }
      )
    }

    // Get approval hierarchy
    const hierarchy = await db.getActiveApprovalHierarchy(user.id)
    if (!hierarchy || !hierarchy.level1ApproverId) {
      return NextResponse.json(
        { error: 'No approval hierarchy configured for this user' },
        { status: 400 }
      )
    }

    // Update KPI status to PENDING_LM (Pending Line Manager)
    const updated = await db.updateKpiDefinition(id, {
      status: 'PENDING_LM',
      submittedAt: new Date(),
      updatedAt: new Date()
    })

    // Create approval record for Level 1 (Line Manager)
    await db.createApproval({
      entityId: id,
      entityType: 'KPI',
      level: 1,
      approverId: hierarchy.level1ApproverId,
      status: 'PENDING',
      createdAt: new Date()
    })

    // Create notification for Line Manager
    await db.createNotification({
      userId: hierarchy.level1ApproverId,
      type: 'APPROVAL_REQUIRED',
      title: 'KPI Approval Required',
      message: `${user.name} has submitted a KPI "${kpi.title}" for your approval.`,
      priority: 'HIGH',
      status: 'UNREAD',
      actionRequired: true,
      actionUrl: `/approvals/${id}`,
      metadata: {
        kpiId: id,
        kpiTitle: kpi.title,
        submittedBy: user.id,
        submittedByName: user.name
      },
      createdAt: new Date()
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'KPI submitted for approval successfully'
    })

  } catch (error: any) {
    console.error('POST /api/kpis/[id]/submit error:', error)
    return NextResponse.json(
      { error: 'Failed to submit KPI', details: error.message },
      { status: 500 }
    )
  }
}