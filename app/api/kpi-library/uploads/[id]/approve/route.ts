// app/api/kpi-library/uploads/[id]/approve/route.ts
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
    const { comment } = body;

    kpiLibraryService.approveUpload(params.id, comment);

    return NextResponse.json({
      success: true,
      message: 'Upload approved successfully. KPI entries are now active.'
    });

  } catch (error: any) {
    console.error('Approve upload error:', error);
    return NextResponse.json(
      { error: 'Failed to approve upload', details: error.message },
      { status: 500 }
    );
  }
}