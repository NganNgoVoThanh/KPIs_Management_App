// app/api/kpi-templates/[id]/clone/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/repositories/DatabaseFactory'
import { getAuthenticatedUser } from '@/lib/auth-server'

/**
 * POST /api/kpi-templates/[id]/clone
 * Clone an existing template
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const body = await request.json()

    const db = getDatabase()
    const cloned = await db.cloneTemplate(params.id, user.id, body)

    return NextResponse.json({
      success: true,
      data: cloned,
      message: 'Template cloned successfully'
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error cloning template:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to clone template'
    }, { status: 500 })
  }
}
