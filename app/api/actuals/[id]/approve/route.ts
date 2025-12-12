// app/api/actuals/[id]/approve/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-service'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/actuals/[id]/approve
 * Approve actual at current level
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

    const actuals = await db.getKpiActuals({ kpiDefinitionId: id })
    if (actuals.length === 0) {
      return NextResponse.json(
        { error: 'Actual not found' },
        { status: 404 }
      )
    }

    const actual = actuals[0]
    const kpi = await db.getKpiDefinitionById(actual.kpiDefinitionId)
    if (!kpi) {
      return NextResponse.json(
        { error: 'Associated KPI not found' },
        { status: 404 }
      )
    }

    // Get pending approval for this user
    const approvals = await db.getApprovals({ 
      entityId: actual.id, 
      entityType: 'ACTUAL' 
    })
    
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

    // Determine next status and actions
    let newStatus: string
    let nextApproverId: string | null = null
    const kpiOwner = await db.getUserById(kpi.userId)
    const hierarchy = kpiOwner ? await db.getActiveApprovalHierarchy(kpiOwner.id) : null

    if (currentLevel === 1) {
      newStatus = 'PENDING_MANAGER'
      nextApproverId = hierarchy?.level2ApproverId || null
    } else if (currentLevel === 2) {
      newStatus = 'APPROVED'
      nextApproverId = null
    } else {
      newStatus = actual.status
    }

    // Update actual status
    const updateData: any = {
      status: newStatus,
      updatedAt: new Date()
    }

    if (newStatus === 'APPROVED') {
      updateData.approvedAt = new Date()
      updateData.approvedBy = user.id
      
      // Also update KPI status to LOCKED_ACTUALS
      await db.updateKpiDefinition(kpi.id, {
        status: 'LOCKED_ACTUALS'
      })
    }

    await db.updateKpiActual(actual.id, updateData)

    // Create next level approval if needed
    if (nextApproverId && currentLevel < 3) {
      await db.createApproval({
        entityId: actual.id,
        entityType: 'ACTUAL',
        level: currentLevel + 1,
        approverId: nextApproverId,
        status: 'PENDING',
        createdAt: new Date()
      })

      // Notify next approver
      await db.createNotification({
        userId: nextApproverId,
        type: 'ACTUAL_APPROVAL_REQUIRED',
        title: `Level ${currentLevel + 1} Actual Approval Required`,
        message: `Actual results for KPI "${kpi.title}" have been approved by ${user.name} and require your approval.`,
        priority: 'HIGH',
        status: 'UNREAD',
        actionRequired: true,
        actionUrl: `/evaluation/${actual.id}`,
        metadata: {
          actualId: actual.id,
          kpiId: kpi.id,
          kpiTitle: kpi.title,
          previousApprover: user.id,
          level: currentLevel + 1,
          score: actual.score
        },
        createdAt: new Date()
      })
    }

    // Notify KPI owner
    if (newStatus === 'APPROVED') {
      await db.createNotification({
        userId: kpi.userId,
        type: 'ACTUAL_APPROVED',
        title: 'Actual Results Approved',
        message: `Your actual results for KPI "${kpi.title}" have been fully approved. Final score: ${actual.score}/5`,
        priority: 'HIGH',
        status: 'UNREAD',
        actionRequired: false,
        actionUrl: `/kpis/${kpi.id}`,
        metadata: {
          actualId: actual.id,
          kpiId: kpi.id,
          kpiTitle: kpi.title,
          finalApprover: user.id,
          finalScore: actual.score,
          percentage: actual.percentage
        },
        createdAt: new Date()
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        actualId: actual.id,
        previousStatus: actual.status,
        newStatus,
        currentLevel,
        nextLevel: nextApproverId ? currentLevel + 1 : null,
        fullyApproved: newStatus === 'APPROVED',
        finalScore: actual.score
      },
      message: newStatus === 'APPROVED' 
        ? `Actual results fully approved with score ${actual.score}/5`
        : `Actual approved at Level ${currentLevel}, moved to Level ${currentLevel + 1}`
    })

  } catch (error: any) {
    console.error('POST /api/actuals/[id]/approve error:', error)
    return NextResponse.json(
      { error: 'Failed to approve actual', details: error.message },
      { status: 500 }
    )
  }
}