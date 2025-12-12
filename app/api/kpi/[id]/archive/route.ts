// app/api/kpi/[id]/archive/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { db } from '@/lib/db';
import { storageService } from '@/lib/storage-service';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * POST /api/kpi/[id]/archive
 * Archive an approved KPI (Admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = authService.getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only Admin can archive
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required to archive KPIs' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const kpi = await db.getKpiDefinitionById(id);

    if (!kpi) {
      return NextResponse.json(
        { error: 'KPI not found' },
        { status: 404 }
      );
    }

    // Can only archive approved KPIs
    if (kpi.status !== 'APPROVED') {
      return NextResponse.json(
        { error: `Cannot archive KPI in ${kpi.status} status. Only APPROVED KPIs can be archived.` },
        { status: 400 }
      );
    }

    // Update KPI to ARCHIVED status
    const updated = await db.updateKpiDefinition(id, {
      status: 'ARCHIVED',
      updatedAt: new Date(),
      lockedAt: new Date() // Lock the KPI when archiving
    });

    // Log the archive action
    storageService.logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      entityType: 'KPI',
      entityId: id,
      action: 'ARCHIVE',
      beforeData: JSON.stringify({ status: kpi.status }),
      afterData: JSON.stringify({ status: 'ARCHIVED' })
    });

    return NextResponse.json({
      success: true,
      message: 'KPI archived successfully',
      data: updated
    });

  } catch (error: any) {
    console.error(`POST /api/kpi/${params}/archive error:`, error);
    return NextResponse.json(
      { error: 'Failed to archive KPI', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/kpi/[id]/archive
 * Unarchive a KPI (Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = authService.getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const kpi = await db.getKpiDefinitionById(id);

    if (!kpi) {
      return NextResponse.json(
        { error: 'KPI not found' },
        { status: 404 }
      );
    }

    if (kpi.status !== 'ARCHIVED') {
      return NextResponse.json(
        { error: 'KPI is not archived' },
        { status: 400 }
      );
    }

    // Restore to APPROVED status
    const updated = await db.updateKpiDefinition(id, {
      status: 'APPROVED',
      updatedAt: new Date()
    });

    storageService.logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      entityType: 'KPI',
      entityId: id,
      action: 'UNARCHIVE',
      beforeData: JSON.stringify({ status: 'ARCHIVED' }),
      afterData: JSON.stringify({ status: 'APPROVED' })
    });

    return NextResponse.json({
      success: true,
      message: 'KPI unarchived successfully',
      data: updated
    });

  } catch (error: any) {
    console.error(`DELETE /api/kpi/${params}/archive error:`, error);
    return NextResponse.json(
      { error: 'Failed to unarchive KPI', details: error.message },
      { status: 500 }
    );
  }
}
