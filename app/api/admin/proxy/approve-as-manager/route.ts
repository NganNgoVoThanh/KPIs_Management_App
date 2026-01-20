// app/api/admin/proxy/approve-as-manager/route.ts
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
    const { entityType, entityId, level, managerId, managerEmail, comment, reason } = body;

    if (!entityType || !entityId || !level || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Resolve Manager ID
    let resolvedManagerId = managerId;
    const db = getDatabase();

    if (managerEmail) {
      const mgr = await db.getUserByEmail(managerEmail);
      if (!mgr) {
        return NextResponse.json(
          { error: `Manager with email ${managerEmail} not found` },
          { status: 400 }
        );
      }
      resolvedManagerId = mgr.id;
    }

    if (!resolvedManagerId) {
      return NextResponse.json(
        { error: 'Manager ID or Email is required' },
        { status: 400 }
      );
    }

    if (![1, 2, 3].includes(level)) {
      return NextResponse.json(
        { error: 'Level must be 1, 2, or 3' },
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
    await db.updateApproval(approval.id, {
      status: 'APPROVED',
      decidedAt: new Date().toISOString(),
      comment: comment || `Approved by Admin ${user.name}`,
      reassignedBy: user.id, // Using this field to track admin intervention
      reassignedAt: new Date().toISOString(),
      reassignReason: reason
    });

    // LOG PROXY ACTION
    try {
      await db.createProxyAction({
        actionType: 'APPROVE_AS_MANAGER',
        performedBy: user.id,
        targetUserId: resolvedManagerId,
        entityType,
        entityId,
        level,
        reason,
        comment
      });
    } catch (e) {
      console.error('Failed to log proxy action', e);
    }

    // HANDLE WORKFLOW (Optimistic: Assume DB trigger or Service handles status propagation, 
    // OR minimal manual propagation here if needed. 
    // For now, mirroring adminProxyService simple logic: if Level 2 approved -> Entity Approved)

    if (level === 2) {
      if (entityType === 'KPI') {
        await db.updateKpiDefinition(entityId, {
          status: 'APPROVED',
          approvedAt: new Date().toISOString()
        })
      } else if (entityType === 'ACTUAL') {
        await db.updateKpiActual(entityId, {
          status: 'APPROVED',
          approvedAt: new Date().toISOString()
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Approved successfully via Proxy'
    });

  } catch (error: any) {
    console.error('Admin proxy approve-as-manager error:', error);
    return NextResponse.json(
      { error: 'Failed to approve as manager', details: error.message },
      { status: 500 }
    );
  }
}
