// app/api/admin/proxy/reassign-approver/route.ts
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
    const { entityType, entityId, level, newApproverId, reason, comment } = body;

    if (!entityType || !entityId || !level || !newApproverId || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (![1, 2, 3].includes(level)) {
      return NextResponse.json(
        { error: 'Level must be 1, 2, or 3' },
        { status: 400 }
      );
    }

    const result = await adminProxyService.reassignApprover({
      entityType,
      entityId,
      level,
      newApproverId,
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
    console.error('Admin proxy reassign-approver error:', error);
    return NextResponse.json(
      { error: 'Failed to reassign approver', details: error.message },
      { status: 500 }
    );
  }
}