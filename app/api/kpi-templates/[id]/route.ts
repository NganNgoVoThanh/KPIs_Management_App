// app/api/kpi-templates/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/repositories/DatabaseFactory'
import { getAuthenticatedUser } from '@/lib/auth-server'

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic'


/**
 * GET /api/kpi-templates/[id]
 * Get single template by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getDatabase()
    const template = await db.getKpiTemplateById(params.id)

    if (!template) {
      return NextResponse.json({
        success: false,
        error: 'Template not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: template
    })
  } catch (error: any) {
    console.error('Error fetching template:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch template'
    }, { status: 500 })
  }
}

/**
 * PUT /api/kpi-templates/[id]
 * Update template
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 403 })
    }

    const body = await request.json()

    const db = getDatabase()
    const template = await db.updateKpiTemplate(params.id, body)

    return NextResponse.json({
      success: true,
      data: template,
      message: 'Template updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating template:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to update template'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/kpi-templates/[id]
 * Archive/soft delete template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 403 })
    }

    const db = getDatabase()
    await db.archiveTemplate(params.id)

    return NextResponse.json({
      success: true,
      message: 'Template archived successfully'
    })
  } catch (error: any) {
    console.error('Error archiving template:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to archive template'
    }, { status: 500 })
  }
}
