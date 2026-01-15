
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

    // [VALIDATION] Critical Check: Total Weight must be exactly 100%
    const userKpis = await db.getKpiDefinitions({
      userId: user.id,
      cycleId: kpi.cycleId
    })

    // Filter out deleted/archived KPIs if necessary (assuming all returned are active)
    // Calculate total weight including this KPI (since it's already in DB)
    const totalWeight = userKpis.reduce((sum, k) => sum + (k.weight || 0), 0)

    // Allow small float point tolerance (e.g. 99.999 is ok, 100.001 is ok)
    if (Math.abs(totalWeight - 100) > 0.1) {
      return NextResponse.json({
        error: `Total KPI weight must be 100% to submit. Current total: ${totalWeight.toFixed(2)}%. Please adjust your KPIs.`
      }, { status: 400 })
    }

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

    // Identify approver (Line Manager - Level 1)
    let approver = null

    // 1. Priority: User's Direct Manager
    if (user.managerId) {
      const directManager = await db.getUserById(user.managerId)
      if (directManager && directManager.status === 'ACTIVE') {
        approver = directManager
        console.log(`[KPI-SUBMIT] Found Direct Manager: ${approver.email}`)
      }
    }

    // 2. Fallback: Find any active Line Manager in SAME department
    if (!approver && user.department) {
      console.log(`[KPI-SUBMIT] Direct manager not found. Looking for LINE_MANAGER in department: ${user.department}`)
      const departmentLineManagers = await db.getUsers({
        role: 'LINE_MANAGER',
        status: 'ACTIVE',
        department: user.department // Strict Department Match
      })

      if (departmentLineManagers && departmentLineManagers.length > 0) {
        approver = departmentLineManagers[0]
        console.log(`[KPI-SUBMIT] Found Department Line Manager: ${approver.email}`)
      }
    }

    // 3. Last Resort: Find Admin (Do NOT assign to random Line Manager of other departments)
    // Assigning to random Line Mgr is dangerous for data privacy. Better to fail safe to Admin.
    if (!approver) {
      console.log(`[KPI-SUBMIT] No Line Manager found. Fallback to ADMIN.`)
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

    // Notify all Admins for visibility
    const admins = await db.getUsers({ role: 'ADMIN', status: 'ACTIVE' })
    for (const admin of admins) {
      await db.createNotification({
        userId: admin.id,
        type: 'SYSTEM',
        title: isResubmission ? 'KPI Resubmitted' : 'New KPI Submitted',
        message: `${user.name} has ${isResubmission ? 'resubmitted' : 'submitted'} KPI "${kpi.title}" for approval by ${approver.name} (${approver.role}).`,
        priority: 'LOW',
        status: 'UNREAD',
        actionRequired: false,
        actionUrl: `/kpis/${kpi.id}`,
        metadata: {
          kpiId: kpi.id,
          kpiTitle: kpi.title,
          submitterId: user.id,
          submitterName: user.name,
          approverId: approver.id,
          approverName: approver.name
        },
        createdAt: new Date()
      })
    }

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