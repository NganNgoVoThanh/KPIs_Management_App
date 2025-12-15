// app/api/kpi-resources/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/repositories/DatabaseFactory';
import { getAuthenticatedUser } from '@/lib/auth-server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/kpi-resources
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    // ... (rest of GET is fine, just auth added)

    const filters = {
      category: searchParams.get('category') || undefined,
      department: searchParams.get('department') || undefined,
      status: searchParams.get('status') || undefined,
      approvalStatus: searchParams.get('approvalStatus') || undefined,
      isPublic: searchParams.get('isPublic') === 'true' ? true : undefined,
      searchQuery: searchParams.get('q') || undefined
    };

    const db = getDatabase();
    const resources = await db.getKpiResources(filters);

    return NextResponse.json({
      success: true,
      data: resources,
      count: resources.length
    });

  } catch (error: any) {
    console.error('Failed to fetch KPI resources:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch resources', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/kpi-resources
 * Create new KPI resource (upload file)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();

    const title = formData.get('title') as string;
    const description = formData.get('description') as string | null;
    const category = formData.get('category') as string;
    const department = formData.get('department') as string | null;
    const tagsStr = formData.get('tags') as string | null;
    const isPublic = formData.get('isPublic') === 'true';

    // Ignore client-sent uploadedBy, use authenticated user
    const uploadedBy = user.id;
    const file = formData.get('file') as File;

    if (!title || !category || !file) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Parse tags
    const tags = tagsStr ? JSON.parse(tagsStr) : [];

    // Get file info
    const fileName = file.name;
    const fileSize = file.size;
    const mimeType = file.type;
    const fileType = fileName.split('.').pop()?.toLowerCase() || '';

    // Validate file size (max 50MB)
    if (fileSize > 50 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 50MB' },
        { status: 400 }
      );
    }

    // For local storage, we'll store file as base64 data URL
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const storageUrl = `data:${mimeType};base64,${base64}`;

    // Generate unique ID
    const id = `kpi-res-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Save metadata to database
    const db = getDatabase();
    const resource = await db.createKpiResource({
      id,
      title,
      description: description || undefined,
      category,
      department: department || undefined,
      tags,
      fileName,
      fileType,
      fileSize,
      mimeType,
      storageProvider: 'LOCAL',
      storageUrl,
      uploadedBy,
      isPublic,
      aiIndexed: false // Default to false, will be processed by AI background job
    });

    // Trigger AI Indexing (RAG)
    try {
      const { knowledgeBaseService } = await import('@/lib/ai/knowledge-base-service');
      // We don't await this to keep UI responsive, but for demo purposes if we want immediate result we could.
      // Let's fire and forget, but log errors.
      knowledgeBaseService.indexDocument(resource.id, storageUrl, {
        mimeType,
        fileName,
        department: department || undefined,
        type: category
      }).catch(err => console.error('Background Indexing Failed:', err));
    } catch (importErr) {
      console.error('Failed to import KB service:', importErr);
    }

    return NextResponse.json({
      success: true,
      data: resource,
      message: 'Resource uploaded successfully. AI indexing started in background.'
    });

  } catch (error: any) {
    console.error('Failed to upload resource:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload resource', details: error.message },
      { status: 500 }
    );
  }
}
