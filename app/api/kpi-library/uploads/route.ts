// app/api/kpi-library/uploads/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { kpiLibraryService } from '@/lib/kpi-library-service';
import { authService } from '@/lib/auth-service';

export async function GET(request: NextRequest) {
  try {
    const user = authService.getCurrentUser();
    if (!user || !['ADMIN', 'BOD'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Admin or BOD access required' },
        { status: 403 }
      );
    }

    const uploads = kpiLibraryService.getUploads();

    return NextResponse.json({
      success: true,
      data: uploads,
      count: uploads.length
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch uploads', details: error.message },
      { status: 500 }
    );
  }
}