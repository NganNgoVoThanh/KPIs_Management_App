// app/api/ai/suggestions/route.ts - UPDATED
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { SmartKpiSuggestionService } from '@/lib/ai/kpi-suggestion-service';
import { DatabaseService } from '@/lib/db';

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
    const result = await suggestionService.generateSmartKpiSuggestions({
      user: user as any, // Cast to User type from types.ts
      orgUnit: orgUnit as any, // Cast to OrgUnit type
      cycleYear,
      historicalData: historicalData as any[],
      peerBenchmarks: [] // Empty for now
    });

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