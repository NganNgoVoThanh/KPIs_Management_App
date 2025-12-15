// app/api/kpi-library/entries/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUser } from '@/lib/auth-server';

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
    const departmentStr = searchParams.get('department');
    const filters: any = {
      department: departmentStr && departmentStr !== 'all' ? departmentStr : undefined,
      status: 'ACTIVE'
    };

    // Get database instance
    const { getDatabase } = await import('@/lib/repositories/DatabaseFactory');
    const db = getDatabase();

    // 1. Fetch Legacy/Excel Entries
    const libraryEntries = await db.getKpiLibraryEntries(filters);

    // 2. Fetch New KPI Templates (Unified Library)
    // Map template filters
    const templateFilters: any = {
      isActive: true
    };
    if (filters.department) templateFilters.department = filters.department;

    const templates = await db.getKpiTemplates(templateFilters);

    // 3. Convert Templates to LibraryEntry format for the UI
    const templateEntries = templates.map((t: any) => ({
      id: t.id,
      stt: 9999, // Sort last
      kpiName: t.name,
      ogsmTarget: t.description || '', // Map description to OGSM/Description
      department: t.department,
      jobTitle: t.jobTitle || 'All Levels',
      kpiType: mapTypeToCode(t.kpiType),
      unit: t.unit,
      dataSource: t.dataSource || 'Manual',
      yearlyTarget: t.targetValue || 0,
      quarterlyTarget: 0,
      uploadedBy: t.createdBy,
      status: 'ACTIVE',
      version: t.version,
      isTemplate: true
    }));

    // 4. Merge results
    const combinedEntries = [...libraryEntries, ...templateEntries];

    // 5. Apply other filters if necessary (handle in memory)
    const searchQuery = searchParams.get('q')?.toLowerCase();
    let finalEntries = combinedEntries;

    if (searchQuery) {
      finalEntries = finalEntries.filter(e =>
        e.kpiName.toLowerCase().includes(searchQuery) ||
        e.department.toLowerCase().includes(searchQuery)
      );
    }

    return NextResponse.json({
      success: true,
      data: finalEntries,
      count: finalEntries.length
    });

  } catch (error: any) {
    console.error('KPI Library GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KPI library', details: error.message },
      { status: 500 }
    );
  }
}

function mapTypeToCode(type: string): string {
  switch (type) {
    case 'QUANT_HIGHER_BETTER': return 'I';
    case 'QUANT_LOWER_BETTER': return 'II';
    case 'BOOLEAN': return 'III';
    case 'MILESTONE': return 'IV';
    default: return 'I';
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || !['ADMIN', 'HR'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Admin or HR access required' },
        { status: 403 }
      );
    }

    // Get database instance
    const { getDatabase } = await import('@/lib/repositories/DatabaseFactory');
    const db = getDatabase();

    const body = await request.json();

    // Construct entry data for DB
    const entryData = {
      ...body,
      uploadedBy: user.id,
      status: body.status || 'ACTIVE',
      version: 1
    };

    const entry = await db.createKpiLibraryEntry(entryData);

    return NextResponse.json({
      success: true,
      data: entry,
      message: 'KPI library entry created successfully'
    });

  } catch (error: any) {
    console.error('KPI Library POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create entry', details: error.message },
      { status: 500 }
    );
  }
}
