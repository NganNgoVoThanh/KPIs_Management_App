// app/api/kpi-library/change-requests/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { kpiLibraryService } from '@/lib/kpi-library-service';
import { authService } from '@/lib/auth-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = authService.getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
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

    kpiLibraryService.rejectChangeRequest(params.id, reason);

    return NextResponse.json({
      success: true,
      message: 'Change request rejected'
    });

  } catch (error: any) {
    console.error('Reject change request error:', error);
    return NextResponse.json(
      { error: 'Failed to reject change request', details: error.message },
      { status: 500 }
    );
  }
}