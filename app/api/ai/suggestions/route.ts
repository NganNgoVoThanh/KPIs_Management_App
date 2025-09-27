// app/api/ai/suggestions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { enhancedAIService } from '@/lib/ai-services-enhanced';
import { authService } from '@/lib/auth-service';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = authService.getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { department, jobTitle, ogsmData, context } = body;

    if (!department || !jobTitle) {
      return NextResponse.json(
        { error: 'Department and job title are required' },
        { status: 400 }
      );
    }

    // Generate AI-powered KPI suggestions
    const suggestions = await enhancedAIService.generateEnhancedKPISuggestions(
      user.id,
      department,
      jobTitle,
      ogsmData
    );

    return NextResponse.json({
      success: true,
      data: {
        suggestions,
        generatedAt: new Date().toISOString(),
        userId: user.id,
        context: {
          department,
          jobTitle,
          totalSuggestions: suggestions.length,
          avgConfidenceScore: suggestions.reduce((sum, s) => sum + s.confidenceScore, 0) / suggestions.length
        }
      }
    });

  } catch (error: any) {
    console.error('AI suggestions API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate KPI suggestions',
        details: error.message,
        fallback: true
      },
      { status: 500 }
    );
  }
}

// GET method for retrieving suggestion history
export async function GET(request: NextRequest) {
  try {
    const user = authService.getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const department = url.searchParams.get('department');

    // This would typically fetch from database
    // For now, return empty array as placeholder
    return NextResponse.json({
      success: true,
      data: {
        history: [],
        total: 0,
        limit
      }
    });

  } catch (error: any) {
    console.error('AI suggestions history API error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve suggestion history' },
      { status: 500 }
    );
  }
}