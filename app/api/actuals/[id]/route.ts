// app/api/actuals/[id]/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-service'
import { db } from '@/lib/db'
import { calculateKpiActualScore } from '@/lib/evaluation-utils'
import type { KpiDefinition } from '@/lib/types'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/actuals/[id]
 * Get specific actual by ID
 */
export async function GET(
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
    const actuals = await db.getKpiActuals({ kpiDefinitionId: id })

    if (actuals.length === 0) {
      return NextResponse.json(
        { error: 'Actual not found' },
        { status: 404 }
      )
    }

    const actual = actuals[0]
    const kpi = await db.getKpiDefinitionById(actual.kpiDefinitionId) as KpiDefinition | null

    if (!kpi) {
      return NextResponse.json(
        { error: 'Associated KPI not found' },
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
        { error: 'Unauthorized to view this actual' },
        { status: 403 }
      )
    }

    // Get evidences
    const evidences = await db.getEvidencesByActualId(actual.id)

    // Get approvals
    const approvals = await db.getApprovals({
      entityId: actual.id,
      entityType: 'ACTUAL'
    })

    return NextResponse.json({
      success: true,
      data: {
        actual,
        kpi,
        evidences,
        approvals
      }
    })

  } catch (error: any) {
    console.error('GET /api/actuals/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch actual', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/actuals/[id]
 * Update actual (only in DRAFT status)
 */
export async function PUT(
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

    const actuals = await db.getKpiActuals({ kpiDefinitionId: id })
    if (actuals.length === 0) {
      return NextResponse.json(
        { error: 'Actual not found' },
        { status: 404 }
      )
    }

    const actual = actuals[0]
    const kpi = await db.getKpiDefinitionById(actual.kpiDefinitionId) as KpiDefinition | null

    if (!kpi) {
      return NextResponse.json(
        { error: 'Associated KPI not found' },
        { status: 404 }
      )
    }

    // Authorization: only owner can edit
    if (kpi.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to edit this actual' },
        { status: 403 }
      )
    }

    // Can only edit in certain statuses
    const editableStatuses = ['DRAFT', 'REJECTED']
    if (!editableStatuses.includes(actual.status)) {
      return NextResponse.json(
        { error: `Cannot edit actual in ${actual.status} status` },
        { status: 400 }
      )
    }

    // Build update object with proper type handling
    const updateData: Record<string, any> = {}

    // Only update fields that are provided
    if (body.actualValue !== undefined && body.actualValue !== null) {
      const { percentage, score } = calculateKpiActualScore(kpi, body.actualValue)
      updateData.actualValue = Number(body.actualValue)
      updateData.percentage = Number(percentage)
      updateData.score = Number(score)
    }

    if (body.selfComment !== undefined) {
      updateData.selfComment = body.selfComment && body.selfComment.trim() !== ''
        ? body.selfComment.trim()
        : null
    }

    if (body.adminNote !== undefined) {
      updateData.adminNote = body.adminNote && body.adminNote.trim() !== ''
        ? body.adminNote.trim()
        : null
    }

    if (body.status !== undefined) {
      updateData.status = body.status
    }

    // Always update timestamp
    updateData.updatedAt = new Date()

    const updated = await db.updateKpiActual(actual.id, updateData)

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Actual updated successfully'
    })

  } catch (error: any) {
    console.error('PUT /api/actuals/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to update actual', details: error.message },
      { status: 500 }
    )
  }
}