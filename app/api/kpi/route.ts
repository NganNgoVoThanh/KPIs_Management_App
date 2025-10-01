// app/api/kpis/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-service'
import { db } from '@/lib/db'

/**
 * GET /api/kpis
 * Get KPIs with filters
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

    const { searchParams } = new URL(request.url)
    const cycleId = searchParams.get('cycleId') || undefined
    const userId = searchParams.get('userId') || undefined
    const status = searchParams.get('status') || undefined
    const orgUnitId = searchParams.get('orgUnitId') || undefined

    // Build filters
    const filters: any = {}
    
    if (cycleId) filters.cycleId = cycleId
    if (status) filters.status = status
    if (orgUnitId) filters.orgUnitId = orgUnitId

    // Apply user filter based on role
    if (['STAFF'].includes(user.role)) {
      filters.userId = user.id
    } else if (userId) {
      filters.userId = userId
    } else if (['LINE_MANAGER', 'HEAD_OF_DEPT', 'BOD'].includes(user.role)) {
      filters.userId = userId || user.id
    }

    const kpis = await db.getKpiDefinitions(filters)

    return NextResponse.json({
      success: true,
      data: kpis,
      count: kpis.length
    })

  } catch (error: any) {
    console.error('GET /api/kpis error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch KPIs', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/kpis
 * Create new KPI(s)
 */
export async function POST(request: NextRequest) {
  try {
    const user = authService.getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { kpis } = body

    if (!kpis || !Array.isArray(kpis) || kpis.length === 0) {
      return NextResponse.json(
        { error: 'KPIs array is required' },
        { status: 400 }
      )
    }

    // Validation: Check total weight = 100%
    const totalWeight = kpis.reduce((sum: number, kpi: any) => sum + (kpi.weight || 0), 0)
    if (Math.abs(totalWeight - 100) > 0.01) {
      return NextResponse.json(
        { error: `Total weight must equal 100% (current: ${totalWeight}%)` },
        { status: 400 }
      )
    }

    // Validation: Check KPI count (3-5)
    if (kpis.length < 3 || kpis.length > 5) {
      return NextResponse.json(
        { error: 'Must have between 3 and 5 KPIs' },
        { status: 400 }
      )
    }

    // Validation: Check individual weights (5-40%)
    for (const kpi of kpis) {
      if (kpi.weight < 5 || kpi.weight > 40) {
        return NextResponse.json(
          { error: `Each KPI weight must be between 5% and 40% (${kpi.title}: ${kpi.weight}%)` },
          { status: 400 }
        )
      }
    }

    // Create KPIs
    const createdKpis: any[] = []
    
    for (const kpiData of kpis) {
      // ✅ FIX: Convert undefined to null explicitly
      const kpiRecord: any = {
        cycleId: kpiData.cycleId,
        userId: user.id,
        orgUnitId: user.orgUnitId || 'default-org-unit',
        title: kpiData.title,
        description: kpiData.description ? kpiData.description : null, // ✅ Fixed
        type: kpiData.type,
        unit: kpiData.unit,
        target: kpiData.target,
        weight: kpiData.weight,
        formula: kpiData.formula ? kpiData.formula : null, // ✅ Fixed
        dataSource: kpiData.dataSource ? kpiData.dataSource : null, // ✅ Fixed
        ownerId: user.id,
        contributors: kpiData.contributors || [],
        status: kpiData.status || 'DRAFT',
        category: kpiData.category ? kpiData.category : null, // ✅ Fixed
        frequency: kpiData.frequency ? kpiData.frequency : null, // ✅ Fixed
        priority: kpiData.priority ? kpiData.priority : null, // ✅ Fixed
        ogsmAlignment: kpiData.ogsmAlignment ? kpiData.ogsmAlignment : null, // ✅ Fixed
        evidenceRequirements: kpiData.evidenceRequirements ? kpiData.evidenceRequirements : null, // ✅ Fixed
        dependencies: kpiData.dependencies || [],
        smartScore: kpiData.smartScore !== undefined ? kpiData.smartScore : null, // ✅ Fixed
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const created = await db.createKpiDefinition(kpiRecord)
      createdKpis.push(created)
    }

    // Create notification for manager if submitted
    if (kpis[0]?.status === 'SUBMITTED' && user.managerId) {
      await db.createNotification({
        userId: user.managerId,
        type: 'APPROVAL_REQUIRED',
        title: 'New KPI Approval Request',
        message: `${user.name} has submitted ${createdKpis.length} KPIs for your approval.`,
        priority: 'HIGH',
        status: 'UNREAD',
        actionRequired: true,
        actionUrl: '/approvals',
        createdAt: new Date()
      })
    }

    return NextResponse.json({
      success: true,
      data: createdKpis,
      message: `${createdKpis.length} KPIs created successfully`
    }, { status: 201 })

  } catch (error: any) {
    console.error('POST /api/kpis error:', error)
    return NextResponse.json(
      { error: 'Failed to create KPIs', details: error.message },
      { status: 500 }
    )
  }
}