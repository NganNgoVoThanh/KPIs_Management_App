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
 * Workflow (3-4 levels as per flowchart):
 * DRAFT → Submit → WAITING_LINE_MGR (Level 1)
 * Level 1 (Line Manager N+1): WAITING_LINE_MGR → WAITING_HOD (Level 2)
 * Level 2 (Head of Dept): WAITING_HOD → WAITING_ADMIN (Level 3)
 * Level 3 (Admin Check): WAITING_ADMIN → ACTIVE (Ready for tracking)
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
      // Line Manager (N+1) approval → Move to Head of Department (Level 2)
      newStatus = 'WAITING_HOD'

      // Get Head of Department (Look for user with role HEAD_OF_DEPT or MANAGER in same department)
      // FIXED: Prevent duplicate approver (same person at L1 and L2)
      const kpiOwnerOrgUnit = await db.getOrgUnitById(kpiOwner.orgUnitId)
      if (kpiOwnerOrgUnit) {
        // Find HOD in the department
        const allUsers = await db.getUsers({
          department: kpiOwner.department,
          role: ['MANAGER', 'HEAD_OF_DEPT'],
          status: 'ACTIVE'
        })

        // CRITICAL: Exclude current approver to prevent duplicate
        const hod = allUsers.find(u => u.id !== user.id)

        if (hod) {
          // Double-check: Ensure HOD is not the same as L1 approver
          if (hod.id === user.id) {
            console.warn(`[APPROVE] HOD same as Line Manager (${user.email}), skipping to Admin`)
            newStatus = 'WAITING_ADMIN'
          } else {
            nextApproverId = hod.id
          }
        } else {
          // No eligible HOD found, skip to admin
          console.warn(`[APPROVE] No eligible HOD in ${kpiOwner.department}, skipping to Admin`)
          newStatus = 'WAITING_ADMIN'
        }
      }

    } else if (currentLevel === 2) {
      // Head of Department approval → Move to Admin (Level 3)
      newStatus = 'WAITING_ADMIN'

      // Get admin users (all active admins)
      const admins = await db.getUsers({ role: 'ADMIN', status: 'ACTIVE' })

      if (!admins || admins.length === 0) {
        // CRITICAL: No admin available - should NOT auto-approve!
        console.error(`[APPROVE] No active ADMIN users found. Cannot complete approval.`)
        return NextResponse.json({
          error: 'No active admin users found. Cannot complete approval workflow. Please contact system administrator.',
          code: 'NO_ADMIN_AVAILABLE'
        }, { status: 500 })
      }

      // Load balancing: Select admin with least pending approvals
      const adminLoads = await Promise.all(
        admins.map(async admin => {
          const pending = await db.getApprovals({
            approverId: admin.id,
            status: 'PENDING'
          })
          return {
            id: admin.id,
            pendingCount: pending.length
          }
        })
      )

      const selectedAdmin = adminLoads.reduce((prev, current) =>
        prev.pendingCount < current.pendingCount ? prev : current
      )

      nextApproverId = selectedAdmin.id

    } else if (currentLevel === 3) {
      // Admin approval → KPI becomes ACTIVE for tracking
      newStatus = 'ACTIVE'

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
    } else if (currentLevel === 3) {
      // Admin approval = Final approval
      updateData.approvedAt = new Date()
    }

    await db.updateKpiDefinition(id, updateData)

    // Create next level approval if needed
    if (nextApproverId) {
      const nextLevel = currentLevel + 1
      const nextApprover = await db.getUserById(nextApproverId)

      await db.createApproval({
        kpiDefinitionId: id,
        approverId: nextApproverId,
        level: nextLevel,
        status: 'PENDING',
        requestedBy: user.id,
        createdAt: new Date()
      })

      console.log(`[APPROVE L${currentLevel}] KPI ${id} approved by ${user.email} → ${nextApprover?.email} (Level ${nextLevel})`)
    } else if (currentLevel === 3 || newStatus === 'ACTIVE') {
      console.log(`[APPROVE L${currentLevel}] KPI ${id} fully approved by ${user.email} → Status: ACTIVE`)
    }

    return NextResponse.json({
      success: true,
      data: {
        kpiId: id,
        previousStatus: kpi.status,
        newStatus: newStatus,
        currentLevel,
        nextLevel: nextApproverId ? currentLevel + 1 : null,
        fullyApproved: currentLevel === 3 || newStatus === 'ACTIVE'
      },
      message: newStatus === 'ACTIVE'
        ? 'KPI fully approved and activated for tracking'
        : `Level ${currentLevel} approved, sent to Level ${currentLevel + 1}`
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