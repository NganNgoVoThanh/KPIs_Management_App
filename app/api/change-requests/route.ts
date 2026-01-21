import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-server'
import { getDatabase } from '@/lib/repositories/DatabaseFactory'

export const dynamic = 'force-dynamic'

// POST - Create a new change request
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Auth required' }, { status: 401 })
    }

    // Only ADMIN can create change requests
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only administrators can create change requests' }, { status: 403 })
    }

    const body = await request.json()
    const { kpiDefinitionId, changeType, reason, requesterType } = body

    if (!kpiDefinitionId || !changeType || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const db = getDatabase()

    // Get the KPI
    const kpi = await db.getKpiDefinitionById(kpiDefinitionId)
    if (!kpi) {
      return NextResponse.json({ error: 'KPI not found' }, { status: 404 })
    }

    // Check if KPI is APPROVED
    if (kpi.status !== 'APPROVED') {
      return NextResponse.json({
        error: 'Only APPROVED KPIs can have change requests'
      }, { status: 400 })
    }

    console.log('[CHANGE-REQUEST] Creating change request:', {
      kpiId: kpiDefinitionId,
      kpiTitle: kpi.title,
      kpiOwner: kpi.user?.email,
      changeType,
      requestedBy: user.email,
      requesterRole: user.role
    })

    // Create the change request
    const changeRequest = await db.createChangeRequest({
      kpiDefinitionId,
      requesterId: user.id,
      requesterType: requesterType || 'ADMIN',
      changeType,
      currentValues: {}, // Will be populated by frontend if needed
      proposedValues: {}, // Will be populated by frontend if needed
      reason,
      status: 'PENDING',
      requiresApproval: false, // User just needs to update, no approval needed
      createdAt: new Date()
    })

    console.log('[CHANGE-REQUEST] Change request created:', {
      id: changeRequest.id,
      status: changeRequest.status
    })

    // Update KPI status to CHANGE_REQUESTED
    await db.updateKpiDefinition(kpiDefinitionId, {
      status: 'CHANGE_REQUESTED',
      changeRequestReason: reason
    })

    console.log('[CHANGE-REQUEST] KPI status updated to CHANGE_REQUESTED')

    // Notify the KPI owner
    await db.createNotification({
      userId: kpi.userId,
      type: 'CHANGE_REQUEST',
      title: 'Change Request for Your KPI',
      message: `Admin has requested changes to your KPI: "${kpi.title}". Change type: ${changeType}. Reason: ${reason}`,
      priority: 'HIGH',
      status: 'UNREAD',
      actionRequired: true,
      actionUrl: `/kpis/${kpiDefinitionId}`,
      createdAt: new Date()
    })

    console.log('[CHANGE-REQUEST] Notification sent to KPI owner:', kpi.user?.email)

    return NextResponse.json({
      success: true,
      message: 'Change request created successfully',
      data: changeRequest
    })

  } catch (error: any) {
    console.error('[CHANGE-REQUEST-ERROR]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET - Get change requests (for a specific KPI or all)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Auth required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const kpiDefinitionId = searchParams.get('kpiDefinitionId')

    const db = getDatabase()

    let changeRequests = []

    if (kpiDefinitionId) {
      // Get change requests for a specific KPI
      changeRequests = await db.getChangeRequests({ kpiDefinitionId })
    } else if (user.role === 'ADMIN') {
      // Admin can see all change requests
      changeRequests = await db.getChangeRequests({})
    } else {
      // Users can only see change requests for their own KPIs
      changeRequests = await db.getChangeRequests({ userId: user.id })
    }

    return NextResponse.json({
      success: true,
      data: changeRequests
    })

  } catch (error: any) {
    console.error('[CHANGE-REQUEST-GET-ERROR]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
