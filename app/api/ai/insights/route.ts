// app/api/ai/insights/route.ts
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
    const { performanceData, timeframe = 'current', includeRecommendations = true } = body;

    if (!performanceData || !Array.isArray(performanceData)) {
      return NextResponse.json(
        { error: 'Performance data array is required' },
        { status: 400 }
      );
    }

    // Generate insights
    const insights = await enhancedAIService.generateInsights(performanceData, timeframe);

    // Additional analysis
    const summary = {
      totalKpis: performanceData.length,
      avgPerformance: performanceData.reduce((sum: number, kpi: any) => 
        sum + (kpi.actualValue / kpi.targetValue), 0) / performanceData.length,
      overachievers: performanceData.filter((kpi: any) => 
        kpi.actualValue / kpi.targetValue > 1.2).length,
      underperformers: performanceData.filter((kpi: any) => 
        kpi.actualValue / kpi.targetValue < 0.8).length
    };

    return NextResponse.json({
      success: true,
      data: {
        insights,
        summary,
        generatedAt: new Date().toISOString(),
        userId: user.id,
        timeframe
      }
    });

  } catch (error: any) {
    console.error('AI insights API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate insights',
        details: error.message 
      },
      { status: 500 }
    );
  }
}