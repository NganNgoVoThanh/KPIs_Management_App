// app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-server'
import { getDatabase } from '@/lib/repositories/DatabaseFactory'

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic'


/**
 * GET /api/notifications
 * Get notifications for current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')

    // Get notifications for user
    const db = getDatabase()
    const notifications = await db.getNotifications(user.id, unreadOnly)

    // Sort by creation date (newest first)
    notifications.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // Apply limit
    const limitedNotifications = notifications.slice(0, limit)

    // Get counts
    const unreadCount = notifications.filter(n => n.status === 'UNREAD').length
    const actionRequiredCount = notifications.filter(
      n => n.status === 'UNREAD' && n.actionRequired
    ).length

    return NextResponse.json({
      success: true,
      data: limitedNotifications,
      count: limitedNotifications.length,
      stats: {
        total: notifications.length,
        unread: unreadCount,
        actionRequired: actionRequiredCount
      }
    })

  } catch (error: any) {
    console.error('GET /api/notifications error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications', details: error.message },
      { status: 500 }
    )
  }
}