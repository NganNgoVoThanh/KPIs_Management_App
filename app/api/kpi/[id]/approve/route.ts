// app/api/kpis/[id]/approve/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-service'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/kpis/[id]/approve
 * Approve KPI at current level
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
    const body = await request.json()
    const { comment } = body

    const kpi = await db.getKpiDefinitionById(id)
    if (!kpi) {
      return NextResponse.json(
        { error: 'KPI not found' },
        { status: 404 }
      )
    }

    // Get pending approval for this user
    const approvals = await db.getApprovals({ entityId: id, entityType: 'KPI' })
    const pendingApproval = approvals.find(
      a => a.approverId === user.id && a.status === 'PENDING'
    )

    if (!pendingApproval) {
      return NextResponse.json(
        { error: 'No pending approval found for this user' },
        { status: 403 }
      )
    }

    const currentLevel = pendingApproval.level

    // Update approval record
    await db.updateApproval(pendingApproval.id, {
      status: 'APPROVED',
      comment: comment || null,
      decidedAt: new Date()
    })

    // Determine next status and actions based on level
    let newStatus: string
    let nextApproverId: string | null = null
    const kpiOwner = await db.getUserById(kpi.userId)
    const hierarchy = kpiOwner ? await db.getActiveApprovalHierarchy(kpiOwner.id) : null

    if (currentLevel === 1) {
      // Level 1 approved, move to Level 2 (HoD)
      newStatus = 'PENDING_HOD'
      nextApproverId = hierarchy?.level2ApproverId || null
    } else if (currentLevel === 2) {
      // Level 2 approved, move to Level 3 (BOD)
      newStatus = 'PENDING_BOD'
      nextApproverId = hierarchy?.level3ApproverId || null
    } else if (currentLevel === 3) {
      // Level 3 approved, KPI is fully approved
      newStatus = 'APPROVED'
    } else {
      newStatus = kpi.status
    }

    // Update KPI status
    const updateData: any = {
      status: newStatus,
      updatedAt: new Date()
    }

    if (newStatus === 'APPROVED') {
      updateData.approvedAt = new Date()
      updateData.approvedBy = user.id
    }

    await db.updateKpiDefinition(id, updateData)

    // Create next level approval if needed
    if (nextApproverId && currentLevel < 3) {
      await db.createApproval({
        entityId: id,
        entityType: 'KPI',
        level: currentLevel + 1,
        approverId: nextApproverId,
        status: 'PENDING',
        createdAt: new Date()
      })

      // Notify next approver
      await db.createNotification({
        userId: nextApproverId,
        type: 'APPROVAL_REQUIRED',
        title: `Level ${currentLevel + 1} KPI Approval Required`,
        message: `KPI "${kpi.title}" has been approved by ${user.name} and requires your approval.`,
        priority: 'HIGH',
        status: 'UNREAD',
        actionRequired: true,
        actionUrl: `/approvals/${id}`,
        metadata: {
          kpiId: id,
          kpiTitle: kpi.title,
          previousApprover: user.id,
          level: currentLevel + 1
        },
        createdAt: new Date()
      })
    }

    // Notify KPI owner
    if (newStatus === 'APPROVED') {
      await db.createNotification({
        userId: kpi.userId,
        type: 'KPI_APPROVED',
        title: 'KPI Approved',
        message: `Your KPI "${kpi.title}" has been fully approved by all levels.`,
        priority: 'HIGH',
        status: 'UNREAD',
        actionRequired: false,
        actionUrl: `/kpis/${id}`,
        metadata: {
          kpiId: id,
          kpiTitle: kpi.title,
          finalApprover: user.id
        },
        createdAt: new Date()
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        kpiId: id,
        previousStatus: kpi.status,
        newStatus,
        currentLevel,
        nextLevel: nextApproverId ? currentLevel + 1 : null,
        fullyApproved: newStatus === 'APPROVED'
      },
      message: newStatus === 'APPROVED' 
        ? 'KPI fully approved'
        : `KPI approved at Level ${currentLevel}, moved to Level ${currentLevel + 1}`
    })

  } catch (error: any) {
    console.error('POST /api/kpis/[id]/approve error:', error)
    return NextResponse.json(
      { error: 'Failed to approve KPI', details: error.message },
      { status: 500 }
    )
  }
}