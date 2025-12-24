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
 * DELETE /api/notifications/[id]
 * Delete a notification
 */
export async function DELETE(
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

    // Get all notifications for this user to verify ownership
    const userNotifications = await db.getNotifications({
      userId: user.id
    })

    const notification = userNotifications.find(n => n.id === id)

    // For non-admin, verify ownership
    if (user.role !== 'ADMIN') {
      if (!notification) {
        return NextResponse.json(
          { error: 'Notification not found or unauthorized' },
          { status: 404 }
        )
      }
    }

    // Soft delete notification (mark as deleted)
    await db.updateNotification(id, {
      status: 'DELETED',
      deletedAt: new Date()
    })

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully'
    })

  } catch (error: any) {
    console.error('DELETE /api/notifications/[id] error:', error)
    return NextResponse.json(
      { error: 'Failed to delete notification', details: error.message },
      { status: 500 }
    )
  }
}
