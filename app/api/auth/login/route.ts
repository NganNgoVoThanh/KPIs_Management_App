// app/api/auth/login/route.ts - Real Database Authentication
import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/db'
import type { User, UserRole } from '@/lib/types'

const db = new DatabaseService()

/**
 * Determine role based on email address
 * Rules:
 * - admin@intersnack.com.vn → ADMIN (L3 Approver - Final approval)
 * - hod@intersnack.com.vn → MANAGER (L2 Approver - Head of Department)
 * - line.manager@intersnack.com.vn → LINE_MANAGER (L1 Approver - Direct Manager)
 * - Any other @intersnack.com.vn → STAFF
 */
function getRoleFromEmail(email: string): UserRole {
  const lowerEmail = email.toLowerCase()

  if (lowerEmail === 'admin@intersnack.com.vn') return 'ADMIN'
  if (lowerEmail === 'hod@intersnack.com.vn') return 'MANAGER'
  if (lowerEmail === 'line.manager@intersnack.com.vn') return 'LINE_MANAGER'
  if (lowerEmail.endsWith('@intersnack.com.vn')) return 'STAFF'

  throw new Error('Invalid email domain. Please use your Intersnack company email.')
}

/**
 * Extract display name from email
 * Example: ngan.ngo@intersnack.com.vn → Ngan Ngo
 */
function getDisplayNameFromEmail(email: string): string {
  const username = email.split('@')[0]
  const parts = username.split('.')

  return parts
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/**
 * Generate employee ID from email
 * Example: ngan.ngo@intersnack.com.vn → VICC-NN-001
 */
function generateEmployeeId(email: string): string {
  const username = email.split('@')[0]
  const parts = username.split('.')

  // Get initials (first letter of each part)
  const initials = parts.map(p => p.charAt(0).toUpperCase()).join('')

  // Generate a random number for uniqueness
  const randomNum = Math.floor(Math.random() * 900) + 100

  return `VICC-${initials}-${randomNum}`
}

/**
 * Get manager ID based on role
 * STAFF → Line Manager
 * LINE_MANAGER → Manager
 * MANAGER → null
 * ADMIN → null
 */
async function getManagerIdForRole(role: UserRole): Promise<string | null> {
  try {
    if (role === 'STAFF') {
      // Find a Line Manager to assign
      const lineManager = await db.getUsers({ role: 'LINE_MANAGER', status: 'ACTIVE' })
      if (lineManager.length > 0) {
        return lineManager[0].id
      }
    } else if (role === 'LINE_MANAGER') {
      // Find a Manager to assign
      const manager = await db.getUsers({ role: 'MANAGER', status: 'ACTIVE' })
      if (manager.length > 0) {
        return manager[0].id
      }
    }
    return null
  } catch (error) {
    console.error('Error getting manager ID:', error)
    return null
  }
}

/**
 * POST /api/auth/login
 * Authenticate user with email and create/update user in database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    const lowerEmail = email.toLowerCase().trim()

    // Validate email domain
    if (!lowerEmail.endsWith('@intersnack.com.vn')) {
      return NextResponse.json(
        { success: false, error: 'Please use your Intersnack company email (@intersnack.com.vn)' },
        { status: 403 }
      )
    }

    // Determine role from email
    const role = getRoleFromEmail(lowerEmail)

    // Check if user exists in database
    let user = await db.getUserByEmail(lowerEmail)

    if (user) {
      // User exists - update last login
      user = await db.updateUser(user.id, {
        lastLoginAt: new Date().toISOString()
      })

      console.log(`[AUTH] User logged in: ${user.email} (${user.role})`)
    } else {
      // User doesn't exist - create new user (auto-provisioning)
      console.log(`[AUTH] Creating new user: ${lowerEmail} with role ${role}`)

      // Get or create default org unit
      let orgUnit = await db.getOrgUnits({ type: 'COMPANY' })
      if (orgUnit.length === 0) {
        // Create default org unit
        orgUnit = [await db.createOrgUnit({
          name: 'VICC - Intersnack Vietnam',
          type: 'COMPANY'
        })]
      }

      const displayName = getDisplayNameFromEmail(lowerEmail)
      const employeeId = generateEmployeeId(lowerEmail)
      const managerId = await getManagerIdForRole(role)

      // Determine department based on role
      const departmentMap: Record<UserRole, string> = {
        'ADMIN': 'Administration',
        'MANAGER': 'Executive',
        'LINE_MANAGER': 'Management',
        'STAFF': 'General'
      }

      user = await db.createUser({
        email: lowerEmail,
        name: displayName,
        role,
        orgUnitId: orgUnit[0].id,
        department: departmentMap[role],
        employeeId,
        managerId,
        status: 'ACTIVE',
        locale: 'vi-VN',
        lastLoginAt: new Date().toISOString()
      })

      console.log(`[AUTH] User created: ${user.email} (${user.role})`)
    }

    // Convert database user to User type for response
    // Handle both Date objects (from MySQL) and string dates (from local storage)
    const createdAt = user.createdAt instanceof Date
      ? user.createdAt.toISOString()
      : user.createdAt || new Date().toISOString()

    const lastLoginAt = user.lastLoginAt instanceof Date
      ? user.lastLoginAt.toISOString()
      : user.lastLoginAt || new Date().toISOString()

    const userResponse: User = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      orgUnitId: user.orgUnitId,
      department: user.department || 'General',
      employeeId: user.employeeId || '',
      managerId: user.managerId || undefined,
      status: user.status,
      locale: user.locale,
      createdAt,
      lastLoginAt
    }

    return NextResponse.json({
      success: true,
      data: userResponse,
      message: `Welcome, ${user.name}!`
    })

  } catch (error: any) {
    console.error('[AUTH] Login error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Authentication failed'
      },
      { status: 500 }
    )
  }
}
