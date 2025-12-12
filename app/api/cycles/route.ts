// app/api/cycles/route.ts - Cycles Management API
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-server'
import { DatabaseService } from '@/lib/db'

const db = new DatabaseService()

/**
 * GET /api/cycles
 * Get all cycles (with optional status filter)
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined

    const cycles = await db.getCycles(status)

    return NextResponse.json({
      success: true,
      data: cycles,
      count: cycles.length
    })
  } catch (error: any) {
    console.error('GET /api/cycles error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cycles', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cycles
 * Create a new cycle (Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only Admin can create cycles
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can create cycles' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, type, periodStart, periodEnd, targetUsers, settings } = body

    // Validation
    if (!name || !type || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, periodStart, periodEnd' },
        { status: 400 }
      )
    }

    const start = new Date(periodStart)
    const end = new Date(periodEnd)

    if (end <= start) {
      return NextResponse.json(
        { error: 'Period end must be after period start' },
        { status: 400 }
      )
    }

    // Create cycle
    const cycle = await db.createCycle({
      name,
      type,
      periodStart: start,
      periodEnd: end,
      status: 'DRAFT',
      createdBy: user.id,
      targetUsers: targetUsers || null,
      settings: settings || null,
    })

    return NextResponse.json({
      success: true,
      data: cycle,
      message: 'Cycle created successfully'
    }, { status: 201 })

  } catch (error: any) {
    console.error('POST /api/cycles error:', error)
    return NextResponse.json(
      { error: 'Failed to create cycle', details: error.message },
      { status: 500 }
    )
  }
}
