// app/api/kpi/[id]/submit/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-server'
import { DatabaseService } from '@/lib/db'

const db = new DatabaseService()

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/kpi/[id]/submit
 * Submit KPI for approval (DRAFT/REJECTED → PENDING_LM)
 *
 * Workflow:
 * 1. STAFF submits → PENDING_LM (awaiting Line Manager N+1 approval)
 * 2. Line Manager approves → PENDING_HOD (awaiting Manager N+2 approval)
 * 3. Manager approves → APPROVED → LOCKED_GOALS
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getAuthenticatedUser(request)
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

    // Get user's Line Manager (N+1)
    const kpiOwner = await db.getUserById(kpi.userId)
    if (!kpiOwner) {
      return NextResponse.json(
        { error: 'KPI owner not found' },
        { status: 404 }
      )
    }

    if (!kpiOwner.managerId) {
      return NextResponse.json(
        { error: 'No Line Manager assigned. Please contact HR to set up reporting structure.' },
        { status: 400 }
      )
    }

    // Get Line Manager details
    const lineManager = await db.getUserById(kpiOwner.managerId)
    if (!lineManager) {
      return NextResponse.json(
        { error: 'Line Manager not found in database' },
        { status: 404 }
      )
    }

    // Update KPI status to PENDING_LM (Pending Line Manager approval)
    const updated = await db.updateKpiDefinition(id, {
      status: 'PENDING_LM',
      submittedAt: new Date(),
      updatedAt: new Date()
    })

    // Create approval record for Level 1 (Line Manager N+1)
    const approval = await db.createApproval({
      kpiDefinitionId: id,
      approverId: lineManager.id,
      level: 1,
      status: 'PENDING',
      requestedBy: user.id,
      createdAt: new Date()
    })

    console.log(`[SUBMIT] KPI ${id} submitted by ${user.email} → Line Manager ${lineManager.email}`)

    return NextResponse.json({
      success: true,
      data: updated,
      message: `KPI submitted for Line Manager (${lineManager.name}) approval`,
      approval: {
        id: approval.id,
        level: 1,
        approverId: lineManager.id,
        approverName: lineManager.name
      }
    })

  } catch (error: any) {
    console.error('POST /api/kpis/[id]/submit error:', error)
    return NextResponse.json(
      { error: 'Failed to submit KPI', details: error.message },
      { status: 500 }
    )
  }
}