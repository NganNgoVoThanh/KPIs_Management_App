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
      department: searchParams.get('department') || undefined,
      jobTitle: searchParams.get('jobTitle') || undefined,
      kpiType: searchParams.get('kpiType') || undefined,
      status: searchParams.get('status') as any || undefined,
      isTemplate: searchParams.get('isTemplate') === 'true' ? true : 
                  searchParams.get('isTemplate') === 'false' ? false : undefined
    };

    const entries = kpiLibraryService.getEntries(filters);

    return NextResponse.json({
      success: true,
      data: entries,
      count: entries.length
    });

  } catch (error: any) {
    console.error('KPI Library GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KPI library', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = authService.getCurrentUser();
    if (!user || !['ADMIN', 'HR'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Admin or HR access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const entry = kpiLibraryService.addEntry(body);

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