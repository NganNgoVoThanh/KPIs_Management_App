// app/api/notifications/mark-all-read/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-service'
import { db } from '@/lib/db'

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read for current user
 */
export async function POST(request: NextRequest) {
  try {
    const user = authService.getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    await db.markAllNotificationsAsRead(user.id)

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read'
    })

  } catch (error: any) {
    console.error('POST /api/notifications/mark-all-read error:', error)
    return NextResponse.json(
      { error: 'Failed to mark all notifications as read', details: error.message },
      { status: 500 }
    )
  }
}