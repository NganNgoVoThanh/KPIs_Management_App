// app/api/kpi/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-server'
import { DatabaseService } from '@/lib/db'

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic'


const db = new DatabaseService()

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/kpi/[id]
 * Get specific KPI by ID
 */
export async function GET(
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

    const { id } = await params
    const kpi = await db.getKpiDefinitionById(id)

    if (!kpi) {
      return NextResponse.json(
        { error: 'KPI not found' },
        { status: 404 }
      )
    }

    // Authorization check
    const canView = (
      kpi.userId === user.id ||
      ['ADMIN', 'LINE_MANAGER', 'MANAGER'].includes(user.role)
    )

    if (!canView) {
      return NextResponse.json(
        { error: 'Unauthorized to view this KPI' },
        { status: 403 }
      )
    }

    // Simply return KPI data
    // Detail page will load approvals separately if needed
    return NextResponse.json({
      success: true,
      data: kpi
    })

  } catch (error: any) {
    console.error(`GET /api/kpis/${params} error:`, error)
    return NextResponse.json(
      { error: 'Failed to fetch KPI', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/kpi/[id]
 * Update KPI
 */
export async function PUT(
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

    const { id } = await params
    const body = await request.json()

    const kpi = await db.getKpiDefinitionById(id)
    if (!kpi) {
      return NextResponse.json(
        { error: 'KPI not found' },
        { status: 404 }
      )
    }

    // Authorization: only owner can edit, and only in certain statuses
    if (kpi.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to edit this KPI' },
        { status: 403 }
      )
    }

    const editableStatuses = ['DRAFT', 'REJECTED', 'CHANGE_REQUESTED']
    if (!editableStatuses.includes(kpi.status)) {
      return NextResponse.json(
        { error: `Cannot edit KPI in ${kpi.status} status` },
        { status: 400 }
      )
    }

    // Update KPI
    const updateData: any = {
      ...body,
      updatedAt: new Date()
    }

    // Don't allow changing certain fields
    delete updateData.id
    delete updateData.userId
    delete updateData.cycleId
    delete updateData.createdAt
    delete updateData.approvals

    // Sanitize date fields - convert to proper DateTime or null
    const dateFields = ['startDate', 'dueDate', 'submittedAt', 'approvedAt', 'rejectedAt', 'lockedAt', 'approvedAtLevel1', 'approvedAtLevel2', 'changeRequestedAt']
    dateFields.forEach(field => {
      if (updateData[field] === '' || updateData[field] === null || updateData[field] === undefined) {
        updateData[field] = null
      } else if (updateData[field] && typeof updateData[field] === 'string') {
        // Convert date string to DateTime object
        const date = new Date(updateData[field])
        if (isNaN(date.getTime())) {
          updateData[field] = null
        } else {
          // Convert to ISO DateTime string for Prisma
          updateData[field] = date.toISOString()
        }
      } else if (updateData[field] instanceof Date) {
        // Already a Date object, convert to ISO string
        updateData[field] = updateData[field].toISOString()
      }
    })

    const updated = await db.updateKpiDefinition(id, updateData)

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'KPI updated successfully'
    })

  } catch (error: any) {
    console.error(`PUT /api/kpis/${params} error:`, error)
    return NextResponse.json(
      { error: 'Failed to update KPI', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/kpi/[id]
 * Delete KPI (only in DRAFT status)
 */
export async function DELETE(
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

    const { id } = await params
    const kpi = await db.getKpiDefinitionById(id)

    if (!kpi) {
      return NextResponse.json(
        { error: 'KPI not found' },
        { status: 404 }
      )
    }

    // Authorization
    if (kpi.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized to delete this KPI' },
        { status: 403 }
      )
    }

    // Can only delete draft KPIs
    if (kpi.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Can only delete KPIs in DRAFT status' },
        { status: 400 }
      )
    }

    await db.deleteKpiDefinition(id)

    return NextResponse.json({
      success: true,
      message: 'KPI deleted successfully'
    })

  } catch (error: any) {
    console.error(`DELETE /api/kpis/${params} error:`, error)
    return NextResponse.json(
      { error: 'Failed to delete KPI', details: error.message },
      { status: 500 }
    )
  }
}