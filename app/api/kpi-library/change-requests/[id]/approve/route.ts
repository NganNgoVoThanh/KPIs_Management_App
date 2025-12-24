// app/api/kpi-library/change-requests/[id]/approve/route.ts
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
    const { comment } = body;

    const db = getDatabase();

    // 1. Get the change request
    const changeRequest = await db.getChangeRequestById(params.id);
    if (!changeRequest) {
      return NextResponse.json({ error: 'Change request not found' }, { status: 404 });
    }

    if (changeRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Change request already processed' }, { status: 400 });
    }

    // 2. Apply the change based on type
    const requestType = changeRequest.requestType;
    let appliedEntry = null;

    if (requestType === 'ADD') {
      // Create new entry
      // proposedData might be a JSON object or string in DB, ensure it's parsed
      const entryData = typeof changeRequest.proposedData === 'string'
        ? JSON.parse(changeRequest.proposedData)
        : changeRequest.proposedData;

      appliedEntry = await db.createKpiLibraryEntry({
        ...entryData,
        status: 'ACTIVE',
        uploadedBy: changeRequest.requesterId
      });

    } else if (requestType === 'EDIT') {
      const entryData = typeof changeRequest.proposedData === 'string'
        ? JSON.parse(changeRequest.proposedData)
        : changeRequest.proposedData;

      if (changeRequest.kpiDefinitionId) {
        appliedEntry = await db.updateKpiLibraryEntry(changeRequest.kpiDefinitionId, {
          ...entryData,
          version: { increment: 1 } // Prisma increment syntax or handle manually
        });
      }

    } else if (requestType === 'DELETE') {
      if (changeRequest.kpiDefinitionId) {
        // Soft delete or status update
        appliedEntry = await db.updateKpiLibraryEntry(changeRequest.kpiDefinitionId, {
          status: 'INACTIVE'
        });
      }
    }

    // 3. Update change request status
    await db.updateChangeRequest(params.id, {
      status: 'APPROVED',
      reviewedBy: user.id,
      reviewedAt: new Date(),
      reviewComment: comment
    });

    return NextResponse.json({
      success: true,
      message: 'Change request approved and applied successfully',
      data: appliedEntry
    });

  } catch (error: any) {
    console.error('Approve change request error:', error);
    return NextResponse.json(
      { error: 'Failed to approve change request', details: error.message },
      { status: 500 }
    );
  }
}