// app/api/notifications/[id]/read/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-service'
import { db } from '@/lib/db'

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
    const user = authService.getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Mark as read
    await db.markNotificationAsRead(id)

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