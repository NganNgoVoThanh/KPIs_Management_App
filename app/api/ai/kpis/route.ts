// ADD AI validation to KPI creation endpoint

import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { enhancedAIService } from '@/lib/ai-services-enhanced';

export async function POST(request: NextRequest) {
  try {
    const user = authService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { kpis, enableAIValidation = true } = await request.json();

    if (!kpis || !Array.isArray(kpis)) {
      return NextResponse.json({ error: 'KPIs array is required' }, { status: 400 });
    }

    let processedKpis = kpis;

    // AI-enhanced processing
    if (enableAIValidation) {
      processedKpis = await Promise.all(kpis.map(async (kpi) => {
        try {
          // SMART validation
          const smartValidation = await enhancedAIService.validateKPISMART({
            title: kpi.title,
            description: kpi.description,
            target: kpi.target,
            unit: kpi.unit,
            measurementMethod: kpi.formula,
            dataSource: kpi.dataSource
          });

          // Anomaly detection for targets
          const anomalies = await enhancedAIService.detectEnhancedAnomalies([{
            id: `temp-${Date.now()}`,
            actualValue: kpi.target,
            targetValue: kpi.target,
            userId: user.id
          }]);

          return {
            ...kpi,
            aiEnhancements: {
              smartScore: smartValidation.score,
              smartFeedback: smartValidation.suggestions,
              riskFactors: anomalies.map(a => a.description),
              validatedAt: new Date().toISOString()
            }
          };
        } catch (aiError) {
          console.error('AI processing failed for KPI:', kpi.title, aiError);
          return { ...kpi, aiEnhancements: null };
        }
      }));
    }

    // Save KPIs (existing logic)
    const savedKpis = processedKpis.map(kpi => {
      // Your existing KPI save logic here
      return { ...kpi, id: `kpi-${Date.now()}`, createdAt: new Date().toISOString() };
    });

    return NextResponse.json({
      success: true,
      kpis: savedKpis,
      aiProcessed: enableAIValidation,
      summary: {
        total: savedKpis.length,
        avgSmartScore: enableAIValidation 
          ? savedKpis.reduce((sum, kpi) => sum + (kpi.aiEnhancements?.smartScore || 0), 0) / savedKpis.length
          : null
      }
    });

  } catch (error: any) {
    console.error('KPI creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create KPIs', details: error.message },
      { status: 500 }
    );
  }
}