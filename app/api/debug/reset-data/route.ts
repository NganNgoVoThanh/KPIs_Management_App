// DEBUG ENDPOINT - Reset data for testing
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-server'
import { getDatabase } from '@/lib/repositories/DatabaseFactory'

export const dynamic = 'force-dynamic'

/**
 * POST /api/debug/reset-data
 * Reset all KPIs, Approvals, and Notifications for testing
 * ADMIN only
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const db = getDatabase()

    // Get all data before deletion
    const allKpis = await db.getKpiDefinitions({})
    const allApprovals = await db.getApprovals({})
    const allUsers = await db.getUsers({})

    console.log('[RESET-DATA] Starting data reset...')
    console.log('[RESET-DATA] Found:', {
      kpis: allKpis.length,
      approvals: allApprovals.length,
      users: allUsers.length
    })

    // Get what to reset from query params
    const { searchParams } = new URL(request.url)
    const resetKpis = searchParams.get('kpis') !== 'false'
    const resetApprovals = searchParams.get('approvals') !== 'false'
    const resetNotifications = searchParams.get('notifications') !== 'false'

    const results = {
      kpisDeleted: 0,
      approvalsDeleted: 0,
      notificationsDeleted: 0,
      errors: [] as string[]
    }

    // Reset KPIs (set to DRAFT status instead of deleting)
    if (resetKpis) {
      console.log('[RESET-DATA] Resetting KPIs to DRAFT status...')
      for (const kpi of allKpis) {
        try {
          await db.updateKpiDefinition(kpi.id, {
            status: 'DRAFT',
            submittedAt: null,
            approvedAt: null,
            approvedByLevel1: null,
            approvedByLevel2: null,
            approvedAtLevel1: null,
            approvedAtLevel2: null,
            rejectedBy: null,
            rejectedAt: null,
            rejectionReason: null
          })
          results.kpisDeleted++
        } catch (error: any) {
          results.errors.push(`Failed to reset KPI ${kpi.id}: ${error.message}`)
        }
      }
    }

    // Delete all Approvals
    if (resetApprovals) {
      console.log('[RESET-DATA] Deleting approvals...')
      for (const approval of allApprovals) {
        try {
          await db.updateApproval(approval.id, {
            status: 'CANCELLED',
            decidedAt: new Date()
          })
          results.approvalsDeleted++
        } catch (error: any) {
          results.errors.push(`Failed to delete approval ${approval.id}: ${error.message}`)
        }
      }
    }

    // Delete all Notifications (soft delete)
    if (resetNotifications) {
      console.log('[RESET-DATA] Deleting notifications...')
      for (const u of allUsers) {
        try {
          const notifications = await db.getNotifications(u.id, false)
          for (const notification of notifications) {
            await db.updateNotification(notification.id, {
              status: 'DELETED',
              deletedAt: new Date()
            })
            results.notificationsDeleted++
          }
        } catch (error: any) {
          results.errors.push(`Failed to delete notifications for user ${u.id}: ${error.message}`)
        }
      }
    }

    console.log('[RESET-DATA] Data reset completed:', results)

    return NextResponse.json({
      success: true,
      message: 'Data reset successfully',
      results,
      resetOptions: {
        kpis: resetKpis,
        approvals: resetApprovals,
        notifications: resetNotifications
      }
    })

  } catch (error: any) {
    console.error('POST /api/debug/reset-data error:', error)
    return NextResponse.json(
      { error: 'Failed to reset data', details: error.message },
      { status: 500 }
    )
  }
}
