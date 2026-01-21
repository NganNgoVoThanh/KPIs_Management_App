// app/api/admin/proxy/issue-change-request/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { adminProxyService } from '@/lib/admin-proxy-service';

/**
 * POST /api/admin/proxy/issue-change-request
 * Admin issues a change request to Staff
 */
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
    const { entityType, entityId, staffUserId, reason, suggestions, comment } = body;

    // Validation
    if (!entityType || !entityId || !staffUserId || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: entityType, entityId, staffUserId, reason' },
        { status: 400 }
      );
    }

    if (!['KPI', 'ACTUAL'].includes(entityType)) {
      return NextResponse.json(
        { error: 'Invalid entityType. Must be KPI or ACTUAL' },
        { status: 400 }
      );
    }

    const result = await adminProxyService.issueChangeRequest({
      entityType,
      entityId,
      staffUserId,
      reason,
      suggestions,
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
      message: result.message,
      data: {
        entityType,
        entityId,
        performedBy: user.id,
        performedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('POST /api/admin/proxy/issue-change-request error:', error);
    return NextResponse.json(
      { error: 'Failed to issue change request', details: error.message },
      { status: 500 }
    );
  }
}
