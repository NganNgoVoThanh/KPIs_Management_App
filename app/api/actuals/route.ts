// app/api/actuals/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-service'
import { db } from '@/lib/db'
import { calculateKpiActualScore } from '@/lib/evaluation-utils'
import type { KpiDefinition } from '@/lib/types'

/**
 * GET /api/actuals
 * Get actuals with filters
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
    const kpiDefinitionId = searchParams.get('kpiDefinitionId') || undefined
    const status = searchParams.get('status') || undefined
    const userId = searchParams.get('userId') || undefined

    // Build filters
    const filters: any = {}
    if (kpiDefinitionId) filters.kpiDefinitionId = kpiDefinitionId
    if (status) filters.status = status

    // Authorization: staff can only see their own
    let actuals = await db.getKpiActuals(filters)

    if (user.role === 'STAFF') {
      const userKpiIds = (await db.getKpiDefinitions({ userId: user.id })).map(k => k.id)
      actuals = actuals.filter(a => userKpiIds.includes(a.kpiDefinitionId))
    } else if (userId) {
      const userKpiIds = (await db.getKpiDefinitions({ userId })).map(k => k.id)
      actuals = actuals.filter(a => userKpiIds.includes(a.kpiDefinitionId))
    }

    // Enrich with KPI data
    const enrichedActuals = await Promise.all(
      actuals.map(async (actual) => {
        const kpi = await db.getKpiDefinitionById(actual.kpiDefinitionId)
        return {
          ...actual,
          kpi
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: enrichedActuals,
      count: enrichedActuals.length
    })

  } catch (error: any) {
    console.error('GET /api/actuals error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch actuals', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/actuals
 * Create actual result for KPI
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
    const { kpiDefinitionId, actualValue, selfComment, evidenceFiles } = body

    if (!kpiDefinitionId || actualValue === undefined) {
      return NextResponse.json(
        { error: 'KPI ID and actual value are required' },
        { status: 400 }
      )
    }

    // Get KPI definition
    const kpi = await db.getKpiDefinitionById(kpiDefinitionId) as KpiDefinition | null
    if (!kpi) {
      return NextResponse.json(
        { error: 'KPI not found' },
        { status: 404 }
      )
    }

    // Authorization: only KPI owner can submit actuals
    if (kpi.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to submit actuals for this KPI' },
        { status: 403 }
      )
    }

    // KPI must be approved before submitting actuals
    if (kpi.status !== 'APPROVED' && kpi.status !== 'LOCKED_GOALS') {
      return NextResponse.json(
        { error: 'Can only submit actuals for approved KPIs' },
        { status: 400 }
      )
    }

    // Check if actual already exists
    const existingActuals = await db.getKpiActuals({ kpiDefinitionId })
    if (existingActuals.length > 0 && existingActuals[0].status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Actual already submitted for this KPI' },
        { status: 400 }
      )
    }

    // Calculate score
    const { percentage, score } = calculateKpiActualScore(kpi, actualValue)

    // Proper type handling for Prisma
    const actualData = {
      kpiDefinitionId,
      actualValue: Number(actualValue),
      percentage: Number(percentage),
      score: Number(score),
      selfComment: selfComment && selfComment.trim() !== '' ? selfComment.trim() : null,
      status: 'DRAFT' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Create or update actual
    let actual: any
    if (existingActuals.length > 0) {
      // Update existing draft
      const updateData = {
        actualValue: Number(actualValue),
        percentage: Number(percentage),
        score: Number(score),
        selfComment: selfComment && selfComment.trim() !== '' ? selfComment.trim() : null,
        updatedAt: new Date()
      }
      actual = await db.updateKpiActual(existingActuals[0].id, updateData)
    } else {
      // Create new actual
      actual = await db.createKpiActual(actualData)
    }

    // Handle evidence files if provided
    if (evidenceFiles && Array.isArray(evidenceFiles) && evidenceFiles.length > 0) {
      for (const file of evidenceFiles) {
        const evidenceData = {
          actualId: actual.id,
          fileName: file.fileName || 'unnamed',
          fileSize: Number(file.fileSize) || 0,
          fileType: file.fileType || 'unknown',
          storageUrl: file.storageUrl && file.storageUrl.trim() !== '' ? file.storageUrl.trim() : null,
          uploadedBy: user.id,
          uploadedAt: new Date(),
          description: file.description && file.description.trim() !== '' ? file.description.trim() : null
        }
        await db.createEvidence(evidenceData)
      }
    }

    return NextResponse.json({
      success: true,
      data: actual,
      message: 'Actual result saved successfully'
    }, { status: 201 })

  } catch (error: any) {
    console.error('POST /api/actuals error:', error)
    return NextResponse.json(
      { error: 'Failed to save actual', details: error.message },
      { status: 500 }
    )
  }
}