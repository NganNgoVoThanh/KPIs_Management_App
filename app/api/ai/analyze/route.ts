// app/api/ai/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { enhancedAIService } from '@/lib/ai-services-enhanced';
import { authService } from '@/lib/auth-service';

export async function POST(request: NextRequest) {
  try {
    const user = authService.getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { kpiData, analysisType = 'anomaly', userBehavior } = body;

    if (!kpiData || !Array.isArray(kpiData)) {
      return NextResponse.json(
        { error: 'KPI data array is required' },
        { status: 400 }
      );
    }

    let analysisResult;

    switch (analysisType) {
      case 'anomaly':
        analysisResult = await enhancedAIService.detectAnomalies(
          kpiData,
          userBehavior
        );
        break;
      
      case 'insights':
        analysisResult = await enhancedAIService.generateInsights(
          kpiData,
          body.timeframe
        );
        break;
      
      default:
        analysisResult = await enhancedAIService.detectAnomalies(
          kpiData,
          userBehavior
        );
    }

    // Log analysis for monitoring
    console.log(`AI analysis for user ${user.id}:`, {
      analysisType,
      kpiCount: kpiData.length,
      resultCount: Array.isArray(analysisResult) ? analysisResult.length : 1,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      data: {
        analysis: analysisResult,
        analyzedAt: new Date().toISOString(),
        userId: user.id,
        analysisType,
        summary: {
          totalKpis: kpiData.length,
          analysisCount: Array.isArray(analysisResult) ? analysisResult.length : 1
        }
      }
    });

  } catch (error: any) {
    console.error('AI analysis API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze KPI data',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
