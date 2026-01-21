// app/api/users/route.ts - Users Management API
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-server'
import { getDatabase } from '@/lib/repositories/DatabaseFactory'

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic'


/**
 * GET /api/users
 * Get users with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
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

    const db = getDatabase()
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
    const user = await getAuthenticatedUser(request)
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

    const db = getDatabase()

    // Check if email already exists
    const existing = await db.getUserByEmail(email)
    if (existing) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Create user
    // Normalize empty strings to null to avoid Unique constraint checks on "" strings
    const safeEmployeeId = employeeId && employeeId.trim().length > 0 ? employeeId.trim() : null;
    const safeManagerId = managerId && managerId.trim().length > 0 ? managerId.trim() : null;
    const safeDepartment = department && department.trim().length > 0 ? department.trim() : null;

    // [CRITICAL FIX] Handle OrgUnitId foreign key constraint
    // If orgUnitId is dummy "default-org" or missing, resolve it dynamically
    let finalOrgUnitId = orgUnitId;

    // [CRITICAL FIX] Handle OrgUnitId foreign key constraint
    // If orgUnitId is missing or a placeholder, create a new OrgUnit for the department


    if (!finalOrgUnitId || finalOrgUnitId === 'default-org' || finalOrgUnitId === 'org-1') {
      console.log('[CREATE-USER] Invalid OrgUnitId provided. Attempting to auto-create OrgUnit...');

      const targetDeptName = department && department.trim().length > 0 ? department.trim() : 'General';

      try {
        // Create a new OrgUnit for this department
        // Priority 1: Check if Name already exists in OrgUnits (to reuse existing ID)
        // Since `createOrgUnit` might just create duplicate, we want to FIND first.
        // We lack a direct `findOrgUnitByName` method on `db` wrapper, so we iterate or just create.
        // BUT, if users say "Process RD" exists, maybe they typed it exactly.

        // Let's try to fetch all org units first to find a match (assuming list is small)
        const allOrgs = await db.getOrgUnits();
        const existingOrg = allOrgs.find((o: any) => o.name.toLowerCase() === targetDeptName.toLowerCase());

        if (existingOrg) {
          finalOrgUnitId = existingOrg.id;
          console.log(`[CREATE-USER] Found existing OrgUnit: ${targetDeptName} (${finalOrgUnitId})`);
        } else {
          // Create new if not found
          const newOrg = await db.createOrgUnit({
            name: targetDeptName,
            type: 'DEPARTMENT',
            parentId: null
          });
          finalOrgUnitId = newOrg.id;
          console.log(`[CREATE-USER] Auto-created OrgUnit: ${targetDeptName} (${finalOrgUnitId})`);
        }

      } catch (err) {
        console.error('[CREATE-USER] Failed to auto-create OrgUnit:', err);
        // If this fails, we let it proceed to fail at createUser level with original error
      }
    }

    // Logic handled above
    if (!finalOrgUnitId) {
      // If auto-create failed, maybe try to fetch ALL and pick first? 
      // or just fail. 
      // Let's rely on the auto-creation above.
    }

    // Create user with VALID finalOrgUnitId
    const newUser = await db.createUser({
      email,
      name,
      role,
      orgUnitId: finalOrgUnitId!, // Should be valid now
      department: safeDepartment,
      employeeId: safeEmployeeId,
      managerId: safeManagerId,
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
