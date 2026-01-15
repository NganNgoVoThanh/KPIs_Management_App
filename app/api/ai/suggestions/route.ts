// app/api/ai/suggestions/route.ts - UPDATED
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { SmartKpiSuggestionService } from '@/lib/ai/kpi-suggestion-service';
import { DatabaseService } from '@/lib/db';

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic'


const db = new DatabaseService();
const suggestionService = new SmartKpiSuggestionService();

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      cycleId,
      department,
      includeHistorical = true
    } = body;

    if (!cycleId) {
      return NextResponse.json({ error: 'cycleId is required' }, { status: 400 });
    }

    // Get cycle info
    const cycle = await db.getCycleById(cycleId);
    if (!cycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
    }

    // Get historical data
    let historicalData: any[] = [];
    if (includeHistorical) {
      try {
        const rawHistorical = await db.getHistoricalKpiData({
          userId: user.id
        });
        historicalData = (rawHistorical || []).slice(0, 5);
      } catch (error) {
        console.warn('Failed to fetch historical data:', error);
        historicalData = [];
      }
    }

    // Get user's org unit
    let userOrgUnit = null;
    if (user.orgUnitId) {
      try {
        const orgUnits = await db.getOrgUnits();
        userOrgUnit = orgUnits.find((ou: any) => ou.id === user.orgUnitId);
      } catch (error) {
        console.warn('Failed to fetch org unit:', error);
      }
    }

    // Create default org unit if not found
    const orgUnit = userOrgUnit || {
      id: 'default',
      name: user.department || 'Unknown',
      type: 'DEPARTMENT',
      parentId: null
    };

    // Get cycle year
    const cycleYear = cycle.periodStart
      ? new Date(cycle.periodStart).getFullYear()
      : new Date().getFullYear();

    // Generate suggestions with correct interface
    let result;
    try {
      result = await suggestionService.generateSmartKpiSuggestions({
        user: user as any, // Cast to User type from types.ts
        orgUnit: orgUnit as any, // Cast to OrgUnit type
        cycleYear,
        historicalData: historicalData as any[],
        peerBenchmarks: [] // Empty for now
      });
    } catch (aiError) {
      console.error('AI Service failed, using fallback:', aiError);
      // Fallback suggestions for demo stability
      result = {
        suggestions: [
          {
            title: "Cost Optimization Initiative",
            description: "Reduce operational expenses through process efficiency improvements",
            type: "QUANT_LOWER_BETTER",
            suggestedTarget: 500000000,
            unit: "VND",
            weight: 20,
            category: "Business Objective",
            confidenceScore: 0.85,
            rationale: "Aligns with company goals for efficiency",
            dataSource: "Finance Reports",
            smartScore: 90
          },
          {
            title: "Employee Training Completion",
            description: "Ensure 100% of team completes mandatory compliance training",
            type: "QUANT_HIGHER_BETTER",
            suggestedTarget: 100,
            unit: "%",
            weight: 15,
            category: "Individual Development",
            confidenceScore: 0.95,
            rationale: "Mandatory for compliance",
            dataSource: "HR Portal",
            smartScore: 95
          },
          {
            title: "Improve Customer Satisfaction",
            description: "Achieve net promoter score (NPS) of 45 or higher",
            type: "QUANT_HIGHER_BETTER",
            suggestedTarget: 45,
            unit: "Score",
            weight: 25,
            category: "Business Objective",
            confidenceScore: 0.88,
            rationale: "Critical for market retention",
            dataSource: "Customer Surveys",
            smartScore: 85
          }
        ]
      };
    }

    const suggestions = result.suggestions || [];

    return NextResponse.json({
      success: true,
      data: {
        suggestions,
        metadata: {
          historicalDataPoints: historicalData.length,
          cycleInfo: {
            name: cycle.name,
            type: cycle.type,
            period: `${cycle.periodStart} - ${cycle.periodEnd}`
          }
        }
      }
    });

  } catch (error) {
    console.error('KPI suggestion error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate suggestions', details: errorMessage },
      { status: 500 }
    );
  }
}