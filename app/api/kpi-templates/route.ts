// app/api/kpi-templates/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/repositories/DatabaseFactory'
import { getAuthenticatedUser } from '@/lib/auth-server'

/**
 * GET /api/kpi-templates
 * Get all KPI templates with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filters: any = {}

    if (searchParams.get('department')) {
      filters.department = searchParams.get('department')
    }
    if (searchParams.get('category')) {
      filters.category = searchParams.get('category')
    }
    if (searchParams.get('status')) {
      filters.status = searchParams.get('status')
    }
    if (searchParams.get('source')) {
      filters.source = searchParams.get('source')
    }
    if (searchParams.get('isActive') !== null) {
      filters.isActive = searchParams.get('isActive') === 'true'
    }
    if (searchParams.get('q')) {
      filters.search = searchParams.get('q')
    }

    const db = getDatabase()
    const templates = await db.getKpiTemplates(filters)

    return NextResponse.json({
      success: true,
      data: templates
    })
  } catch (error: any) {
    console.error('Error fetching templates:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch templates'
    }, { status: 500 })
  }
}

/**
 * POST /api/kpi-templates
 * Create a new KPI template
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    console.log('[KPI-TEMPLATES] POST - User:', user ? { id: user.id, email: user.email, role: user.role } : 'NO USER')

    if (!user || user.role !== 'ADMIN') {
      console.warn('[KPI-TEMPLATES] Access denied. User role:', user?.role, 'Required: ADMIN')
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Admin access required'
      }, { status: 403 })
    }

    console.log('[KPI-TEMPLATES] User authorized, proceeding with template creation')

    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.department || !body.kpiType) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, department, kpiType'
      }, { status: 400 })
    }

    const db = getDatabase()
    const template = await db.createKpiTemplate({
      name: body.name,
      description: body.description,
      department: body.department,
      jobTitle: body.jobTitle,
      category: body.category,
      kpiType: body.kpiType,
      unit: body.unit,
      formula: body.formula,
      dataSource: body.dataSource,
      targetValue: body.targetValue ? parseFloat(body.targetValue) : undefined,
      weight: body.weight ? parseFloat(body.weight) : undefined,
      tags: body.tags || [],
      ogsmAlignment: body.ogsmAlignment,
      frequency: body.frequency,
      priority: body.priority,
      source: body.source || 'MANUAL',
      uploadId: body.uploadId,
      clonedFromId: body.clonedFromId,
      status: 'DRAFT',
      version: 1,
      usageCount: 0,
      isActive: true,
      createdBy: user.id
    })

    return NextResponse.json({
      success: true,
      data: template,
      message: 'Template created successfully'
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating template:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create template'
    }, { status: 500 })
  }
}
