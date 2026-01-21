// app/api/notifications/[id]/read/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-server'
import { getDatabase } from '@/lib/repositories/DatabaseFactory'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/notifications/[id]/read
 * Mark notification as read
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params
    const db = getDatabase()

    // Mark as read by updating status
    await db.updateNotification(id, {
      status: 'READ',
      readAt: new Date()
    })

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read'
    })

  } catch (error: any) {
    console.error('POST /api/notifications/[id]/read error:', error)
    return NextResponse.json(
      { error: 'Failed to mark notification as read', details: error.message },
      { status: 500 }
    )
  }
}