// app/api/admin/proxy/reassign-approver/route.ts
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
    const { entityType, entityId, level, newApproverId, newApproverEmail, reason, comment } = body;

    if (!entityType || !entityId || !level || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Resolve New Approver
    let resolvedApproverId = newApproverId;
    const db = getDatabase();

    if (newApproverEmail) {
      const approverUser = await db.getUserByEmail(newApproverEmail);
      if (!approverUser) {
        return NextResponse.json(
          { error: `User with email ${newApproverEmail} not found` },
          { status: 400 }
        );
      }
      resolvedApproverId = approverUser.id;
    }

    if (!resolvedApproverId) {
      return NextResponse.json(
        { error: 'New Approver ID or Email is required' },
        { status: 400 }
      );
    }

    // FETCH APPROVAL
    const approvals = await db.getApprovals({
      entityId: entityId,
      entityType: entityType,
      status: 'PENDING'
    });

    const approval = approvals.find((a: any) => a.level === level);

    if (!approval) {
      return NextResponse.json(
        { error: 'Pending approval not found for this level' },
        { status: 404 }
      );
    }

    // UPDATE APPROVAL
    const previousApproverId = approval.approverId;

    await db.updateApproval(approval.id, {
      approverId: resolvedApproverId,
      reassignedBy: user.id,
      reassignedAt: new Date().toISOString(),
      reassignReason: reason,
      comment: comment // Might want to append?
    });

    // LOG PROXY ACTION
    try {
      await db.createProxyAction({
        actionType: 'REASSIGN_APPROVER',
        performedBy: user.id,
        entityType,
        entityId,
        level,
        reason,
        comment,
        previousApproverId, // Assuming DB supports storing this metadata
        newApproverId: resolvedApproverId
      });

      // NOTIFY NEW APPROVER (If notification repository supports it)
      await db.createNotification({
        userId: resolvedApproverId,
        type: 'APPROVAL_ASSIGNED',
        message: `You have been assigned as approver for ${entityType} (Level ${level}) by Admin`,
        data: { entityId, entityType, level }
      });

    } catch (e) {
      console.error('Failed to log proxy action or notify', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Reassigned successfully'
    });

  } catch (error: any) {
    console.error('Admin proxy reassign-approver error:', error);
    return NextResponse.json(
      { error: 'Failed to reassign approver', details: error.message },
      { status: 500 }
    );
  }
}
