// app/api/kpi-library/change-requests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/repositories/DatabaseFactory';
import { getAuthenticatedUser } from '@/lib/auth-server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filters = {
      status: searchParams.get('status') || undefined,
      department: searchParams.get('department') || undefined,
      requesterId: searchParams.get('requesterId') || undefined
    };

    const db = getDatabase();
    const requests = await db.getChangeRequests(filters);

    return NextResponse.json({
      success: true,
      data: requests,
      count: requests.length
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch change requests', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { requestType, department, currentEntry, proposedEntry, reason } = body;

    if (!requestType || !department || !proposedEntry || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Construct the Change Request object
    // Note: Adjust fields to match your DB schema for ChangeRequest
    const changeRequestData = {
      requestType,
      department,
      kpiDefinitionId: currentEntry?.id || undefined, // Map currentEntry to ID if editing
      proposedData: proposedEntry, // JSON field in DB
      reason,
      requesterId: user.id,
      status: 'PENDING',
      requestedAt: new Date()
    };

    const changeRequest = await db.createChangeRequest(changeRequestData);

    return NextResponse.json({
      success: true,
      data: changeRequest,
      message: 'Change request created successfully'
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create change request', details: error.message },
      { status: 500 }
    );
  }
}