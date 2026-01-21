// app/api/cycles/[id]/route.ts - Specific Cycle Operations
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
 * GET /api/cycles/[id]
 * Get cycle by ID with related data
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
    const cycle = await db.getCycleById(id)

    if (!cycle) {
      return NextResponse.json(
        { error: 'Cycle not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: cycle
    })

  } catch (error: any) {
    console.error(`GET /api/cycles/[id] error:`, error)
    return NextResponse.json(
      { error: 'Failed to fetch cycle', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/cycles/[id]
 * Update cycle (Admin only)
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

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can update cycles' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()

    const cycle = await db.getCycleById(id)
    if (!cycle) {
      return NextResponse.json(
        { error: 'Cycle not found' },
        { status: 404 }
      )
    }

    // Don't allow certain fields to be changed
    delete body.id
    delete body.createdBy
    delete body.createdAt

    const updated = await db.updateCycle(id, {
      ...body,
      updatedAt: new Date()
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Cycle updated successfully'
    })

  } catch (error: any) {
    console.error(`PUT /api/cycles/[id] error:`, error)
    return NextResponse.json(
      { error: 'Failed to update cycle', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/cycles/[id]
 * Delete cycle (Admin only, only if no KPIs exist)
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

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can delete cycles' },
        { status: 403 }
      )
    }

    const { id } = await params
    const cycle = await db.getCycleById(id)

    if (!cycle) {
      return NextResponse.json(
        { error: 'Cycle not found' },
        { status: 404 }
      )
    }

    // Check if cycle has KPIs
    if (cycle.kpiDefinitions && cycle.kpiDefinitions.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete cycle with existing KPIs' },
        { status: 400 }
      )
    }

    // Can only delete DRAFT cycles
    if (cycle.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Can only delete cycles in DRAFT status' },
        { status: 400 }
      )
    }

    await db.updateCycle(id, { status: 'DELETED' })

    return NextResponse.json({
      success: true,
      message: 'Cycle deleted successfully'
    })

  } catch (error: any) {
    console.error(`DELETE /api/cycles/[id] error:`, error)
    return NextResponse.json(
      { error: 'Failed to delete cycle', details: error.message },
      { status: 500 }
    )
  }
}
