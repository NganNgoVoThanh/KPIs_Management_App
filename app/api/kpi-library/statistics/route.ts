// app/api/kpi-library/statistics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { kpiLibraryService } from '@/lib/kpi-library-service';
import { authService } from '@/lib/auth-service';

export async function GET_STATISTICS(request: NextRequest) {
  try {
    const user = authService.getCurrentUser();
    if (!user || !['ADMIN', 'HR'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Admin or HR access required' },
        { status: 403 }
      );
    }

    const statistics = kpiLibraryService.getStatistics();

    return NextResponse.json({
      success: true,
      data: statistics
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch statistics', details: error.message },
      { status: 500 }
    );
  }
}