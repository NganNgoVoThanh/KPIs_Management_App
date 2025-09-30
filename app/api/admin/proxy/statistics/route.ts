// app/api/admin/proxy/statistics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminProxyService } from '@/lib/admin-proxy-service';
import { authService } from '@/lib/auth-service';

export async function GET(request: NextRequest) {
  try {
    const user = authService.getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    const statistics = adminProxyService.getStatistics(dateFrom, dateTo);

    return NextResponse.json({
      success: true,
      data: statistics
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}