// app/api/cycles/[id]/actions/route.ts - Cycle Actions (Open, Close, Activate)
import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-service'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/cycles/[id]/actions
 * Perform actions on cycle: open, close, activate
 * Body: { action: 'open' | 'close' | 'activate' }
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

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can perform cycle actions' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { action } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    const cycle = await db.getCycleById(id)
    if (!cycle) {
      return NextResponse.json(
        { error: 'Cycle not found' },
        { status: 404 }
      )
    }

    let updateData: any = { updatedAt: new Date() }
    let message = ''

    switch (action) {
      case 'open':
        // Open cycle for KPI creation
        if (cycle.status !== 'DRAFT') {
          return NextResponse.json(
            { error: 'Can only open cycles in DRAFT status' },
            { status: 400 }
          )
        }

        updateData.status = 'OPEN'
        updateData.openedAt = new Date()
        message = 'Cycle opened successfully. Users can now create KPIs.'

        // Get all users in target group
        const targetUsers = cycle.targetUsers as any || {}
        const userIds = targetUsers.userIds || []

        // Create notifications for all target users
        if (userIds.length > 0) {
          for (const userId of userIds) {
            await db.createNotification({
              userId,
              type: 'CYCLE_OPENED',
              title: 'KPI Cycle Opened',
              message: `The KPI cycle "${cycle.name}" is now open. Please set your KPIs.`,
              priority: 'HIGH',
              status: 'UNREAD',
              actionRequired: true,
              actionUrl: '/kpis/create',
              metadata: {
                cycleId: cycle.id,
                cycleName: cycle.name
              },
              createdAt: new Date()
            })
          }
        }
        break

      case 'activate':
        // Activate cycle (make it the active one)
        if (cycle.status === 'CLOSED') {
          return NextResponse.json(
            { error: 'Cannot activate a closed cycle' },
            { status: 400 }
          )
        }

        // Deactivate other active cycles
        const activeCycles = await db.getCycles('ACTIVE')
        for (const activeCycle of activeCycles) {
          if (activeCycle.id !== id) {
            await db.updateCycle(activeCycle.id, { status: 'INACTIVE' })
          }
        }

        updateData.status = 'ACTIVE'
        message = 'Cycle activated successfully.'
        break

      case 'close':
        // Close cycle (no more changes allowed)
        if (cycle.status === 'CLOSED') {
          return NextResponse.json(
            { error: 'Cycle is already closed' },
            { status: 400 }
          )
        }

        updateData.status = 'CLOSED'
        updateData.closedAt = new Date()
        message = 'Cycle closed successfully. No more changes allowed.'
        break

      case 'lock_goals':
        // Lock all KPI goals (no more goal changes, only actuals)
        if (cycle.status !== 'ACTIVE') {
          return NextResponse.json(
            { error: 'Can only lock goals for active cycles' },
            { status: 400 }
          )
        }

        // Lock all approved KPIs in this cycle
        const kpis = await db.getKpiDefinitions({
          cycleId: id,
          status: 'APPROVED'
        })

        for (const kpi of kpis) {
          await db.updateKpiDefinition(kpi.id, {
            status: 'LOCKED_GOALS',
            lockedAt: new Date()
          })
        }

        message = `Locked ${kpis.length} KPI goal(s). Users can now enter actuals.`
        break

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}` },
          { status: 400 }
        )
    }

    const updated = await db.updateCycle(id, updateData)

    // Create audit log
    await db.createAuditLog({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      entityType: 'CYCLE',
      entityId: id,
      action: `CYCLE_${action.toUpperCase()}`,
      beforeData: { status: cycle.status },
      afterData: { status: updated.status },
      createdAt: new Date()
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message
    })

  } catch (error: any) {
    console.error(`POST /api/cycles/[id]/actions error:`, error)
    return NextResponse.json(
      { error: 'Failed to perform cycle action', details: error.message },
      { status: 500 }
    )
  }
}
