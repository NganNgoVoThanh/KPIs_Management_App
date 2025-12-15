
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

        const { action, comment } = await request.json()
        // action: 'APPROVE' | 'REJECT'

        const db = getDatabase()
        const approval = await db.getApprovalById(params.id)

        if (!approval) {
            return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
        }

        if (approval.approverId !== user.id && user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        if (approval.status !== 'PENDING') {
            return NextResponse.json({ error: 'Approval already processed' }, { status: 400 })
        }

        const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED'

        // Update Approval
        await db.updateApproval(params.id, {
            status: newStatus,
            comment: comment,
            respondedAt: new Date()
        })

        // Update Entity Status
        if (approval.entityType === 'KPI') {
            const kpiStatus = action === 'APPROVE' ? 'ACTIVE' : 'REJECTED'
            await db.updateKpiDefinition(approval.entityId, {
                status: kpiStatus
            })

            // Get KPI to find owner
            const kpi = await db.getKpiDefinitionById(approval.entityId)

            // Notify Owner
            if (kpi) {
                await db.createNotification({
                    userId: kpi.userId,
                    type: 'APPROVAL_DECISION',
                    title: `KPI ${action === 'APPROVE' ? 'Approved' : 'Rejected'}`,
                    message: `Your KPI "${kpi.title}" has been ${action === 'APPROVE' ? 'approved' : 'rejected'} by ${user.name}.${comment ? ` Comment: ${comment}` : ''}`,
                    priority: 'MEDIUM',
                    status: 'UNREAD',
                    actionRequired: false,
                    actionUrl: `/kpis`
                })
            }
        }
        // Handle other entity types (ACTUALS) if needed
        else if (approval.entityType === 'ACTUAL') {
            // ... logic for actuals
        }

        return NextResponse.json({ success: true, message: `Request ${newStatus}` })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
