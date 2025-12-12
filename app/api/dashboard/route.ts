// app/api/dashboard/route.ts - Dashboard Statistics API
import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-service'
import { db } from '@/lib/db'

/**
 * GET /api/dashboard
 * Get dashboard statistics based on user role
 */
export async function GET(request: NextRequest) {
  try {
    const user = authService.getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    let dashboardData: any = {}

    // Get active cycle
    const activeCycle = await db.getActiveCycle()

    if (user.role === 'ADMIN') {
      // Admin Dashboard - Full System Statistics
      const stats = await db.getAdminStatistics()

      dashboardData = {
        ...stats,
        activeCycle,
        userRole: user.role,
        userName: user.name
      }

    } else if (user.role === 'MANAGER' || user.role === 'LINE_MANAGER') {
      // Manager Dashboard - Team Statistics

      // Get subordinates
      const allUsers = await db.getUsers()
      const subordinates = allUsers.filter(u => u.managerId === user.id)
      const subordinateIds = subordinates.map(s => s.id)

      // Get KPIs for team
      const teamKpis = await db.getKpiDefinitions({
        userId: { in: subordinateIds }
      })

      // Count by status
      const kpisByStatus = teamKpis.reduce((acc: any, kpi) => {
        acc[kpi.status] = (acc[kpi.status] || 0) + 1
        return acc
      }, {})

      // Get pending approvals
      const pendingApprovals = await db.getApprovals({
        approverId: user.id,
        status: 'PENDING'
      } as any)

      dashboardData = {
        team: {
          totalMembers: subordinates.length,
          activeMembers: subordinates.filter(s => s.status === 'ACTIVE').length
        },
        kpis: {
          total: teamKpis.length,
          byStatus: kpisByStatus,
          pending: kpisByStatus['PENDING_LM'] || 0,
          approved: kpisByStatus['APPROVED'] || 0,
          draft: kpisByStatus['DRAFT'] || 0
        },
        pendingApprovals: {
          count: pendingApprovals.length,
          items: pendingApprovals.slice(0, 5) // Latest 5
        },
        activeCycle,
        userRole: user.role,
        userName: user.name
      }

    } else {
      // Staff Dashboard - Personal Statistics

      // Get my KPIs
      const myKpis = await db.getKpiDefinitions({
        userId: user.id
      })

      // Count by status
      const kpisByStatus = myKpis.reduce((acc: any, kpi) => {
        acc[kpi.status] = (acc[kpi.status] || 0) + 1
        return acc
      }, {})

      // Get my actuals
      const myActuals = await db.getKpiActuals({
        kpiDefinitionId: { in: myKpis.map(k => k.id) }
      } as any)

      // Get notifications
      const notifications = await db.getNotifications(user.id, true) // unread only

      dashboardData = {
        kpis: {
          total: myKpis.length,
          byStatus: kpisByStatus,
          draft: kpisByStatus['DRAFT'] || 0,
          pending: kpisByStatus['PENDING_LM'] || 0,
          approved: kpisByStatus['APPROVED'] || 0,
          locked: kpisByStatus['LOCKED_GOALS'] || 0
        },
        actuals: {
          total: myActuals.length,
          submitted: myActuals.filter(a => a.status === 'SUBMITTED').length,
          approved: myActuals.filter(a => a.status === 'APPROVED').length,
          draft: myActuals.filter(a => a.status === 'DRAFT').length
        },
        notifications: {
          unread: notifications.length,
          items: notifications.slice(0, 5) // Latest 5
        },
        activeCycle,
        userRole: user.role,
        userName: user.name
      }
    }

    return NextResponse.json({
      success: true,
      data: dashboardData
    })

  } catch (error: any) {
    console.error('GET /api/dashboard error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', details: error.message },
      { status: 500 }
    )
  }
}
