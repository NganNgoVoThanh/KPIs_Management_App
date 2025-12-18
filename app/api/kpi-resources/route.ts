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

    const contentType = request.headers.get('content-type') || '';

    let title, description, category, department, tagsStr, isPublic, file, dashboardType, dashboardUrl, workspaceId, reportId;
    let tags: string[] = [];
    const uploadedBy = user.id;

    if (contentType.includes('application/json')) {
      const body = await request.json();
      title = body.title;
      description = body.description;
      category = body.category;
      department = body.department;
      tags = body.tags || [];
      isPublic = body.isPublic;
      // BI Dashboard fields
      dashboardType = body.dashboardType;
      dashboardUrl = body.dashboardUrl;
      workspaceId = body.workspaceId;
      reportId = body.reportId;

      if (!title || !category || (!dashboardUrl && body.resourceType === 'BI_DASHBOARD')) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }

      // Generate unique ID
      const id = `kpi-res-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const isAdmin = user.role === 'ADMIN';

      const db = getDatabase();
      const resource = await db.createKpiResource({
        id,
        title,
        description,
        category,
        department,
        tags,
        resourceType: 'BI_DASHBOARD',
        dashboardType,
        dashboardUrl,
        workspaceId,
        reportId,
        uploadedBy,
        isPublic: isPublic !== undefined ? isPublic : true,
        aiIndexed: false,
        approvalStatus: isAdmin ? 'APPROVED' : 'PENDING',
        status: isAdmin ? 'ACTIVE' : 'PENDING',
        approvedBy: isAdmin ? user.id : undefined,
        approvedAt: isAdmin ? new Date() : undefined
      });

      return NextResponse.json({
        success: true,
        data: resource,
        message: isAdmin
          ? 'Dashboard added and published successfully'
          : 'Dashboard added. Waiting for approval.'
      });

    }

    // Fallback: Handle FormData (Standard File Upload)
    const formData = await request.formData();

    title = formData.get('title') as string;
    description = formData.get('description') as string | null;
    category = formData.get('category') as string;
    department = formData.get('department') as string | null;
    tagsStr = formData.get('tags') as string | null;
    isPublic = formData.get('isPublic') === 'true';
    file = formData.get('file') as File;

    if (!title || !category || !file) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Parse tags
    tags = tagsStr ? JSON.parse(tagsStr) : [];

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
    const isAdmin = user.role === 'ADMIN';

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
      aiIndexed: false,
      approvalStatus: isAdmin ? 'APPROVED' : 'PENDING',
      status: isAdmin ? 'ACTIVE' : 'PENDING',
      approvedBy: isAdmin ? user.id : undefined,
      approvedAt: isAdmin ? new Date() : undefined
    });

    // Trigger AI Indexing (RAG)
    try {
      const { knowledgeBaseService } = await import('@/lib/ai/knowledge-base-service');
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
      message: isAdmin
        ? 'Resource uploaded and published successfully (Auto-approved for Admin)'
        : 'Resource uploaded successfully. Waiting for approval.'
    });

  } catch (error: any) {
    console.error('Failed to upload resource:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload resource', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Handle JSON body for BI Dashboards
 */
export async function PUT(request: NextRequest) {
  // We use POST with JSON body for BI Dashboards, mapping to this handler or modify POST above
  // Actually the frontend uses POST for both. We should handle JSON vs FormData in POST.
}
