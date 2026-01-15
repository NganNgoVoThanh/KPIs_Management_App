
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-server'
import { getDatabase } from '@/lib/repositories/DatabaseFactory'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') || undefined
        const parentId = searchParams.get('parentId') || undefined

        const db = getDatabase()
        const orgUnits = await db.getOrgUnits({
            type,
            parentId
        })

        return NextResponse.json({
            success: true,
            data: orgUnits
        })

    } catch (error: any) {
        console.error('GET /api/org-units error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch org units', details: error.message },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser(request)
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const body = await request.json()
        // Validation
        if (!body.name || !body.type) {
            return NextResponse.json({ error: 'Name and Type are required' }, { status: 400 })
        }

        const db = getDatabase()
        const newOrgUnit = await db.createOrgUnit({
            name: body.name,
            type: body.type,
            parentId: body.parentId || null,
            managerId: body.managerId || null,
            description: body.description || null
        })

        return NextResponse.json({
            success: true,
            data: newOrgUnit,
            message: 'Organization Unit created successfully'
        }, { status: 201 })

    } catch (error: any) {
        console.error('POST /api/org-units error:', error)
        return NextResponse.json(
            { error: 'Failed to create org unit', details: error.message },
            { status: 500 }
        )
    }
}
