// app/api/kpi-resources/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/repositories/DatabaseFactory';

/**
 * POST /api/kpi-resources/[id]/reject
 * Reject a resource
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { approvedBy, reason } = body;

    if (!approvedBy || !reason) {
      return NextResponse.json(
        { success: false, error: 'Approver ID and reason required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    await db.updateKpiResource(params.id, {
      approvalStatus: 'REJECTED',
      approvedBy,
      approvedAt: new Date().toISOString(),
      rejectionReason: reason
    });

    const resource = await db.getKpiResourceById(params.id);

    return NextResponse.json({
      success: true,
      data: resource,
      message: 'Resource rejected successfully'
    });

  } catch (error: any) {
    console.error('Failed to reject resource:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reject resource', details: error.message },
      { status: 500 }
    );
  }
}
