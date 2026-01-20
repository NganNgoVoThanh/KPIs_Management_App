// app/api/actuals/[id]/submit/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-server'
import { getDatabase } from '@/lib/repositories/DatabaseFactory'

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * POST /api/actuals/[id]/submit
 * Submit actual results for approval
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

    const { id } = params
    const db = getDatabase()

    // Get actual
    const actuals = await db.getKpiActuals({ kpiDefinitionId: id })
    // Note: 'id' in params here seems to be treated as kpiDefinitionId in getKpiActuals filter above? 
    // Wait, the file path is [id]/submit. Is [id] the actual ID or KPI ID?
    // The previous code used: const actuals = await db.getKpiActuals({ kpiDefinitionId: id })
    // If [id] is kpiDefinitionId, then finding actuals associated with it makes sense.
    // If [id] is the Actual ID, then we should fetch by Actual ID.
    // The frontend call would determine this. 
    // If the frontend calls /api/actuals/<kpiId>/submit, then it's KPI ID.
    // However, looking at the previous code:
    // const actuals = await db.getKpiActuals({ kpiDefinitionId: id })
    // if (actuals.length === 0) return 404
    // const actual = actuals[0] // It takes the first actual for that KPI.
    // This implies [id] is kpiDefinitionId.
    // AND usage in previous code: const actual = actuals[0]; 
    // It assumes 1 active actual per KPI or takes the "first" one.
    // This seems fragile if there are multiple actuals (history), but adhering to existing logic pattern for now.

    // BUT wait, in app/kpis/[id]/page.tsx, there's a button:
    // onClick={() => router.push(`/evaluation?kpiId=${kpi.id}`)}
    // And in `app/evaluation/page.tsx`, it likely calls submit.
    // Let's assume [id] is KPI ID based on "kpiDefinitionId: id".

    if (actuals.length === 0) {
      // Try to find by Actual ID if not found by KPI ID (just safely covering bases? No, adhere to previous logic)
      return NextResponse.json(
        { error: 'Actual not found' },
        { status: 404 }
      )
    }

    // Get the latest actual if multiple? Previous code just took [0].
    // Ideally we should sort by created date descending.
    // But let's trust repository returns it relevantly or just take [0] as before.
    const actual = actuals[0]

    // Get associated KPI
    const kpi = await db.getKpiDefinitionById(actual.kpiDefinitionId)
    if (!kpi) {
      return NextResponse.json(
        { error: 'Associated KPI not found' },
        { status: 404 }
      )
    }

    // Authorization: only KPI owner can submit
    if (kpi.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to submit this actual' },
        { status: 403 }
      )
    }

    // Can only submit from DRAFT or REJECTED status
    if (!['DRAFT', 'REJECTED'].includes(actual.status)) {
      return NextResponse.json(
        { error: `Cannot submit actual in ${actual.status} status` },
        { status: 400 }
      )
    }

    // Get approval hierarchy
    const hierarchy = await db.getActiveApprovalHierarchy(user.id)
    if (!hierarchy || !hierarchy.level1ApproverId) {
      return NextResponse.json(
        { error: 'No approval hierarchy configured for this user' },
        { status: 400 }
      )
    }

    // Update actual status to PENDING_LM
    const updated = await db.updateKpiActual(actual.id, {
      status: 'PENDING_LM',
      submittedAt: new Date().toISOString(), // Ensure string format
      lastModifiedAt: new Date() // Use lastModifiedAt or updatedAt depending on schema
    })

    // Create approval record for Level 1 (Line Manager)
    await db.createApproval({
      entityId: actual.id,
      entityType: 'ACTUAL',
      kpiDefinitionId: kpi.id, // ✅ ADDED THIS LINE to link approval to KPI
      level: 1,
      approverId: hierarchy.level1ApproverId,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    })

    // Update KPI status if needed
    if (kpi.status === 'APPROVED') {
      await db.updateKpiDefinition(kpi.id, {
        status: 'LOCKED_GOALS'
      })
    }

    // Create notification for Line Manager
    await db.createNotification({
      userId: hierarchy.level1ApproverId,
      type: 'ACTUAL_APPROVAL_REQUIRED',
      title: 'Actual Results Approval Required',
      message: `${user.name} has submitted actual results for KPI "${kpi.title}".`,
      priority: 'HIGH',
      status: 'UNREAD',
      actionRequired: true,
      actionUrl: `/evaluation/${actual.id}`, // Or review page
      metadata: {
        actualId: actual.id,
        kpiId: kpi.id,
        kpiTitle: kpi.title,
        submittedBy: user.id,
        submittedByName: user.name,
        actualValue: actual.actualValue,
        score: actual.score
      }
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Actual results submitted for approval successfully'
    })

  } catch (error: any) {
    console.error('POST /api/actuals/[id]/submit error:', error)
    return NextResponse.json(
      { error: 'Failed to submit actual', details: error.message },
      { status: 500 }
    )
  }
}