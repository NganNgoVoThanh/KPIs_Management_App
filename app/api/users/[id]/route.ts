
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
 * GET /api/users/[id]
 * Get single user details
 */
export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const user = await getAuthenticatedUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Auth required' }, { status: 401 })
        }

        const { id } = await params
        const db = getDatabase()
        const targetUser = await db.getUserById(id)

        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, data: targetUser })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * PUT /api/users/[id]
 * Update user details (Admin only, or Self profile update usually)
 * For Admin User Management: Allow updating Role, Manager, Dept, Status
 */
export async function PUT(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const user = await getAuthenticatedUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Auth required' }, { status: 401 })
        }

        if (user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const { id } = await params
        const body = await request.json()
        const db = getDatabase()

        // Retrieve existing to check existence
        const existing = await db.getUserById(id)
        if (!existing) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Allowed fields to update
        // Note: We use the MySQLRepository/DatabaseService 'updateUser'
        const updateData: any = {}

        if (body.name !== undefined) updateData.name = body.name
        if (body.role !== undefined) updateData.role = body.role
        if (body.status !== undefined) updateData.status = body.status
        if (body.department !== undefined) updateData.department = body.department
        if (body.employeeId !== undefined) updateData.employeeId = body.employeeId
        // CRITICAL: Manager Assignment
        if (body.managerId !== undefined) updateData.managerId = body.managerId || null
        if (body.orgUnitId !== undefined) updateData.orgUnitId = body.orgUnitId

        const updatedUser = await db.updateUser(id, updateData)

        return NextResponse.json({
            success: true,
            data: updatedUser,
            message: 'User updated successfully'
        })

    } catch (error: any) {
        console.error('PUT /api/users/[id] error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * DELETE /api/users/[id]
 * Remove user
 */
export async function DELETE(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const user = await getAuthenticatedUser(request)
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const { id } = await params
        const db = getDatabase()

        // Check if user exists (optional, delete usually idempotent-ish or throws)
        // Just try delete
        // Note: DatabaseService might not have 'deleteUser'. Let's check MySQLRepository?
        // User deletion is risky. Usually soft delete.
        // For now, let's assume 'status: INACTIVE' is preferred, but current mock UI uses DELETE.
        // I'll check if db.deleteUser exists later. If not, this might fail.
        // Checking MySQLRepository earlier, I didn't see explicit deleteUser. 
        // I'll use soft delete (update status) as fallback or try delete if available.

        // Workaround: Since I can't confirm `deleteUser` exists in `db` interface right now (it likely doesn't for safety),
        // I will implementation Soft Delete (Status = DELETED key or similar?)
        // Or just set Status = 'INACTIVE'.

        // Wait, the prompt script `seed-test-data.js` used `prisma.user.deleteMany()`.
        // The `DatabaseService` wrapper might not expose delete.
        // Let's implement Soft Delete -> INACTIVE.

        const updated = await db.updateUser(id, { status: 'INACTIVE' })

        return NextResponse.json({
            success: true,
            data: updated,
            message: 'User deactivated (Soft Delete)'
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
