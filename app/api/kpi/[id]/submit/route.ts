
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-server'
import { getDatabase } from '@/lib/repositories/DatabaseFactory'

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic'


export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Auth required' }, { status: 401 })
    }

    const db = getDatabase()
    const kpi = await db.getKpiDefinitionById(params.id)

    if (!kpi) {
      return NextResponse.json({ error: 'KPI not found' }, { status: 404 })
    }

    if (kpi.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (kpi.status !== 'DRAFT' && kpi.status !== 'REJECTED') {
      return NextResponse.json({ error: 'Only DRAFT/REJECTED KPIs can be submitted' }, { status: 400 })
    }

    const isResubmission = kpi.status === 'REJECTED'

    // If this is a resubmission, cancel all old pending/rejected approvals for this KPI
    if (isResubmission) {
      console.log('[KPI-SUBMIT] Resubmitting REJECTED KPI - cancelling old approvals')
      const oldApprovals = await db.getApprovals({ kpiDefinitionId: kpi.id })
      console.log('[KPI-SUBMIT] Found old approvals:', oldApprovals.map(a => ({
        id: a.id,
        status: a.status,
        level: a.level,
        approverId: a.approverId
      })))

      // Cancel all old approvals (PENDING, REJECTED, APPROVED) to start fresh
      for (const oldApproval of oldApprovals) {
        if (oldApproval.status === 'PENDING' || oldApproval.status === 'REJECTED') {
          await db.updateApproval(oldApproval.id, {
            status: 'CANCELLED',
            decidedAt: new Date()
          })
          console.log('[KPI-SUBMIT] Cancelled old approval:', oldApproval.id, 'status was:', oldApproval.status)
        }
      }
    }

    // Identify approver (Line Manager)
    let approver = null

    // 1. Try to get user's direct manager
    if (user.managerId) {
      approver = await db.getUserById(user.managerId)
      if (approver && approver.status !== 'ACTIVE') {
        approver = null // Manager inactive
      }
    }

    // 2. Fallback: Find any active Line Manager in same department
    if (!approver && user.department) {
      const lineManagers = await db.getUsers({
        role: 'LINE_MANAGER',
        status: 'ACTIVE',
        department: user.department
      })
      if (lineManagers && lineManagers.length > 0) {
        approver = lineManagers[0]
      }
    }

    // 3. Fallback: Find ANY active Line Manager (cross-department)
    if (!approver) {
      const lineManagers = await db.getUsers({
        role: 'LINE_MANAGER',
        status: 'ACTIVE'
      })
      if (lineManagers && lineManagers.length > 0) {
        approver = lineManagers[0]
      }
    }

    // 4. Last resort: Assign to any ADMIN
    if (!approver) {
      const admins = await db.getUsers({ role: 'ADMIN', status: 'ACTIVE' })
      if (admins && admins.length > 0) {
        approver = admins[0]
      }
    }

    // 5. No approver available - error
    if (!approver) {
      return NextResponse.json({
        error: 'No active approver found. Please contact admin.'
      }, { status: 500 })
    }

    console.log('[KPI-SUBMIT] Creating approval:', {
      kpiId: kpi.id,
      kpiTitle: kpi.title,
      submitter: user.email,
      submitterId: user.id,
      approver: approver.email,
      approverId: approver.id,
      approverRole: approver.role,
      isResubmission
    })

    // Update KPI Status (Level 1: Waiting for Line Manager)
    // Clear rejection fields if this is a resubmission
    const updateData: any = {
      status: 'WAITING_LINE_MGR',
      submittedAt: new Date()
    }

    if (isResubmission) {
      updateData.rejectedBy = null
      updateData.rejectedAt = null
      updateData.rejectionReason = null
    }

    await db.updateKpiDefinition(params.id, updateData)

    console.log('[KPI-SUBMIT] Updated KPI status:', updateData)

    // Create Level 1 Approval Request (Line Manager)
    const approval = await db.createApproval({
      kpiDefinitionId: kpi.id,
      entityType: 'KPI',
      entityId: kpi.id,
      approverId: approver.id,
      status: 'PENDING',
      level: 1,
      createdAt: new Date()
    })

    console.log('[KPI-SUBMIT] Approval created:', {
      approvalId: approval.id,
      approverId: approval.approverId,
      entityId: approval.entityId,
      status: approval.status,
      level: approval.level
    })

    // Verify the approval was created and can be retrieved
    const verifyApproval = await db.getApprovalById(approval.id)
    if (verifyApproval) {
      console.log('[KPI-SUBMIT] Verified approval exists in DB:', {
        id: verifyApproval.id,
        approverId: verifyApproval.approverId,
        status: verifyApproval.status
      })
    } else {
      console.error('[KPI-SUBMIT-ERROR] Failed to verify approval creation!')
    }

    // Notify Approver
    const notificationTitle = isResubmission ? 'KPI Resubmitted for Approval' : 'New KPI Approval Request'
    const notificationMessage = isResubmission
      ? `${user.name} has revised and resubmitted a KPI for your approval: ${kpi.title}`
      : `${user.name} has submitted a KPI for your approval: ${kpi.title}`

    await db.createNotification({
      userId: approver.id,
      type: 'APPROVAL_REQUEST',
      title: notificationTitle,
      message: notificationMessage,
      priority: 'HIGH',
      status: 'UNREAD',
      actionRequired: true,
      actionUrl: `/approvals`,
      createdAt: new Date()
    })

    console.log('[KPI-SUBMIT] Notification sent to approver:', approver.email)

    const responseMessage = isResubmission
      ? 'KPI resubmitted successfully. Your Line Manager will review the changes.'
      : 'KPI submitted for approval.'

    return NextResponse.json({
      success: true,
      message: responseMessage,
      data: {
        kpiId: kpi.id,
        status: 'WAITING_LINE_MGR',
        approverId: approver.id,
        approverEmail: approver.email,
        isResubmission
      }
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}