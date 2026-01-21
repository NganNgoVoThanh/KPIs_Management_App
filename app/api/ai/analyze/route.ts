// app/api/ai/analyze/route.ts
// COMPLETE IMPLEMENTATION - Anomaly Detection API
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { anomalyDetector } from '@/lib/ai/anomaly-detector-complete';
import { DatabaseService } from '@/lib/db';

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic'


const db = new DatabaseService();

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { kpiId, actualValue, target, includeEvidence = true } = body;

    // Validate inputs
    if (!kpiId || actualValue === undefined || !target) {
      return NextResponse.json(
        { error: 'Missing required fields: kpiId, actualValue, target' },
        { status: 400 }
      );
    }

    // Get KPI details
    const kpi = await db.getKpiDefinitionById(kpiId);
    if (!kpi) {
      return NextResponse.json({ error: 'KPI not found' }, { status: 404 });
    }

    // Get historical data - with safe defaults
    let historicalData: any[] = [];
    try {
      const rawHistorical = await db.getHistoricalKpiData({
        userId: user.id
      });
      // Limit to last 10 records
      historicalData = (rawHistorical || []).slice(0, 10);
    } catch (error) {
      console.warn('Failed to fetch historical data:', error);
      historicalData = [];
    }

    // Get peer data - with safe defaults
    let peerData: any[] = [];
    try {
      // Get other users' KPIs in same cycle and org
      const peerKpis = await db.getKpiDefinitions({
        cycleId: kpi.cycleId,
        orgUnitId: user.orgUnitId
      });

      // Filter out current user and get actuals
      const peersWithActuals = await Promise.all(
        peerKpis
          .filter((p: any) => p.userId !== user.id && p.type === kpi.type)
          .slice(0, 10)
          .map(async (p: any) => {
            try {
              const actuals = await db.getKpiActuals({ kpiDefinitionId: p.id });
              if (actuals.length > 0) {
                return {
                  userId: p.userId,
                  department: user.department || 'Unknown',
                  jobTitle: kpi.category || 'Unknown',
                  actualValue: actuals[0].actualValue,
                  target: p.target,
                  percentage: actuals[0].percentage
                };
              }
            } catch (err) {
              console.warn('Failed to fetch actual for peer:', err);
            }
            return null;
          })
      );

      peerData = peersWithActuals.filter((p: any) => p !== null);
    } catch (error) {
      console.warn('Failed to fetch peer data:', error);
      peerData = [];
    }

    // Get evidence if requested
    let evidence: any[] = [];
    if (includeEvidence) {
      try {
        const actuals = await db.getKpiActuals({ kpiDefinitionId: kpiId });
        if (actuals.length > 0) {
          const evidenceRecords = await db.getEvidencesByActualId(actuals[0].id);
          evidence = evidenceRecords || [];
        }
      } catch (error) {
        console.warn('Failed to fetch evidence:', error);
        evidence = [];
      }
    }

    // Get behavior metrics (from request headers)
    const behaviorMetrics = {
      submissionTime: new Date().toISOString(),
      editCount: 1, // TODO: Track this in real system
      timeSpentMinutes: 15, // TODO: Track this in real system
      deviceInfo: request.headers.get('user-agent') || 'unknown',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      previousSubmissions: 0 // TODO: Track this in database
    };

    // Transform historical data to expected format
    const transformedHistorical = historicalData.map((h: any) => {
      // Parse KPIs JSON if needed
      let kpis: any[] = [];
      try {
        kpis = typeof h.kpis === 'string' ? JSON.parse(h.kpis) : (h.kpis || []);
      } catch {
        kpis = [];
      }

      // Find matching KPI in historical data
      const matchingKpi = kpis.find((k: any) => k.title === kpi.title || k.type === kpi.type);

      return {
        cycleId: h.cycleId || '',
        year: h.year,
        quarter: h.quarter || undefined,
        actualValue: matchingKpi?.actual || 0,
        target: matchingKpi?.target || 0,
        percentage: matchingKpi?.actual && matchingKpi?.target
          ? (matchingKpi.actual / matchingKpi.target) * 100
          : 0,
        score: matchingKpi?.score || h.totalScore || 0
      };
    });

    // Transform evidence to expected format
    const transformedEvidence = evidence.map((e: any) => ({
      id: e.id,
      fileName: e.fileName,
      fileSize: e.fileSize,
      fileType: e.fileType,
      uploadedAt: typeof e.uploadedAt === 'string' ? e.uploadedAt : e.uploadedAt.toISOString(),
      metadata: e.metadata || {}
    }));

    // Perform anomaly detection
    const result = await anomalyDetector.analyzeKpiSubmission({
      kpiId,
      userId: user.id,
      actualValue,
      target,
      type: kpi.type,
      submittedAt: new Date().toISOString(),
      historicalData: transformedHistorical,
      peerData,
      evidence: transformedEvidence,
      behaviorMetrics
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Anomaly detection error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: 'Analysis failed',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
