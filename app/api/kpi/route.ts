// ===================================================================
// app/api/kpi/route.ts - KPI CRUD API Endpoints
// Enhanced version with full field support
// ===================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-server'
import { DatabaseService } from '@/lib/db'

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic'


const db = new DatabaseService()

/**
 * GET /api/kpi
 * Fetch KPIs with optional filters
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
    const filters: any = {}

    // Apply filters
    if (searchParams.get('cycleId')) filters.cycleId = searchParams.get('cycleId')!
    if (searchParams.get('status')) filters.status = searchParams.get('status')!
    if (searchParams.get('orgUnitId')) filters.orgUnitId = searchParams.get('orgUnitId')!

    // Staff can only see their own KPIs
    if (user.role === 'STAFF') {
      filters.userId = user.id
    } else if (searchParams.get('userId')) {
      filters.userId = searchParams.get('userId')!
    }

    const kpis = await db.getKpiDefinitions(filters)

    return NextResponse.json({
      success: true,
      data: kpis,
      count: kpis.length
    })
  } catch (error: any) {
    console.error('GET /api/kpi error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch KPIs', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/kpi
 * Create multiple KPIs (batch creation)
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

    const body = await request.json()
    const { kpis, cycleId } = body

    // Validation
    if (!kpis || !Array.isArray(kpis) || kpis.length === 0) {
      return NextResponse.json(
        { error: 'KPIs array is required and must not be empty' },
        { status: 400 }
      )
    }

    if (!cycleId) {
      return NextResponse.json(
        { error: 'cycleId is required' },
        { status: 400 }
      )
    }

    // Validate total weight (must be 100%)
    const totalWeight = kpis.reduce((sum: number, k: any) => sum + (parseFloat(k.weight) || 0), 0)
    if (Math.abs(totalWeight - 100) > 0.01) {
      return NextResponse.json(
        { error: `Total weight must equal 100% (currently ${totalWeight.toFixed(2)}%)` },
        { status: 400 }
      )
    }

    // Validate KPI count (3-5 KPIs recommended)
    if (kpis.length < 3 || kpis.length > 5) {
      return NextResponse.json(
        {
          error: `Number of KPIs should be between 3 and 5 (got ${kpis.length})`,
          warning: true
        },
        { status: 400 }
      )
    }

    // Validate individual weights (5-40% each)
    const invalidWeights = kpis.filter((k: any) => {
      const weight = parseFloat(k.weight) || 0
      return weight < 5 || weight > 40
    })
    if (invalidWeights.length > 0) {
      return NextResponse.json(
        { error: 'Each KPI weight must be between 5% and 40%' },
        { status: 400 }
      )
    }

    // Verify cycle exists
    const cycle = await db.getCycleById(cycleId)
    if (!cycle) {
      return NextResponse.json(
        { error: 'Cycle not found' },
        { status: 404 }
      )
    }

    // Check cycle status
    if (cycle.status !== 'ACTIVE' && cycle.status !== 'OPEN') {
      return NextResponse.json(
        { error: `Cannot create KPIs for cycle in ${cycle.status} status` },
        { status: 400 }
      )
    }

    // Fetch real user from database to get correct orgUnitId
    const dbUser = await db.getUserById(user.id)
    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      )
    }

    // Create KPIs
    const created = []
    for (const kpiData of kpis) {
      // Prepare KPI data with all fields from form
      const kpiToCreate = {
        cycleId,
        userId: dbUser.id,
        orgUnitId: dbUser.orgUnitId, // Use orgUnitId from database user
        ownerId: dbUser.id,
        title: kpiData.title?.trim(),
        description: kpiData.description?.trim() || null,
        type: kpiData.type,
        unit: kpiData.unit?.trim(),
        target: parseFloat(kpiData.target) || 0,
        weight: parseFloat(kpiData.weight) || 0,
        formula: kpiData.formula?.trim() || null,
        dataSource: kpiData.dataSource?.trim() || null,
        scoringRules: kpiData.scoringRules || null,

        // Additional fields from enhanced form
        category: kpiData.category || null,
        ogsmAlignment: kpiData.ogsmAlignment?.trim() || null,
        frequency: kpiData.frequency || 'Quarterly',
        priority: kpiData.priority || 'Medium',
        dependencies: kpiData.dependencies?.trim() || null,
        evidenceRequirements: kpiData.evidenceRequirements?.trim() || null,
        startDate: kpiData.startDate ? new Date(kpiData.startDate) : null,
        dueDate: kpiData.dueDate ? new Date(kpiData.dueDate) : null,

        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const kpi = await db.createKpiDefinition(kpiToCreate)
      created.push(kpi)
    }

    // Create notification for user
    await db.createNotification({
      userId: dbUser.id,
      type: 'KPI_CREATED',
      title: 'KPIs Created Successfully',
      message: `You have successfully created ${created.length} KPI(s) for ${cycle.name}`,
      priority: 'MEDIUM',
      status: 'UNREAD',
      actionRequired: false,
      actionUrl: `/kpis`,
      metadata: {
        cycleId,
        cycleName: cycle.name,
        kpiCount: created.length
      },
      createdAt: new Date()
    })

    return NextResponse.json({
      success: true,
      data: created,
      message: `Successfully created ${created.length} KPI(s)`,
      count: created.length
    }, { status: 201 })

  } catch (error: any) {
    console.error('POST /api/kpi error:', error)
    return NextResponse.json(
      { error: 'Failed to create KPIs', details: error.message },
      { status: 500 }
    )
  }
}
