// app/api/notifications/mark-all-read/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-server'
import { getDatabase } from '@/lib/repositories/DatabaseFactory'

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic'

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read for current user
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const db = getDatabase()
    await db.markAllAsRead(user.id)

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read'
    })

  } catch (error: any) {
    console.error('POST /api/notifications/mark-all-read error:', error)
    console.error('Stack:', error.stack)
    return NextResponse.json(
      { error: 'Failed to mark all notifications as read', details: error.message },
      { status: 500 }
    )
  }
}