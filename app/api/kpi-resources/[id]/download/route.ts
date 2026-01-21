// app/api/kpi-resources/[id]/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/repositories/DatabaseFactory';

/**
 * GET /api/kpi-resources/[id]/download
 * Download a resource file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDatabase();
    const resource = await db.getKpiResourceById(params.id);

    if (!resource) {
      return NextResponse.json(
        { success: false, error: 'Resource not found' },
        { status: 404 }
      );
    }

    // Increment download count
    await db.updateKpiResource(params.id, {
      downloadCount: (resource.downloadCount || 0) + 1
    });

    // For local storage, the storageUrl contains the data URL
    // Return file URL for download
    return NextResponse.json({
      success: true,
      data: {
        fileName: resource.fileName,
        mimeType: resource.mimeType,
        storageUrl: resource.storageUrl
      }
    });

  } catch (error: any) {
    console.error('Failed to download resource:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to download resource', details: error.message },
      { status: 500 }
    );
  }
}
