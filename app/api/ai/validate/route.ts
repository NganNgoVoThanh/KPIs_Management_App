// app/api/ai/validate/route.ts
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
    const { kpiData, validationType = 'smart' } = body;

    if (!kpiData || !kpiData.title) {
      return NextResponse.json(
        { error: 'KPI data with title is required' },
        { status: 400 }
      );
    }

    let validationResult;

    switch (validationType) {
      case 'smart':
        validationResult = await enhancedAIService.validateKPISMART(kpiData);
        break;
      
      default:
        validationResult = await enhancedAIService.validateKPISMART(kpiData);
    }

    // Log validation for analytics
    console.log(`SMART validation for user ${user.id}:`, {
      kpiTitle: kpiData.title,
      score: validationResult.score,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      data: {
        validation: validationResult,
        validatedAt: new Date().toISOString(),
        userId: user.id,
        kpiTitle: kpiData.title
      }
    });

  } catch (error: any) {
    console.error('AI validation API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to validate KPI',
        details: error.message 
      },
      { status: 500 }
    );
  }
}