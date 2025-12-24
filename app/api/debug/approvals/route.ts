// DEBUG ENDPOINT - Remove in production
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-server'
import { getDatabase } from '@/lib/repositories/DatabaseFactory'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const db = getDatabase()

    // Get all KPIs
    const allKpis = await db.getKpiDefinitions({})

    // Get all KPIs with WAITING_LINE_MGR status
    const waitingKpis = await db.getKpiDefinitions({
      status: 'WAITING_LINE_MGR'
    })

    // Get all pending approvals
    const pendingApprovals = await db.getApprovals({
      status: 'PENDING'
    })

    // Get all approvals (any status)
    const allApprovals = await db.getApprovals({})

    // Get all users
    const allUsers = await db.getUsers({})

    const debug = {
      summary: {
        totalKpis: allKpis.length,
        waitingLineManager: waitingKpis.length,
        totalApprovals: allApprovals.length,
        pendingApprovals: pendingApprovals.length
      },
      allKpisStatus: {
        DRAFT: allKpis.filter(k => k.status === 'DRAFT').length,
        WAITING_LINE_MGR: allKpis.filter(k => k.status === 'WAITING_LINE_MGR').length,
        WAITING_MANAGER: allKpis.filter(k => k.status === 'WAITING_MANAGER').length,
        APPROVED: allKpis.filter(k => k.status === 'APPROVED').length,
        REJECTED: allKpis.filter(k => k.status === 'REJECTED').length
      },
      waitingKpis: waitingKpis.map(kpi => ({
        id: kpi.id,
        title: kpi.title,
        status: kpi.status,
        userId: kpi.userId,
        ownerName: allUsers.find(u => u.id === kpi.userId)?.name,
        ownerEmail: allUsers.find(u => u.id === kpi.userId)?.email,
        ownerRole: allUsers.find(u => u.id === kpi.userId)?.role,
        submittedAt: kpi.submittedAt,
        hasPendingApproval: pendingApprovals.some(a => a.entityId === kpi.id)
      })),
      pendingApprovals: pendingApprovals.map(a => ({
        id: a.id,
        entityId: a.entityId,
        entityType: a.entityType,
        kpiTitle: waitingKpis.find(k => k.id === a.entityId)?.title || 'N/A',
        approverId: a.approverId,
        approverName: allUsers.find(u => u.id === a.approverId)?.name,
        approverEmail: allUsers.find(u => u.id === a.approverId)?.email,
        approverRole: allUsers.find(u => u.id === a.approverId)?.role,
        status: a.status,
        level: a.level,
        createdAt: a.createdAt
      })),
      allApprovalsSummary: {
        total: allApprovals.length,
        pending: allApprovals.filter(a => a.status === 'PENDING').length,
        approved: allApprovals.filter(a => a.status === 'APPROVED').length,
        rejected: allApprovals.filter(a => a.status === 'REJECTED').length,
        cancelled: allApprovals.filter(a => a.status === 'CANCELLED').length
      },
      users: allUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        managerId: u.managerId,
        managerName: allUsers.find(m => m.id === u.managerId)?.name
      })),
      mismatchCheck: {
        kpisWaitingWithoutApproval: waitingKpis.filter(kpi =>
          !pendingApprovals.some(a => a.entityId === kpi.id)
        ).map(kpi => ({
          id: kpi.id,
          title: kpi.title,
          owner: allUsers.find(u => u.id === kpi.userId)?.email
        })),
        approvalsWithoutKpi: pendingApprovals.filter(a =>
          !waitingKpis.some(k => k.id === a.entityId)
        ).map(a => ({
          id: a.id,
          entityId: a.entityId,
          approver: allUsers.find(u => u.id === a.approverId)?.email
        }))
      }
    }

    return NextResponse.json({
      success: true,
      debug,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('DEBUG /api/debug/approvals error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch debug info', details: error.message },
      { status: 500 }
    )
  }
}
