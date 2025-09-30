// app/api/admin/proxy/actions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminProxyService } from '@/lib/admin-proxy-service';
import { authService } from '@/lib/auth-service';

/**
 * GET - Get proxy actions history
 */
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
    const filters = {
      performedBy: searchParams.get('performedBy') || undefined,
      actionType: searchParams.get('actionType') as any || undefined,
      entityType: searchParams.get('entityType') as any || undefined,
      entityId: searchParams.get('entityId') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
    };

    const actions = adminProxyService.getProxyActions(filters);

    return NextResponse.json({
      success: true,
      data: actions,
      count: actions.length
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}