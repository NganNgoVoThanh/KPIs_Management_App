// app/api/users/route.ts - Users Management API
import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-service'
import { db } from '@/lib/db'

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic'


/**
 * GET /api/users
 * Get users with optional filters
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

    const { searchParams } = new URL(request.url)
    const filters: any = {}

    if (searchParams.get('role')) filters.role = searchParams.get('role')!
    if (searchParams.get('department')) filters.department = searchParams.get('department')!
    if (searchParams.get('status')) filters.status = searchParams.get('status')!

    const users = await db.getUsers(filters)

    return NextResponse.json({
      success: true,
      data: users,
      count: users.length
    })
  } catch (error: any) {
    console.error('GET /api/users error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/users
 * Create a new user (Admin only)
 */
export async function POST(request: NextRequest) {
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
        { error: 'Only administrators can create users' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, name, role, orgUnitId, department, employeeId, managerId } = body

    // Validation
    if (!email || !name || !role || !orgUnitId) {
      return NextResponse.json(
        { error: 'Missing required fields: email, name, role, orgUnitId' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existing = await db.getUserByEmail(email)
    if (existing) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Create user
    const newUser = await db.createUser({
      email,
      name,
      role,
      orgUnitId,
      department: department || null,
      employeeId: employeeId || null,
      managerId: managerId || null,
      status: 'ACTIVE',
      locale: 'vi-VN',
    })

    return NextResponse.json({
      success: true,
      data: newUser,
      message: 'User created successfully'
    }, { status: 201 })

  } catch (error: any) {
    console.error('POST /api/users error:', error)
    return NextResponse.json(
      { error: 'Failed to create user', details: error.message },
      { status: 500 }
    )
  }
}
