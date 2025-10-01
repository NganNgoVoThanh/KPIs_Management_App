import { NextRequest, NextResponse } from 'next/server'
import { kpiLibraryDBService } from '@/lib/kpi-library-db-service'
import { authService } from '@/lib/auth-service'

export async function GET(request: NextRequest) {
  try {
    const user = authService.getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filters = {
      department: searchParams.get('department') || undefined,
      jobTitle: searchParams.get('jobTitle') || undefined,
      kpiType: searchParams.get('kpiType') || undefined,
      status: searchParams.get('status') as any || undefined,
      isTemplate: searchParams.get('isTemplate') === 'true' ? true : 
                  searchParams.get('isTemplate') === 'false' ? false : undefined
    }

    const entries = await kpiLibraryDBService.getEntries(filters)

    return NextResponse.json({
      success: true,
      data: entries,
      count: entries.length
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch entries', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = authService.getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const entry = await kpiLibraryDBService.addEntry(body)

    return NextResponse.json({
      success: true,
      data: entry,
      message: 'Entry created successfully'
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create entry', details: error.message },
      { status: 500 }
    )
  }
}