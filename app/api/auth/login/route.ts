// app/api/auth/login/route.ts - Real Database Authentication
import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/db'
import type { User, UserRole } from '@/lib/types'

const db = new DatabaseService()

/**
 * Determine role based on email address
 * Rules:
 * - admin@intersnack.com.vn → ADMIN (Full access + Proxy approval)
 * - linemanager@intersnack.com.vn → LINE_MANAGER (L1 Approver - Direct Manager)
 * - hod@intersnack.com.vn → MANAGER (L2 Approver - Final approval)
 * - Any other @intersnack.com.vn → STAFF
 */
function getRoleFromEmail(email: string): UserRole {
  const lowerEmail = email.toLowerCase()

  if (lowerEmail === 'admin@intersnack.com.vn') return 'ADMIN'
  if (lowerEmail === 'linemanager@intersnack.com.vn' || lowerEmail.includes('queanh')) return 'LINE_MANAGER'
  if (lowerEmail === 'hod@intersnack.com.vn') return 'MANAGER'
  if (lowerEmail.endsWith('@intersnack.com.vn')) return 'STAFF'

  // Special case for demo
  if (lowerEmail.includes('manager')) return 'LINE_MANAGER'

  throw new Error('Invalid email domain. Please use your Intersnack company email.')
}

/**
 * Extract display name from email
 * Example: ngan.ngo@intersnack.com.vn → Ngan Ngo
 * Special accounts get proper display names
 */
function getDisplayNameFromEmail(email: string): string {
  const lowerEmail = email.toLowerCase()

  // For special accounts, return proper display names
  if (lowerEmail === 'admin@intersnack.com.vn') return 'Admin'
  if (lowerEmail === 'linemanager@intersnack.com.vn') return 'Line Manager'
  if (lowerEmail === 'hod@intersnack.com.vn') return 'Manager (HOD)'
  if (lowerEmail.includes('queanh')) return 'Pham Thi Que Anh'

  // For regular users, extract name from email prefix
  const username = email.split('@')[0]
  const parts = username.split('.')

  return parts
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/**
 * Generate employee ID from email
 * Example: ngan.ngo@intersnack.com.vn → VICC-NN-001
 * Special accounts get fixed IDs
 */
function generateEmployeeId(email: string): string {
  const lowerEmail = email.toLowerCase()

  // Fixed IDs for special accounts
  if (lowerEmail === 'admin@intersnack.com.vn') return 'VICC-ADMIN-000'
  if (lowerEmail === 'linemanager@intersnack.com.vn') return 'VICC-LM-000'
  if (lowerEmail === 'hod@intersnack.com.vn') return 'VICC-HOD-000'

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
      // Also update role if it was detected incorrectly before for demo users
      const updates: any = {
        lastLoginAt: new Date().toISOString()
      };

      // Fix for demo users with wrong role
      if (lowerEmail.includes('queanh') && user.role !== 'LINE_MANAGER') {
        updates.role = 'LINE_MANAGER';
        updates.department = 'Human Resources';
      }

      user = await db.updateUser(user.id, updates)

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
        'LINE_MANAGER': 'Management', // Default
        'STAFF': 'General'
      }

      let department = departmentMap[role];
      if (lowerEmail.includes('queanh')) {
        department = 'Human Resources';
      }

      user = await db.createUser({
        email: lowerEmail,
        name: displayName,
        role,
        orgUnitId: orgUnit[0].id,
        department,
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
