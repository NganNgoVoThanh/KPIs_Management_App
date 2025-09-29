// app/api/ai/suggestions/route.ts - FIXED ALL ERRORS
import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-service'
import { db } from '@/lib/db'

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
    const { cycleId, includeHistorical = true, includeOGSM = true } = body

    // Get cycle info
    const cycle = await db.getCycleById(cycleId)
    if (!cycle) {
      return NextResponse.json(
        { error: 'Cycle not found' },
        { status: 404 }
      )
    }

    // Get user's org unit with explicit type
    const orgUnits: any[] = await db.getOrgUnits()
    const orgUnit = orgUnits.find((o: any) => o.id === user.orgUnitId)
    if (!orgUnit) {
      return NextResponse.json(
        { error: 'Organization unit not found' },
        { status: 404 }
      )
    }

    // Initialize variables with proper types
    let historicalData: any[] = []
    let ogsmDocuments: any[] = []

    // Get historical data if enabled
    if (includeHistorical) {
      const cycleYear = new Date(cycle.periodStart).getFullYear()
      historicalData = await db.getHistoricalKpiData({
        userId: user.id,
        year: cycleYear - 1
      })
    }

    // Get OGSM documents if enabled
    if (includeOGSM) {
      ogsmDocuments = await db.getCompanyDocuments({
        type: 'OGSM',
        aiIndexed: true,
        department: user.department
      })
    }

    // Generate suggestions - Using mock data for now
    const cycleYear = new Date(cycle.periodStart).getFullYear()
    const cycleQuarter = Math.floor(new Date(cycle.periodStart).getMonth() / 3) + 1

    // Mock suggestions response (replace with actual AI service when available)
    const suggestions = [
      {
        id: `hist-${Date.now()}`,
        title: "Giảm NCR nội bộ",
        description: "Số lượng NCR phát sinh trong nội bộ",
        type: "QUANT_LOWER_BETTER" as const,
        unit: "cases",
        suggestedTarget: 10,
        targetRange: { min: 8, max: 12, recommended: 10 },
        weight: 25,
        rationale: "Dựa trên hiệu suất lịch sử của bạn",
        dataSource: "eQMS System",
        smartScore: 85,
        confidenceLevel: 92,
        basedOnHistorical: historicalData.length > 0,
        historicalPerformance: historicalData.length > 0 ? {
          previousTarget: 12,
          previousActual: 10,
          previousScore: 4,
          trend: "improving" as const
        } : undefined,
        aiInsights: [
          "Historical trend: improving",
          "Consistency score: 85/100",
          "Recommended to decrease target by 15%"
        ]
      },
      {
        id: `ogsm-${Date.now()}`,
        title: "Phát triển sản phẩm mới",
        description: "Số lượng sản phẩm mới được thương mại hóa",
        type: "QUANT_HIGHER_BETTER" as const,
        unit: "products",
        suggestedTarget: 3,
        targetRange: { min: 2, max: 5, recommended: 3 },
        weight: 30,
        rationale: "Phù hợp với chiến lược OGSM của công ty",
        dataSource: "Innovation Portal",
        smartScore: 90,
        confidenceLevel: 85,
        basedOnHistorical: false,
        aiInsights: [
          "Aligned with company OGSM objectives",
          "Critical for R&D department success",
          "Recommended by AI based on strategic priorities"
        ]
      }
    ]

    const summary = {
      totalSuggestions: suggestions.length,
      basedOnHistorical: suggestions.filter((s: any) => s.basedOnHistorical).length,
      basedOnOGSM: suggestions.filter((s: any) => s.aiInsights.some((i: string) => i.includes('OGSM'))).length,
      avgConfidence: suggestions.reduce((sum: number, s: any) => sum + s.confidenceLevel, 0) / suggestions.length,
      recommendedKpis: suggestions.map((s: any) => s.title)
    }

    // Log AI usage for analytics
    console.log(`AI KPI suggestions generated for user ${user.id}:`, {
      totalSuggestions: summary.totalSuggestions,
      basedOnHistorical: summary.basedOnHistorical,
      avgConfidence: summary.avgConfidence,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      data: {
        suggestions,
        summary,
        context: {
          userId: user.id,
          userName: user.name,
          department: user.department,
          cycleId: cycle.id,
          cycleName: cycle.name,
          hasHistoricalData: historicalData.length > 0,
          hasOGSMDocs: ogsmDocuments.length > 0
        },
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('AI suggestions API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to generate KPI suggestions',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = authService.getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's historical data summary
    const historicalData = await db.getHistoricalKpiData({ userId: user.id })
    
    return NextResponse.json({
      success: true,
      data: {
        hasHistoricalData: historicalData.length > 0,
        historicalRecords: historicalData.length,
        years: Array.from(new Set(historicalData.map((h: any) => h.year))),
        avgScore: historicalData.length > 0
          ? historicalData.reduce((sum: number, h: any) => sum + h.totalScore, 0) / historicalData.length
          : 0,
        lastPerformanceRating: historicalData.length > 0
          ? historicalData[0].performanceRating
          : 'N/A'
      }
    })

  } catch (error: any) {
    console.error('Historical data API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve historical data',
        details: error.message 
      },
      { status: 500 }
    )
  }
}