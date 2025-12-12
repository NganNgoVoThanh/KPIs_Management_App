// app/api/approvals/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-service'
import { db } from '@/lib/db'

/**
 * GET /api/approvals
 * Get pending approvals for current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = authService.getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only managers can access approvals
    if (!['LINE_MANAGER', 'MANAGER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Access denied. Manager role required.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'PENDING'
    const entityType = searchParams.get('entityType') || undefined

    // Get all approvals where user is the approver
    let allApprovals = await db.getApprovals({
      entityId: '', // Will filter by approverId instead
      entityType: 'KPI' // Default, will be overridden
    })

    // Filter by current user as approver
    let userApprovals = allApprovals.filter(a => a.approverId === user.id)

    // Filter by status
    if (status !== 'ALL') {
      userApprovals = userApprovals.filter(a => a.status === status)
    }

    // Filter by entity type
    if (entityType) {
      userApprovals = userApprovals.filter(a => a.entityType === entityType)
    }

    // Enrich approvals with entity data and submitter info
    const enrichedApprovals = await Promise.all(
      userApprovals.map(async (approval) => {
        let entity: any = null
        let submitter: any = null
        let daysPending = 0

        if (approval.entityType === 'KPI') {
          entity = await db.getKpiDefinitionById(approval.entityId)
          if (entity) {
            submitter = await db.getUserById(entity.userId)
          }
        } else if (approval.entityType === 'ACTUAL') {
          const actuals = await db.getKpiActuals({ kpiDefinitionId: approval.entityId })
          if (actuals.length > 0) {
            entity = actuals[0]
            const kpi = await db.getKpiDefinitionById(entity.kpiDefinitionId)
            if (kpi) {
              submitter = await db.getUserById(kpi.userId)
            }
          }
        }

        // Calculate days pending
        if (approval.status === 'PENDING') {
          const createdDate = new Date(approval.createdAt)
          const now = new Date()
          daysPending = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
        }

        return {
          ...approval,
          entity,
          submitter,
          daysPending,
          isOverdue: daysPending > 3 // SLA is 3 days per level
        }
      })
    )

    // Filter out approvals where entity was not found
    const validApprovals = enrichedApprovals.filter(a => a.entity !== null)

    // Sort: overdue first, then by creation date
    validApprovals.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1
      if (!a.isOverdue && b.isOverdue) return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    // Get statistics
    const stats = {
      total: validApprovals.length,
      pending: validApprovals.filter(a => a.status === 'PENDING').length,
      overdue: validApprovals.filter(a => a.isOverdue).length,
      approved: userApprovals.filter(a => a.status === 'APPROVED').length,
      rejected: userApprovals.filter(a => a.status === 'REJECTED').length
    }

    return NextResponse.json({
      success: true,
      data: validApprovals,
      stats,
      count: validApprovals.length
    })

  } catch (error: any) {
    console.error('GET /api/approvals error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch approvals', details: error.message },
      { status: 500 }
    )
  }
}