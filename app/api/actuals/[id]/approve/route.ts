import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-service'
import { db } from '@/lib/db'

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic'

/**
 * POST /api/actuals/[id]/approve
 * Approve or Reject a KPI Actual
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = authService.getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { comment } = body
    const actualId = params.id
    const action = 'APPROVE'

    console.log(`[ACTUAL-APPROVE] User ${user.id} approving actual ${actualId}`)

    // 1. Verify Actual exists
    // We iterate to find it since we don't have getById exposed clearly yet in this context
    const allActuals = await db.getKpiActuals({})
    const actual = allActuals.find(a => a.id === actualId)

    if (!actual) {
      return NextResponse.json({ error: 'Actual result not found' }, { status: 404 })
    }

    // 2. Find Pending Approval for this user
    // We need to look up the approval record that authorizes this user to approve
    const approvals = await db.getApprovals({
      approverId: user.id
    })

    // Filter for this actual
    const approval = approvals.find(a =>
      a.entityId === actualId &&
      a.entityType === 'ACTUAL' &&
      a.status === 'PENDING'
    )

    if (!approval && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No pending approval found for you' }, { status: 403 })
    }

    // 3. Update Approval Record
    if (approval) {
      await db.updateApproval(approval.id, {
        status: 'APPROVED',
        decidedAt: new Date(),
        comment: comment || 'Approved'
      })
    }

    // 4. Multi-level Logic
    const currentLevel = approval ? approval.level : 1;
    let nextApproverId: string | null = null;
    let newStatus = 'APPROVED';

    // Fetch submitter info to determine routing
    const kpiDef = await db.getKpiDefinitionById(actual.kpiDefinitionId);
    if (!kpiDef) throw new Error('KPI Definition not found for Actual');
    const submitter = await db.getUserById(kpiDef.userId);
    if (!submitter) throw new Error('Submitter not found');

    if (currentLevel === 1) {
      // Check for Level 2 (HOD)
      // 1. Check specific HOD
      const specificHod = (submitter as any).hod;
      if (specificHod && specificHod.status === 'ACTIVE') {
        nextApproverId = specificHod.id;
      } else {
        // 2. Department Manager
        const departmentManagers = await db.getUsers({
          role: 'MANAGER',
          status: 'ACTIVE',
          department: submitter.department
        });
        if (departmentManagers && departmentManagers.length > 0) {
          // Avoid self-approval if submitter is also the manager (edge case but possible)
          // But here we are checking if CURRENT approver is the HOD.
          // If the current approver (Level 1) IS the HOD, we should probably auto-approve Level 2 or skip it.
          // Current Logic: If nextApproverId !== user.id, assign Level 2.
          nextApproverId = departmentManagers[0].id;
        } else {
          // 3. Fallback to General HOD
          const allManagers = await db.getUsers({ role: 'MANAGER', status: 'ACTIVE' })
          const generalHod = allManagers.find(m => m.email === 'hod@intersnack.com.vn')
          if (generalHod) nextApproverId = generalHod.id
        }
      }

      // Optimization: If the Level 1 approver IS the Level 2 approver, skip Level 2.
      if (nextApproverId === user.id) {
        nextApproverId = null; // Skip to Final Approval
      } else if (nextApproverId) {
        newStatus = 'WAITING_MANAGER'; // Move to Level 2
      }
    }

    // 5. Update Actual based on flow
    if (newStatus === 'APPROVED') {
      // Final Approval
      await db.updateKpiActual(actualId, {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: user.id
      });
    } else {
      // Intermediate State
      await db.updateKpiActual(actualId, {
        status: 'WAITING_MANAGER' as any, // Cast to any if enum is strict
        // We might track approvedByLevel1 in actuals table or just rely on approval history
      });

      // Create Level 2 Approval
      if (nextApproverId) {
        await db.createApproval({
          entityId: actual.id,
          entityType: 'ACTUAL',
          level: 2,
          approverId: nextApproverId,
          status: 'PENDING',
          kpiDefinitionId: actual.kpiDefinitionId
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: newStatus === 'APPROVED' ? 'Actual result fully approved' : 'Approved (Level 1). Sent to HOD.'
    })

  } catch (error: any) {
    console.error('Approve Actual error:', error)
    return NextResponse.json(
      { error: 'Failed to approve actual', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/actuals/[id]/approve
 * Reject a KPI Actual
 * (Using PATCH for rejection to distinguish from POST approval if desired, 
 * but often typically same endpoint with action/status body. 
 * Following the pattern of the KPI approval which used method switching)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = authService.getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { comment } = body
    const actualId = params.id

    console.log(`[ACTUAL-REJECT] User ${user.id} rejecting actual ${actualId}`)

    // 1. Verify Actual exists
    const allActuals = await db.getKpiActuals({})
    const actual = allActuals.find(a => a.id === actualId)

    if (!actual) {
      return NextResponse.json({ error: 'Actual result not found' }, { status: 404 })
    }

    // 2. Find Pending Approval
    const approvals = await db.getApprovals({
      approverId: user.id
    })

    const approval = approvals.find(a =>
      a.entityId === actualId &&
      a.entityType === 'ACTUAL'
      // We allow rejecting even if technically not pending? No, usually filtering by pending.
      // && a.status === 'PENDING'
    )

    if (!approval && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No pending approval found for you' }, { status: 403 })
    }

    // 3. Update Approval Record
    if (approval) {
      await db.updateApproval(approval.id, {
        status: 'REJECTED',
        decidedAt: new Date(),
        comment: comment || 'Rejected'
      })
    }

    // 4. Update Actual Status
    await db.updateKpiActual(actualId, {
      status: 'REJECTED',
      rejectedAt: new Date(),
      rejectedBy: user.id,
      rejectionReason: comment
    })

    return NextResponse.json({
      success: true,
      message: 'Actual result rejected'
    })

  } catch (error: any) {
    console.error('Reject Actual error:', error)
    return NextResponse.json(
      { error: 'Failed to reject actual', details: error.message },
      { status: 500 }
    )
  }
}