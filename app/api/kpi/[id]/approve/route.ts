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

      // CRITICAL FIX: Find MANAGER based on KPI Owner's Department/OrgUnit
      // 1. Try to find the Manager of the OrgUnit
      // STRATEGY FOR LEVEL 2 APPROVER (HOD):

      // 1. Priority: Check for Admin-assigned specific HOD (Override)
      // Note: We access 'hod' relation if available (Typescript might need check, but runtime it's there)
      const specificHod = (kpiOwner as any).hod; // Access dynamic relation

      if (specificHod && specificHod.status === 'ACTIVE') {
        nextApproverId = specificHod.id;
        console.log(`[APPROVE-ROUTING] Found Admin-assigned Override HOD: ${specificHod.email}`);
      } else {
        // 2. Fallback: Look for a User with role 'MANAGER' in the SAME department
        console.log(`[APPROVE-ROUTING] No override HOD. Looking for Department Head in: ${kpiOwner.department}`);

        const departmentManagers = await db.getUsers({
          role: 'MANAGER',
          status: 'ACTIVE',
          department: kpiOwner.department // Strict Department Match
        })

        if (departmentManagers && departmentManagers.length > 0) {
          nextApproverId = departmentManagers[0].id
          console.log(`[APPROVE-ROUTING] Found Department Head: ${departmentManagers[0].email}`)
        } else {
          // 3. Last Resort: Look for the specific 'hod@intersnack.com.vn'
          const allManagers = await db.getUsers({ role: 'MANAGER', status: 'ACTIVE' })
          const generalHod = allManagers.find(m => m.email === 'hod@intersnack.com.vn')

          if (generalHod) {
            nextApproverId = generalHod.id
            console.log(`[APPROVE-ROUTING] Department Head not found. Fallback to General HOD: ${generalHod.email}`)
          } else if (allManagers.length > 0) {
            // 4. Emergency: Any active Manager
            nextApproverId = allManagers[0].id
            console.log(`[APPROVE-ROUTING] Fallback to available Manager: ${allManagers[0].email}`)
          }
        }
      }

      if (!nextApproverId) {
        return NextResponse.json({
          error: 'No active MANAGER found for Level 2 approval. Please contact Admin.',
          code: 'NO_MANAGER_AVAILABLE'
        }, { status: 500 })
      }

    } else if (currentLevel === 2) {
      // Level 2: MANAGER approval → KPI fully APPROVED
      newStatus = 'APPROVED'
      nextApproverId = null
    } else {
      return NextResponse.json(
        { error: 'Invalid approval level' },
        { status: 400 }
      )
    }

    // EXECUTE UPDATES (Sequential integrity)

    // 1. Close current approval
    await db.updateApproval(pendingApproval.id, {
      status: 'APPROVED',
      comment: comment || null,
      decidedAt: new Date()
    })

    // 2. Update KPI Status
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
      updateData.approvedAt = new Date()
    }

    await db.updateKpiDefinition(id, updateData)
    console.log(`[APPROVE] KPI ${id} Updated to ${newStatus}`)

    // 3. Create Next Level Approval (if needed)
    if (nextApproverId && currentLevel === 1) {
      const nextLevel = 2
      const level2Approval = await db.createApproval({
        entityId: id,
        entityType: 'KPI',
        kpiDefinitionId: id,
        approverId: nextApproverId,
        level: nextLevel,
        status: 'PENDING',
        createdAt: new Date()
      })
      console.log(`[APPROVE] Created Level 2 Approval: ${level2Approval.id} for Approver: ${nextApproverId}`)

      // Notify Level 2 Approver
      await db.createNotification({
        userId: nextApproverId,
        title: 'New KPI Ready for Your Approval (Level 2)',
        message: `KPI "${kpi.title}" from ${kpiOwner.name} (${kpiOwner.department}) is ready for final review.`,
        type: 'APPROVAL_REQUIRED',
        priority: 'HIGH',
        status: 'UNREAD',
        actionRequired: true,
        actionUrl: '/approvals',
        createdAt: new Date()
      })
    }

    // 4. Notify Staff of Progress
    if (newStatus === 'APPROVED') {
      await db.createNotification({
        userId: kpiOwner.id,
        title: 'KPI Fully Approved',
        message: `Your KPI "${kpi.title}" has been fully approved.`,
        type: 'KPI_APPROVED',
        priority: 'HIGH',
        status: 'UNREAD',
        actionRequired: false,
        actionUrl: `/kpis/${id}`,
        createdAt: new Date()
      })
    } else {
      await db.createNotification({
        userId: kpiOwner.id,
        title: 'KPI Approved at Level 1',
        message: `Your KPI "${kpi.title}" passed Level 1 and is now with the HOD.`,
        type: 'KPI_APPROVED',
        priority: 'MEDIUM',
        status: 'UNREAD',
        actionRequired: false,
        actionUrl: `/kpis/${id}`,
        createdAt: new Date()
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        kpiId: id,
        previousStatus: kpi.status,
        newStatus: newStatus,
        currentLevel,
        nextLevel: nextApproverId ? 2 : null,
        fullyApproved: newStatus === 'APPROVED'
      },
      message: newStatus === 'APPROVED' ? 'KPI fully approved!' : 'Approved Level 1. Sent to HOD.'
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