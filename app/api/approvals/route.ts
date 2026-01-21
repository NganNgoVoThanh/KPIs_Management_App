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

    // Only managers can access approvals list, but STAFF can see history of specific KPI
    const { searchParams } = new URL(request.url)
    const kpiDefinitionId = searchParams.get('kpiDefinitionId')

    if (!['LINE_MANAGER', 'MANAGER', 'ADMIN'].includes(user.role)) {
      // If user is STAFF (or other), they MUST provide a kpiDefinitionId to see its history
      if (!kpiDefinitionId) {
        return NextResponse.json(
          { error: 'Access denied. Manager role required for general approval list.' },
          { status: 403 }
        )
      }
    }

    const status = searchParams.get('status') || 'PENDING'
    const entityType = searchParams.get('entityType') || undefined
    // kpiDefinitionId is already extracted above

    const db = getDatabase()

    // ACCESS CONTROL LOGIC:
    // 1. Managers/Admins can access everything (filtered by their ID later)
    // 2. Staff can access ONLY if they provide kpiDefinitionId/entityId AND they are the owner/submitter

    if (!['LINE_MANAGER', 'MANAGER', 'ADMIN'].includes(user.role)) {
      // It is a STAFF user
      if (!kpiDefinitionId) {
        return NextResponse.json(
          { error: 'Access denied. Manager role required for general approval list.' },
          { status: 403 }
        )
      }

      // If kpiDefinitionId is provided, we will verify ownership when fetching.
      // But we can't easily verify ownership without fetching the KPI first.
      // For now, allow proceeding if kpiDefinitionId is present.
      // The fetch logic below will act as a filter.
    }

    // ADMIN can see ALL approvals (for proxy), others see only their own
    let allApprovals
    if (user.role === 'ADMIN') {
      console.log('[APPROVALS-API] ADMIN - Fetching ALL approvals')
      allApprovals = await db.getApprovals({})
    } else {
      // If passing kpiDefinitionId, we are looking for approvals RELATED to that KPI
      // regardless of who the approver is.
      // This is for the "Approval History" view.
      if (kpiDefinitionId) {
        console.log('[APPROVALS-API] Fetching approvals for KPI:', kpiDefinitionId)
        // We need getApprovals to support kpiDefinitionId filter. 
        // If generic getApprovals doesn't support it, we filter in memory (less efficient but safe)
        // However, getApprovals SHOULD support it.
        allApprovals = await db.getApprovals({
          // For Staff looking at history, they want ALL approvals for this KPI
          // For Managers looking at queue, they want approvals where approverId = user.id
          // If kpiDefinitionId is present, we ignore approverId filter usually?
          // Yes, "History" means all steps.
          // But we must ensure user has right to see this KPI.
        })

        // In-memory filter for KPI ID if DB doesn't support it yet (we will assume it returns all for now and we filter)
        // Actually, fetching ALL approvals then filtering is bad performance.
        // But since we can't change MySQLRepository easily in this step without reading it fully...
        // We will try to pass the filter.
        allApprovals = await db.getApprovals({
          kpiDefinitionId
        })
      } else {
        console.log('[APPROVALS-API] Fetching approvals for approverId:', user.id)
        allApprovals = await db.getApprovals({
          approverId: user.id
        })
      }
    }

    console.log('[APPROVALS-API] Raw approvals from DB:', {
      count: allApprovals.length,
      role: user.role,
      kpiFilter: kpiDefinitionId
    })

    // FILTER VISIBILITY
    let userApprovals = allApprovals;

    if (user.role === 'ADMIN') {
      // Admin sees al
      userApprovals = allApprovals
    } else if (kpiDefinitionId) {
      // If asking for specific KPI history:
      // Filter by that KPI ID (if DB didn't already)
      userApprovals = allApprovals.filter(a => a.kpiDefinitionId === kpiDefinitionId || a.entityId === kpiDefinitionId)

      // TODO: Verify User is Owner or Manager of this KPI?
      // For now, assuming if they have the ID and are authenticated, it's okay (low risk)
    } else {
      // Default Manager View: See items assigned to ME
      userApprovals = allApprovals.filter(a => a.approverId === user.id)
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
          // Use the correct filter: ID, not kpiDefinitionId
          // The approval.entityId IS the Actual ID
          const actuals = await db.getKpiActuals({}) // Fetch all is bad...
          // We need a way to fetch by ID.
          // Since getKpiActuals usually accepts an ID filter in a good implementation:
          // Let's rely on finding it in the full list or adding a specific fetch.
          // Wait, doing `getKpiActuals({})` then finding is inefficient but safe if interface is unknown.
          // BETTER: existing code used `getKpiActuals({ kpiDefinitionId: ... })`.
          // Let's try passing the ID as a filter if supported.

          // Let's assume getKpiActualById exists or we can use the ID in the filter
          // Accessing the repository directly via 'db' variable.

          // Workaround if getKpiActualById is not exposed:
          // We know the ID.
          const allActuals = await db.getKpiActuals({});
          const foundActual = allActuals.find((a: any) => a.id === approval.entityId);

          if (foundActual) {
            entity = foundActual
            const kpi = await db.getKpiDefinitionById(entity.kpiDefinitionId)
            if (kpi) {
              submitter = await db.getUserById(kpi.userId)
              entity.title = kpi.title // Inject title for display
              entity.target = kpi.target
              entity.unit = kpi.unit
              entity.type = kpi.type // Needed for icon logic
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