// app/api/admin/proxy/return-to-staff/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { getDatabase } from '@/lib/repositories/DatabaseFactory';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
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

    const db = getDatabase();

    // UPDATE ENTITY STATUS TO DRAFT (or CHANGE_REQUESTED)
    if (entityType === 'KPI') {
      await db.updateKpiDefinition(entityId, {
        status: 'CHANGE_REQUESTED',
        updatedAt: new Date().toISOString(),
        changeRequestReason: reason
      });
    } else if (entityType === 'ACTUAL') {
      await db.updateKpiActual(entityId, {
        status: 'DRAFT',
        lastModifiedAt: new Date(),
        rejectionReason: reason
      });
    }

    // CANCEL PENDING APPROVALS
    const approvals = await db.getApprovals({
      entityId: entityId,
      entityType: entityType,
      status: 'PENDING'
    });

    for (const approval of approvals) {
      await db.updateApproval(approval.id, {
        status: 'CANCELLED',
        comment: `Returned to staff by admin: ${reason}`,
        decidedAt: new Date().toISOString()
      });
    }

    // LOG PROXY ACTION
    try {
      await db.createProxyAction({
        actionType: 'RETURN_TO_STAFF',
        performedBy: user.id,
        targetUserId: staffUserId,
        entityType,
        entityId,
        reason,
        comment
      });

      await db.createNotification({
        userId: staffUserId,
        type: 'KPI_RETURNED',
        message: `Admin returned your ${entityType} for revision`,
        data: { entityId, reason }
      });
    } catch (e) {
      console.error('Failed to log proxy action', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Returned to staff successfully'
    });

  } catch (error: any) {
    console.error('Admin proxy return-to-staff error:', error);
    return NextResponse.json(
      { error: 'Failed to return to staff', details: error.message },
      { status: 500 }
    );
  }
}
