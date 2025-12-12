// app/api/kpi-library/change-requests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { kpiLibraryService } from '@/lib/kpi-library-service';
import { authService } from '@/lib/auth-service';

export async function GET(request: NextRequest) {
  try {
    const user = authService.getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filters = {
      status: searchParams.get('status') as any || undefined,
      department: searchParams.get('department') || undefined,
      requestType: searchParams.get('requestType') as any || undefined
    };

    const requests = kpiLibraryService.getChangeRequests(filters);

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
    const user = authService.getCurrentUser();
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

    const changeRequest = kpiLibraryService.createChangeRequest({
      requestType,
      department,
      currentEntry,
      proposedEntry,
      reason
    });

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