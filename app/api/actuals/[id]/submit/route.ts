// app/api/actuals/[id]/submit/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-service'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/actuals/[id]/submit
 * Submit actual results for approval
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
    
    // Get actual
    const actuals = await db.getKpiActuals({ kpiDefinitionId: id })
    if (actuals.length === 0) {
      return NextResponse.json(
        { error: 'Actual not found' },
        { status: 404 }
      )
    }

    const actual = actuals[0]
    
    // Get associated KPI
    const kpi = await db.getKpiDefinitionById(actual.kpiDefinitionId)
    if (!kpi) {
      return NextResponse.json(
        { error: 'Associated KPI not found' },
        { status: 404 }
      )
    }

    // Authorization: only KPI owner can submit
    if (kpi.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to submit this actual' },
        { status: 403 }
      )
    }

    // Can only submit from DRAFT or REJECTED status
    if (!['DRAFT', 'REJECTED'].includes(actual.status)) {
      return NextResponse.json(
        { error: `Cannot submit actual in ${actual.status} status` },
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

    // Update actual status to PENDING_LM
    const updated = await db.updateKpiActual(actual.id, {
      status: 'PENDING_LM',
      submittedAt: new Date(),
      updatedAt: new Date()
    })

    // Create approval record for Level 1 (Line Manager)
    await db.createApproval({
      entityId: actual.id,
      entityType: 'ACTUAL',
      level: 1,
      approverId: hierarchy.level1ApproverId,
      status: 'PENDING',
      createdAt: new Date()
    })

    // Update KPI status if needed
    if (kpi.status === 'APPROVED') {
      await db.updateKpiDefinition(kpi.id, {
        status: 'LOCKED_GOALS'
      })
    }

    // Create notification for Line Manager
    await db.createNotification({
      userId: hierarchy.level1ApproverId,
      type: 'ACTUAL_APPROVAL_REQUIRED',
      title: 'Actual Results Approval Required',
      message: `${user.name} has submitted actual results for KPI "${kpi.title}".`,
      priority: 'HIGH',
      status: 'UNREAD',
      actionRequired: true,
      actionUrl: `/evaluation/${actual.id}`,
      metadata: {
        actualId: actual.id,
        kpiId: kpi.id,
        kpiTitle: kpi.title,
        submittedBy: user.id,
        submittedByName: user.name,
        actualValue: actual.actualValue,
        score: actual.score
      },
      createdAt: new Date()
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Actual results submitted for approval successfully'
    })

  } catch (error: any) {
    console.error('POST /api/actuals/[id]/submit error:', error)
    return NextResponse.json(
      { error: 'Failed to submit actual', details: error.message },
      { status: 500 }
    )
  }
}