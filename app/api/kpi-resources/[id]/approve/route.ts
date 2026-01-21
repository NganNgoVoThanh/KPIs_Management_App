// app/api/kpi-resources/[id]/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/repositories/DatabaseFactory';
import { getAuthenticatedUser } from '@/lib/auth-server';

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic'


/**
 * POST /api/kpi-resources/[id]/approve
 * Approve a resource
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { approvedBy, comment } = body;

    if (!approvedBy) {
      return NextResponse.json(
        { success: false, error: 'Approver ID required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    await db.updateKpiResource(params.id, {
      approvalStatus: 'APPROVED',
      approvedBy,
      approvedAt: new Date().toISOString()
    });

    const resource = await db.getKpiResourceById(params.id);

    return NextResponse.json({
      success: true,
      data: resource,
      message: 'Resource approved successfully'
    });

  } catch (error: any) {
    console.error('Failed to approve resource:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to approve resource', details: error.message },
      { status: 500 }
    );
  }
}
