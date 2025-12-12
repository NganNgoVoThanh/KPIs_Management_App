// app/api/admin/proxy/return-to-staff/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminProxyService } from '@/lib/admin-proxy-service';
import { authService } from '@/lib/auth-service';

export async function POST(request: NextRequest) {
  try {
    const user = authService.getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { entityType, entityId, staffUserId, reason, comment } = body;

    if (!entityType || !entityId || !staffUserId || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await adminProxyService.returnToStaff({
      entityType,
      entityId,
      staffUserId,
      reason,
      comment
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message
    });

  } catch (error: any) {
    console.error('Admin proxy return-to-staff error:', error);
    return NextResponse.json(
      { error: 'Failed to return to staff', details: error.message },
      { status: 500 }
    );
  }
}