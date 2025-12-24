// app/api/kpi/[id]/approve/route.ts - 2-level approval workflow
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-server'
import { DatabaseService } from '@/lib/db'

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic'


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
 * Workflow (2 levels):
 * DRAFT → Submit → WAITING_LINE_MGR (Level 1)
 * Level 1 (LINE_MANAGER): WAITING_LINE_MGR → WAITING_MANAGER (Level 2)
 * Level 2 (MANAGER): WAITING_MANAGER → APPROVED (Final)
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

    console.log(`[APPROVE] User ${user.email} (${user.role}) attempting to approve KPI ${id}`)
    console.log(`[APPROVE] Request params:`, { id, comment })

    const kpi = await db.getKpiDefinitionById(id)
    if (!kpi) {
      console.error(`[APPROVE-ERROR] KPI ${id} not found in database`)
      console.error(`[APPROVE-ERROR] This may indicate the KPI was deleted or the ID is incorrect`)
      return NextResponse.json(
        { error: 'KPI not found', details: `KPI with ID ${id} does not exist in database` },
        { status: 404 }
      )
    }

    console.log(`[APPROVE] Found KPI: ${kpi.title} (Status: ${kpi.status}, Owner: ${kpi.userId})`)
    console.log(`[APPROVE] Current KPI status before approval: ${kpi.status}`)

    // Get KPI owner and their managers
    const kpiOwner = await db.getUserById(kpi.userId)
    if (!kpiOwner) {
      return NextResponse.json(
        { error: 'KPI owner not found' },
        { status: 404 }
      )
    }

    // Get pending approval for this KPI
    const approvals = await db.getApprovals({ kpiDefinitionId: id, status: 'PENDING' })
    console.log(`[APPROVE] Found ${approvals.length} pending approvals for KPI ${id}`)

    // For ADMIN: allow proxy approval (take the first pending approval)
    // For others: find their own pending approval
    let pendingApproval
    if (user.role === 'ADMIN') {
      pendingApproval = approvals.find(a => a.status === 'PENDING')
      if (pendingApproval) {
        console.log(`[ADMIN-PROXY] Admin ${user.email} approving on behalf of ${pendingApproval.approverId}`)
      }
    } else {
      pendingApproval = approvals.find(a => a.approverId === user.id)
    }

    if (!pendingApproval) {
      console.error(`[APPROVE-ERROR] No pending approval found for user ${user.email} on KPI ${id}`)
      return NextResponse.json(
        {
          error: 'No pending approval found for this user',
          details: `You don't have a pending approval for this KPI.`
        },
        { status: 403 }
      )
    }

    // Safety check: Ensure the approval actually belongs to this KPI
    if (pendingApproval.entityType === 'KPI' && pendingApproval.entityId !== id) {
      console.error(`[APPROVE-CRITICAL] Mismatched approval found! Approval ${pendingApproval.id} is for KPI ${pendingApproval.entityId}, but request is for ${id}`)
      return NextResponse.json(
        {
          error: 'Data integrity error: Approval mismatch',
          details: `The system found an approval record that does not match the requested KPI.`
        },
        { status: 500 }
      )
    }

    console.log(`[APPROVE] Found pending approval at Level ${pendingApproval.level}`)

    const currentLevel = pendingApproval.level
    let newStatus: string
    let nextApproverId: string | null = null

    // ✅ 2-LEVEL WORKFLOW
    if (currentLevel === 1) {
      // Level 1: LINE_MANAGER approval → Move to MANAGER (Level 2 - Final)
      newStatus = 'WAITING_MANAGER'

      // Find MANAGER (hod@intersnack.com.vn or any active MANAGER)
      const managers = await db.getUsers({
        role: 'MANAGER',
        status: 'ACTIVE'
      })

      if (managers && managers.length > 0) {
        // Prefer hod@intersnack.com.vn if exists
        const hod = managers.find(m => m.email === 'hod@intersnack.com.vn')
        nextApproverId = hod ? hod.id : managers[0].id
      } else {
        return NextResponse.json({
          error: 'No active MANAGER found. Cannot proceed with approval.',
          code: 'NO_MANAGER_AVAILABLE'
        }, { status: 500 })
      }

    } else if (currentLevel === 2) {
      // Level 2: MANAGER approval → KPI fully APPROVED
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
      // MANAGER approval = Final approval
      updateData.approvedByLevel2 = user.id
      updateData.approvedAtLevel2 = new Date()
      updateData.approvedAt = new Date() // Final approval timestamp
    }

    await db.updateKpiDefinition(id, updateData)

    console.log(`[APPROVE] Successfully updated KPI ${id} status to: ${newStatus}`)
    console.log(`[APPROVE] Update data applied:`, updateData)

    // Verify the update was successful
    const updatedKpi = await db.getKpiDefinitionById(id)
    if (updatedKpi) {
      console.log(`[APPROVE] Verified KPI status after update: ${updatedKpi.status}`)
    } else {
      console.error(`[APPROVE-WARNING] Could not verify KPI update - KPI not found after update`)
    }

    // Create next level approval FIRST (before notifications)
    if (nextApproverId) {
      const nextLevel = currentLevel + 1
      const nextApprover = await db.getUserById(nextApproverId)

      console.log(`[APPROVE-L2] Creating Level 2 approval:`, {
        kpiId: id,
        kpiTitle: kpi.title,
        nextApproverId,
        nextApproverEmail: nextApprover?.email,
        nextApproverName: nextApprover?.name,
        nextLevel,
        currentStatus: newStatus
      })

      const level2Approval = await db.createApproval({
        entityId: id,
        entityType: 'KPI',
        kpiDefinitionId: id,
        approverId: nextApproverId,
        level: nextLevel,
        status: 'PENDING',
        createdAt: new Date()
      })

      console.log(`[APPROVE-L2] Level 2 approval created successfully:`, {
        approvalId: level2Approval.id,
        approverId: level2Approval.approverId,
        level: level2Approval.level,
        status: level2Approval.status,
        entityId: level2Approval.entityId
      })

      // Verify the approval was created
      const verifyApproval = await db.getApprovalById(level2Approval.id)
      if (verifyApproval) {
        console.log(`[APPROVE-L2] Verified Level 2 approval exists in DB:`, {
          id: verifyApproval.id,
          approverId: verifyApproval.approverId,
          status: verifyApproval.status,
          level: verifyApproval.level
        })
      } else {
        console.error(`[APPROVE-L2-ERROR] Failed to verify Level 2 approval creation!`)
      }

      // Notify next approver (MANAGER) that Level 2 approval is needed
      if (nextApprover) {
        await db.createNotification({
          userId: nextApprover.id,
          title: 'New KPI Ready for Your Approval (Level 2)',
          message: `KPI "${kpi.title}" from ${kpiOwner.name} has been approved at Level 1 and is ready for your final review.`,
          type: 'APPROVAL_REQUIRED',
          priority: 'HIGH',
          status: 'UNREAD',
          actionRequired: true,
          actionUrl: '/approvals',
          createdAt: new Date()
        })

        console.log(`[NOTIFICATION] Created Level 2 approval request notification for MANAGER ${nextApprover.email}`)
      }

      console.log(`[APPROVE L${currentLevel}] KPI ${id} approved by ${user.email} → ${nextApprover?.email} (Level ${nextLevel})`)
    } else if (currentLevel === 2 || newStatus === 'APPROVED') {
      console.log(`[APPROVE L${currentLevel}] KPI ${id} fully approved by ${user.email} → Status: APPROVED`)
    }

    // Create notifications based on approval level
    if (currentLevel === 1) {
      // Level 1 (LINE_MANAGER) approval - Notify STAFF

      // 1. Notify STAFF: KPI approved at Level 1
      await db.createNotification({
        userId: kpiOwner.id,
        title: 'KPI Approved at Level 1',
        message: `Your KPI "${kpi.title}" has been approved by your Line Manager and is now under review by the HOD.`,
        type: 'KPI_APPROVED',
        priority: 'MEDIUM',
        status: 'UNREAD',
        actionRequired: false,
        actionUrl: `/kpis/${id}`,
        createdAt: new Date()
      })

      console.log(`[NOTIFICATION] Created Level 1 approval notification for STAFF ${kpiOwner.email}`)

    } else if (currentLevel === 2) {
      // Level 2 (MANAGER) approval - Notify STAFF: KPI fully approved

      await db.createNotification({
        userId: kpiOwner.id,
        title: 'KPI Fully Approved',
        message: `Congratulations! Your KPI "${kpi.title}" has been fully approved by the HOD and is now active for tracking.`,
        type: 'KPI_APPROVED',
        priority: 'HIGH',
        status: 'UNREAD',
        actionRequired: false,
        actionUrl: `/kpis/${id}`,
        createdAt: new Date()
      })

      console.log(`[NOTIFICATION] Created final approval notification for STAFF ${kpiOwner.email}`)

      // Notify all Admins about KPI fully approved
      const admins = await db.getUsers({ role: 'ADMIN', status: 'ACTIVE' })
      for (const admin of admins) {
        await db.createNotification({
          userId: admin.id,
          type: 'SYSTEM',
          title: 'KPI Fully Approved',
          message: `KPI "${kpi.title}" by ${kpiOwner.name} has been fully approved by ${user.name} (${user.role}) and is now active.`,
          priority: 'LOW',
          status: 'UNREAD',
          actionRequired: false,
          actionUrl: `/kpis/${id}`,
          metadata: {
            kpiId: id,
            kpiTitle: kpi.title,
            kpiOwnerId: kpiOwner.id,
            kpiOwnerName: kpiOwner.name,
            finalApproverId: user.id,
            finalApproverName: user.name
          },
          createdAt: new Date()
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        kpiId: id,
        previousStatus: kpi.status,
        newStatus: newStatus,
        currentLevel,
        nextLevel: nextApproverId ? currentLevel + 1 : null,
        fullyApproved: currentLevel === 2 || newStatus === 'APPROVED'
      },
      message: newStatus === 'APPROVED'
        ? 'KPI fully approved! Ready for tracking.'
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

    console.log(`[REJECT] User ${user.email} (${user.role}) attempting to reject KPI ${id}`)

    // Rejection comment is REQUIRED
    if (!comment || comment.trim().length === 0) {
      console.error(`[REJECT-ERROR] Rejection comment is required but not provided`)
      return NextResponse.json(
        { error: 'Rejection comment is required' },
        { status: 400 }
      )
    }

    const kpi = await db.getKpiDefinitionById(id)
    if (!kpi) {
      console.error(`[REJECT-ERROR] KPI ${id} not found in database`)
      return NextResponse.json(
        { error: 'KPI not found', details: `KPI with ID ${id} does not exist` },
        { status: 404 }
      )
    }

    console.log(`[REJECT] Found KPI: ${kpi.title} (Status: ${kpi.status}, Owner: ${kpi.userId})`)

    // Get pending approval for this KPI
    const approvals = await db.getApprovals({ kpiDefinitionId: id, status: 'PENDING' })
    console.log(`[REJECT] Found ${approvals.length} pending approvals for KPI ${id}`)

    // For ADMIN: allow proxy rejection (take the first pending approval)
    // For others: find their own pending approval
    let pendingApproval
    if (user.role === 'ADMIN') {
      pendingApproval = approvals.find(a => a.status === 'PENDING')
      if (pendingApproval) {
        console.log(`[ADMIN-PROXY] Admin ${user.email} rejecting on behalf of ${pendingApproval.approverId}`)
      }
    } else {
      pendingApproval = approvals.find(a => a.approverId === user.id)
    }

    if (!pendingApproval) {
      console.error(`[REJECT-ERROR] No pending approval found for user ${user.email} on KPI ${id}`)
      console.error(`[REJECT-ERROR] Available approvals:`, approvals.map(a => ({
        id: a.id,
        approverId: a.approverId,
        status: a.status,
        level: a.level
      })))
      return NextResponse.json(
        {
          error: 'No pending approval found for this user',
          details: `You don't have a pending approval for this KPI. Available approvals: ${approvals.length}`
        },
        { status: 403 }
      )
    }

    console.log(`[REJECT] Found pending approval at Level ${pendingApproval.level}`)

    const currentLevel = pendingApproval.level

    // Update approval record to REJECTED
    await db.updateApproval(pendingApproval.id, {
      status: 'REJECTED',
      comment,
      decidedAt: new Date()
    })

    // Cancel all other pending approvals FOR THIS SPECIFIC KPI
    const otherPendingApprovals = approvals.filter(
      a => a.id !== pendingApproval.id &&
        a.status === 'PENDING' &&
        (a.entityId === id || a.kpiDefinitionId === id)
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

    // Get KPI owner to send notification
    const kpiOwner = await db.getUserById(kpi.userId)

    // Create notification for STAFF based on rejection level
    if (kpiOwner) {
      let rejectionMessage = ''
      let rejectionTitle = ''

      if (currentLevel === 1) {
        // LINE_MANAGER rejection
        rejectionTitle = 'KPI Rejected by Line Manager'
        rejectionMessage = `Your KPI "${kpi.title}" has been rejected by your Line Manager. Reason: ${comment}. You can revise and resubmit.`
      } else if (currentLevel === 2) {
        // MANAGER (HOD) rejection
        rejectionTitle = 'KPI Rejected at Final Review'
        rejectionMessage = `Your KPI "${kpi.title}" has been rejected by the HOD at final review. Reason: ${comment}. Please revise and resubmit.`
      }

      await db.createNotification({
        userId: kpiOwner.id,
        title: rejectionTitle,
        message: rejectionMessage,
        type: 'KPI_REJECTED',
        priority: 'HIGH',
        status: 'UNREAD',
        actionRequired: true,
        actionUrl: `/kpis/${id}`,
        createdAt: new Date()
      })

      console.log(`[NOTIFICATION] Created rejection notification for STAFF ${kpiOwner.email} (Level ${currentLevel})`)
    }

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