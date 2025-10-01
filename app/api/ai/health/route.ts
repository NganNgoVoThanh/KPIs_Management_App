// app/api/ai/health/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { enhancedAIService } from '@/lib/ai-services-enhanced';

export async function GET(request: NextRequest) {
  try {
    // Perform AI services health check
    const healthStatus = await enhancedAIService.healthCheck();
    
    // Get usage metrics
    const metrics = enhancedAIService.getUsageMetrics();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      health: healthStatus,
      metrics: {
        ...metrics,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '1.0.0'
      }
    });

  } catch (error: any) {
    console.error('AI health check error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}