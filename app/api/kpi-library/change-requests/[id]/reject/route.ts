// app/api/kpi-library/change-requests/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/repositories/DatabaseFactory';
import { getAuthenticatedUser } from '@/lib/auth-server';

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic'


export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { reason } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    const changeRequest = await db.getChangeRequestById(params.id);
    if (!changeRequest) {
      return NextResponse.json({ error: 'Change request not found' }, { status: 404 });
    }

    await db.updateChangeRequest(params.id, {
      status: 'REJECTED',
      reviewedBy: user.id,
      reviewedAt: new Date(),
      reviewComment: reason
    });

    return NextResponse.json({
      success: true,
      message: 'Change request rejected'
    });

  } catch (error: any) {
    console.error('Reject change request error:', error);
    return NextResponse.json(
      { error: 'Failed to reject change request', details: error.message },
      { status: 500 }
    );
  }
}