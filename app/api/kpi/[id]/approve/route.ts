// app/api/kpi/[id]/approve/route.ts - 2-level approval workflow
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
 * POST /api/kpi/[id]/approve
 * Approve KPI at current level
 *
 * Workflow:
 * Level 1 (Line Manager N+1): PENDING_LM → PENDING_HOD
 * Level 2 (Manager N+2): PENDING_HOD → APPROVED → LOCKED_GOALS
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
    const body = await request.json()
    const { comment } = body

    const kpi = await db.getKpiDefinitionById(id)
    if (!kpi) {
      return NextResponse.json(
        { error: 'KPI not found' },
        { status: 404 }
      )
    }

    // Get KPI owner and their managers
    const kpiOwner = await db.getUserById(kpi.userId)
    if (!kpiOwner) {
      return NextResponse.json(
        { error: 'KPI owner not found' },
        { status: 404 }
      )
    }

    // Get pending approval for this KPI and user
    const approvals = await db.getApprovals({ kpiDefinitionId: id, status: 'PENDING' })
    const pendingApproval = approvals.find(a => a.approverId === user.id)

    if (!pendingApproval) {
      return NextResponse.json(
        { error: 'No pending approval found for this user' },
        { status: 403 }
      )
    }

    const currentLevel = pendingApproval.level
    let newStatus: string
    let nextApproverId: string | null = null

    // Determine workflow based on current level
    if (currentLevel === 1) {
      // Line Manager (N+1) approval → Move to Manager (N+2)
      newStatus = 'PENDING_HOD'

      // Get Line Manager's manager (N+2)
      const lineManager = await db.getUserById(kpiOwner.managerId!)
      if (lineManager && lineManager.managerId) {
        nextApproverId = lineManager.managerId
      } else {
        // No N+2 manager, skip to approved
        newStatus = 'APPROVED'
      }

    } else if (currentLevel === 2) {
      // Manager (N+2) approval → Fully approved → Lock goals
      newStatus = 'APPROVED'
    } else {
      return NextResponse.json(
        { error: 'Invalid approval level' },
        { status: 400 }
      )
    }

    // Update approval record
    await db.updateApproval(pendingApproval.id, {
      status: 'APPROVED',
      comment: comment || null,
      decidedAt: new Date()
    })

    // Update KPI status
    const updateData: any = {
      status: newStatus,
      updatedAt: new Date()
    }

    if (currentLevel === 1) {
      updateData.approvedByLevel1 = user.id
      updateData.approvedAtLevel1 = new Date()
    } else if (currentLevel === 2) {
      updateData.approvedByLevel2 = user.id
      updateData.approvedAtLevel2 = new Date()
      updateData.approvedAt = new Date()
    }

    await db.updateKpiDefinition(id, updateData)

    // Create next level approval if needed
    if (nextApproverId && currentLevel === 1) {
      const manager = await db.getUserById(nextApproverId)

      await db.createApproval({
        kpiDefinitionId: id,
        approverId: nextApproverId,
        level: 2,
        status: 'PENDING',
        requestedBy: user.id,
        createdAt: new Date()
      })

      console.log(`[APPROVE L1] KPI ${id} approved by ${user.email} → Manager ${manager?.email}`)
    } else if (currentLevel === 2) {
      console.log(`[APPROVE L2] KPI ${id} fully approved by ${user.email}`)

      // Auto-lock goals after full approval
      await db.updateKpiDefinition(id, {
        status: 'LOCKED_GOALS'
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        kpiId: id,
        previousStatus: kpi.status,
        newStatus: newStatus === 'APPROVED' && currentLevel === 2 ? 'LOCKED_GOALS' : newStatus,
        currentLevel,
        nextLevel: nextApproverId ? 2 : null,
        fullyApproved: currentLevel === 2
      },
      message: currentLevel === 2
        ? 'KPI fully approved and goals locked'
        : `Level ${currentLevel} approved, sent to Level 2`
    })

  } catch (error: any) {
    console.error('POST /api/kpis/[id]/approve error:', error)
    return NextResponse.json(
      { error: 'Failed to approve KPI', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/kpi/[id]/approve (reject action)
 * Reject KPI at current level (comment required)
 */
export async function PATCH(
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
    const body = await request.json()
    const { comment } = body

    // Rejection comment is REQUIRED
    if (!comment || comment.trim().length === 0) {
      return NextResponse.json(
        { error: 'Rejection comment is required' },
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
    const approvals = await db.getApprovals({ kpiDefinitionId: id, status: 'PENDING' })
    const pendingApproval = approvals.find(a => a.approverId === user.id)

    if (!pendingApproval) {
      return NextResponse.json(
        { error: 'No pending approval found for this user' },
        { status: 403 }
      )
    }

    const currentLevel = pendingApproval.level

    // Update approval record to REJECTED
    await db.updateApproval(pendingApproval.id, {
      status: 'REJECTED',
      comment,
      decidedAt: new Date()
    })

    // Cancel all other pending approvals
    const otherPendingApprovals = approvals.filter(
      a => a.id !== pendingApproval.id && a.status === 'PENDING'
    )
    for (const approval of otherPendingApprovals) {
      await db.updateApproval(approval.id, {
        status: 'CANCELLED',
        decidedAt: new Date()
      })
    }

    // Update KPI status to REJECTED
    await db.updateKpiDefinition(id, {
      status: 'REJECTED',
      rejectedBy: user.id,
      rejectedAt: new Date(),
      rejectionReason: comment,
      updatedAt: new Date()
    })

    console.log(`[REJECT] KPI ${id} rejected by ${user.email} at Level ${currentLevel}`)

    return NextResponse.json({
      success: true,
      data: {
        kpiId: id,
        previousStatus: kpi.status,
        newStatus: 'REJECTED',
        rejectedAtLevel: currentLevel,
        reason: comment
      },
      message: `KPI rejected at Level ${currentLevel}. Staff can revise and resubmit.`
    })

  } catch (error: any) {
    console.error('PATCH /api/kpi/[id]/approve error:', error)
    return NextResponse.json(
      { error: 'Failed to reject KPI', details: error.message },
      { status: 500 }
    )
  }
}