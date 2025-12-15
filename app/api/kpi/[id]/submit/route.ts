
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-server'
import { getDatabase } from '@/lib/repositories/DatabaseFactory'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Auth required' }, { status: 401 })
    }

    const db = getDatabase()
    const kpi = await db.getKpiDefinitionById(params.id)

    if (!kpi) {
      return NextResponse.json({ error: 'KPI not found' }, { status: 404 })
    }

    if (kpi.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (kpi.status !== 'DRAFT' && kpi.status !== 'REJECTED') {
      return NextResponse.json({ error: 'Only DRAFT/REJECTED KPIs can be submitted' }, { status: 400 })
    }

    // Identify approver (Line Manager)
    // For demo, if no manager, auto-approve or assign to ADMIN
    const approver = await db.getUserById(user.managerId || user.id) // Fallback to self/admin if no manager for demo

    // Update KPI Status
    await db.updateKpiDefinition(params.id, {
      status: 'WAITING_APPROVAL'
    })

    // Create Approval Request
    await db.createApproval({
      entityType: 'KPI',
      entityId: kpi.id,
      approverId: approver.id,
      status: 'PENDING',
      level: 1,
      createdAt: new Date()
    })

    // Notify Approver
    await db.createNotification({
      userId: approver.id,
      type: 'APPROVAL_REQUEST',
      title: 'New KPI Approval Request',
      message: `${user.name} has submitted a KPI for your approval: ${kpi.title}`,
      priority: 'HIGH',
      status: 'UNREAD',
      actionRequired: true,
      actionUrl: `/approvals`
    })

    return NextResponse.json({ success: true, message: 'Submitted for approval' })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}