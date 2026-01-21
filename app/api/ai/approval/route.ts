// app/api/ai/approval/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { ApprovalAssistanceService } from '@/lib/ai/approval-assistance-service';
import { DatabaseService } from '@/lib/db';

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic'


const db = new DatabaseService();
const approvalService = new ApprovalAssistanceService();

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers can get approval recommendations
    if (user.role !== 'LINE_MANAGER' && user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only managers can access approval assistance' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { submissionId, submissionType, kpiIds } = body;

    if (!submissionId || !submissionType || !kpiIds || kpiIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get KPI definitions
    const kpiDefinitions = await Promise.all(
      kpiIds.map((id: string) => db.getKpiDefinitionById(id))
    );

    const validKpis = kpiDefinitions.filter(k => k !== null);

    if (validKpis.length === 0) {
      return NextResponse.json({ error: 'No valid KPIs found' }, { status: 404 });
    }

    // Get employee info
    const employee = await db.getUserById(validKpis[0].userId);
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Build context for AI analysis
    const context = {
      submission: {
        id: submissionId,
        kpiDefinitions: validKpis,
        submittedAt: new Date().toISOString(),
        submissionType,
        totalWeight: validKpis.reduce((sum, k) => sum + k.weight, 0),
        evidenceFiles: [],
        employeeComments: '',
        previousVersions: []
      },
      employee: {
        id: employee.id,
        name: employee.name,
        jobTitle: employee.department || 'Unknown',
        department: employee.department || 'Unknown',
        experienceLevel: 'Mid-level' as const,
        performanceHistory: [],
        competencyLevel: 7,
        riskProfile: 'Low' as const
      },
      approver: {
        id: user.id,
        name: user.name,
        role: user.role as 'LINE_MANAGER' | 'MANAGER',
        approvalLevel: (user.role === 'LINE_MANAGER' ? 1 : 2) as 1 | 2,
        experience: 5,
        strictnessLevel: 5,
        approvalPatterns: []
      },
      historicalData: [],
      peerBenchmarks: [],
      departmentContext: {
        name: employee.department || 'Unknown',
        averageKpiCount: 8,
        typicalWeightDistribution: {},
        seasonalFactors: {},
        budgetConstraints: [],
        strategicPriorities: []
      }
    };

    // Get AI recommendation
    const recommendation = await approvalService.generateApprovalRecommendation(context);

    return NextResponse.json({
      success: true,
      data: recommendation
    });

  } catch (error) {
    console.error('Approval assistance error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate recommendation', details: errorMessage },
      { status: 500 }
    );
  }
}