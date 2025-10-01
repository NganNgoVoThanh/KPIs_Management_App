// app/api/kpi-library/uploads/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { kpiLibraryService } from '@/lib/kpi-library-service';
import { authService } from '@/lib/auth-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = authService.getCurrentUser();
    if (!user || !['ADMIN', 'BOD'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Admin or BOD access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { reason } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    kpiLibraryService.rejectUpload(params.id, reason);

    return NextResponse.json({
      success: true,
      message: 'Upload rejected. All pending entries have been removed.'
    });

  } catch (error: any) {
    console.error('Reject upload error:', error);
    return NextResponse.json(
      { error: 'Failed to reject upload', details: error.message },
      { status: 500 }
    );
  }
}