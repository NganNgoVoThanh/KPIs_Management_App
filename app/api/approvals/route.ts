// app/api/approvals/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-server'
import { getDatabase } from '@/lib/repositories/DatabaseFactory'

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic'


/**
 * GET /api/approvals
 * Get pending approvals for current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('[APPROVALS-API] User authenticated:', {
      id: user.id,
      email: user.email,
      role: user.role
    })

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

    const db = getDatabase()

    // ADMIN can see ALL approvals (for proxy), others see only their own
    let allApprovals
    if (user.role === 'ADMIN') {
      console.log('[APPROVALS-API] ADMIN - Fetching ALL approvals')
      allApprovals = await db.getApprovals({})
    } else {
      console.log('[APPROVALS-API] Fetching approvals for approverId:', user.id)
      allApprovals = await db.getApprovals({
        approverId: user.id
      })
    }

    console.log('[APPROVALS-API] Raw approvals from DB:', {
      count: allApprovals.length,
      role: user.role,
      approvals: allApprovals.map(a => ({
        id: a.id,
        entityId: a.entityId,
        approverId: a.approverId,
        status: a.status,
        level: a.level
      }))
    })

    // Filter by current user as approver (ADMIN sees all, others see only their own)
    let userApprovals = user.role === 'ADMIN'
      ? allApprovals
      : allApprovals.filter(a => a.approverId === user.id)

    console.log('[APPROVALS-API] After approverId filter:', userApprovals.length)

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
        let entityNotFoundReason: string | null = null

        if (approval.entityType === 'KPI') {
          entity = await db.getKpiDefinitionById(approval.entityId)
          if (!entity) {
            entityNotFoundReason = `KPI with ID ${approval.entityId} not found in database`
            console.error(`[APPROVALS-API-ERROR] ${entityNotFoundReason}`, {
              approvalId: approval.id,
              entityId: approval.entityId,
              entityType: approval.entityType,
              approverId: approval.approverId,
              status: approval.status,
              level: approval.level,
              createdAt: approval.createdAt
            })
          } else {
            submitter = await db.getUserById(entity.userId)
            if (!submitter) {
              console.error(`[APPROVALS-API-WARNING] Submitter not found for KPI ${entity.id}, userId: ${entity.userId}`)
            }
          }
        } else if (approval.entityType === 'ACTUAL') {
          const actuals = await db.getKpiActuals({ kpiDefinitionId: approval.entityId })
          if (actuals.length > 0) {
            entity = actuals[0]
            const kpi = await db.getKpiDefinitionById(entity.kpiDefinitionId)
            if (kpi) {
              submitter = await db.getUserById(kpi.userId)
            } else {
              console.error(`[APPROVALS-API-WARNING] KPI not found for actual ${entity.id}, kpiDefinitionId: ${entity.kpiDefinitionId}`)
            }
          } else {
            entityNotFoundReason = `ACTUAL with ID ${approval.entityId} not found in database`
            console.error(`[APPROVALS-API-ERROR] ${entityNotFoundReason}`, {
              approvalId: approval.id,
              entityId: approval.entityId,
              entityType: approval.entityType
            })
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
          isOverdue: daysPending > 3, // SLA is 3 days per level
          entityNotFoundReason
        }
      })
    )

    // Log approvals where entity was not found but DON'T filter them out
    // This helps diagnose issues while keeping all approval records visible
    const approvalsWithoutEntity = enrichedApprovals.filter(a => a.entity === null)
    if (approvalsWithoutEntity.length > 0) {
      console.error(`[APPROVALS-API-DIAGNOSTIC] Found ${approvalsWithoutEntity.length} approvals with missing entities:`,
        approvalsWithoutEntity.map(a => ({
          approvalId: a.id,
          entityId: a.entityId,
          entityType: a.entityType,
          status: a.status,
          level: a.level,
          approverId: a.approverId,
          reason: a.entityNotFoundReason,
          createdAt: a.createdAt
        }))
      )
    }

    // Filter out approvals where entity was not found ONLY for PENDING approvals
    // Keep all historical approvals (APPROVED, REJECTED, CANCELLED) even if entity is missing
    const validApprovals = enrichedApprovals.filter(a =>
      a.entity !== null || a.status !== 'PENDING'
    )

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

    console.log('[APPROVALS-API] Final response stats:', stats)
    console.log('[APPROVALS-API] Pending approvals:', validApprovals
      .filter(a => a.status === 'PENDING')
      .map(a => ({
        id: a.id,
        entityId: a.entityId,
        entityTitle: a.entity?.title,
        level: a.level,
        approverId: a.approverId
      }))
    )

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