// app/api/kpi-resources/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/repositories/DatabaseFactory';
import { getAuthenticatedUser } from '@/lib/auth-server';

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic'


/**
 * GET /api/kpi-resources/[id]
 * Get single resource by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();
    const resource = await db.getKpiResourceById(params.id);

    if (!resource) {
      return NextResponse.json(
        { success: false, error: 'Resource not found' },
        { status: 404 }
      );
    }

    // Increment view count
    await db.updateKpiResource(params.id, {
      viewCount: (resource.viewCount || 0) + 1
    });

    return NextResponse.json({
      success: true,
      data: resource
    });

  } catch (error: any) {
    console.error('Failed to fetch resource:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch resource', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/kpi-resources/[id]
 * Update resource metadata
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const db = getDatabase();
    await db.updateKpiResource(params.id, body);
    const resource = await db.getKpiResourceById(params.id);

    return NextResponse.json({
      success: true,
      data: resource,
      message: 'Resource updated successfully'
    });

  } catch (error: any) {
    console.error('Failed to update resource:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update resource', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/kpi-resources/[id]
 * Delete resource
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const db = getDatabase();
    await db.deleteKpiResource(params.id);

    return NextResponse.json({
      success: true,
      message: 'Resource deleted successfully'
    });

  } catch (error: any) {
    console.error('Failed to delete resource:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete resource', details: error.message },
      { status: 500 }
    );
  }
}
