// app/api/ai/document/route.ts
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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const kpiContext = JSON.parse(formData.get('kpiContext') as string || '{}');

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Validate file type and size
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type' },
        { status: 400 }
      );
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }

    // Save file temporarily for processing
    const buffer = await file.arrayBuffer();
    const tempFilePath = `/tmp/${Date.now()}-${file.name}`;
    
    // In production, you'd save to proper storage
    // For now, simulate file processing
    
    // Analyze document
    const analysisResult = await enhancedAIService.analyzeEvidenceDocument(
      tempFilePath,
      kpiContext
    );

    // Log document analysis
    console.log(`Document analysis for user ${user.id}:`, {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      kpiTitle: kpiContext.title,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      data: {
        analysis: analysisResult,
        fileInfo: {
          name: file.name,
          type: file.type,
          size: file.size
        },
        analyzedAt: new Date().toISOString(),
        userId: user.id
      }
    });

  } catch (error: any) {
    console.error('AI document analysis API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze document',
        details: error.message 
      },
      { status: 500 }
    );
  }
}