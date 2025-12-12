// app/api/kpi-library/change-requests/[id]/approve/route.ts
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
    const { comment } = body;

    kpiLibraryService.approveChangeRequest(params.id, comment);

    return NextResponse.json({
      success: true,
      message: 'Change request approved and applied successfully'
    });

  } catch (error: any) {
    console.error('Approve change request error:', error);
    return NextResponse.json(
      { error: 'Failed to approve change request', details: error.message },
      { status: 500 }
    );
  }
}