// app/api/ai/approval/route.ts
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

    // Check if user has approval permissions
    if (!['LINE_MANAGER', 'HEAD_OF_DEPT', 'BOD', 'HR', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions for approval assistance' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { submissionData, approverContext } = body;

    if (!submissionData) {
      return NextResponse.json(
        { error: 'Submission data is required' },
        { status: 400 }
      );
    }

    // Generate approval recommendation
    const recommendation = await enhancedAIService.generateApprovalRecommendation(
      submissionData,
      {
        ...approverContext,
        approverId: user.id,
        approverRole: user.role,
        approverName: user.name
      }
    );

    // Log approval assistance usage
    console.log(`Approval assistance for user ${user.id}:`, {
      submissionId: submissionData.id,
      decision: recommendation.decision,
      confidence: recommendation.confidence,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      data: {
        recommendation,
        generatedAt: new Date().toISOString(),
        approverId: user.id,
        submissionId: submissionData.id
      }
    });

  } catch (error: any) {
    console.error('AI approval assistance API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate approval recommendation',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
