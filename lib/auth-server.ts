// lib/auth-server.ts - Server-side authentication helpers
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import type { User } from './types'

/**
 * Get authenticated user from request
 * For server-side API routes
 *
 * Currently uses a simple approach - in production you'd use:
 * - JWT tokens in HTTP-only cookies
 * - Session management
 * - OAuth/OIDC tokens
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<User | null> {
  try {
    // Option 1: Get from Authorization header (Bearer token)
    // const authHeader = request.headers.get('authorization')
    // if (authHeader && authHeader.startsWith('Bearer ')) {
    //   // Verify JWT here
    // }

    // Option 2: Get user ID from custom header (x-user-id) - Used for this prototype
    const userIdHeader = request.headers.get('x-user-id')

    if (userIdHeader) {
      // Fetch user from database by ID
      const { DatabaseService } = await import('./db')
      const db = new DatabaseService()
      const user = await db.getUserById(userIdHeader)

      if (user) {
        // Handle both Date objects (from MySQL) and string dates (from local storage)
        const createdAt = user.createdAt instanceof Date
          ? user.createdAt.toISOString()
          : user.createdAt || new Date().toISOString()

        const lastLoginAt = user.lastLoginAt instanceof Date
          ? user.lastLoginAt.toISOString()
          : user.lastLoginAt || new Date().toISOString()

        const authenticatedUser = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as any,
          orgUnitId: user.orgUnitId,
          department: user.department || '',
          employeeId: user.employeeId || '',
          managerId: user.managerId || undefined,
          status: user.status,
          locale: user.locale,
          createdAt,
          lastLoginAt
        }
        return authenticatedUser
      }
    }

    return null
  } catch (error) {
    console.error('[AUTH-SERVER] Auth Error:', error)
    return null
  }
}

/**
 * Require authentication - throw error if not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<User> {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}

/**
 * Check if user has specific role
 */
export function hasRole(user: User, ...roles: string[]): boolean {
  return roles.includes(user.role)
}

/**
 * Check if user can access another user's data
 */
export async function canAccessUserData(
  currentUser: User,
  targetUserId: string
): Promise<boolean> {
  // Admin can access all
  if (currentUser.role === 'ADMIN') return true

  // Can access own data
  if (currentUser.id === targetUserId) return true

  // Managers can access their subordinates' data
  if (currentUser.role === 'MANAGER' || currentUser.role === 'LINE_MANAGER') {
    const { DatabaseService } = await import('./db')
    const db = new DatabaseService()
    const targetUser = await db.getUserById(targetUserId)

    if (targetUser && targetUser.managerId === currentUser.id) {
      return true
    }
  }

  return false
}
