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
    console.log('[AUTH-SERVER] ==================== AUTHENTICATION CHECK ====================')
    // Only log URL in development to avoid static rendering issues
    if (process.env.NODE_ENV === 'development') {
      console.log('[AUTH-SERVER] Request URL:', request.url)
    }
    console.log('[AUTH-SERVER] Request Method:', request.method)

    // Log all headers for debugging
    const allHeaders: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      if (key.toLowerCase().includes('user') || key.toLowerCase().includes('auth')) {
        allHeaders[key] = value
      }
    })
    console.log('[AUTH-SERVER] Relevant headers:', allHeaders)

    // Option 1: Get from Authorization header
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      console.log('[AUTH-SERVER] Bearer token found (not used in current implementation)')
      // In production, verify JWT token here
      // For now, we'll use a simple approach with user data in header
    }

    // Option 2: Get user ID from custom header (temporary solution)
    const userIdHeader = request.headers.get('x-user-id')
    console.log('[AUTH-SERVER] x-user-id header value:', userIdHeader)

    if (userIdHeader) {
      console.log('[AUTH-SERVER] Fetching user from database with ID:', userIdHeader)

      // Fetch user from database by ID
      const { DatabaseService } = await import('./db')
      const db = new DatabaseService()
      const user = await db.getUserById(userIdHeader)

      if (user) {
        console.log('[AUTH-SERVER] ✅ User found in database!')
        console.log('[AUTH-SERVER] User ID:', user.id)
        console.log('[AUTH-SERVER] User Email:', user.email)
        console.log('[AUTH-SERVER] User Role:', user.role)
        console.log('[AUTH-SERVER] User Status:', user.status)

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

        console.log('[AUTH-SERVER] ✅ Returning authenticated user with role:', authenticatedUser.role)
        console.log('[AUTH-SERVER] ================================================================')
        return authenticatedUser
      } else {
        console.error('[AUTH-SERVER] ❌ No user found in database for ID:', userIdHeader)
        console.error('[AUTH-SERVER] Database lookup failed. User file might not exist.')
        console.error('[AUTH-SERVER] Expected file: .local-storage/users/' + userIdHeader + '.json')
      }
    } else {
      console.error('[AUTH-SERVER] ❌ No x-user-id header found in request!')
      console.error('[AUTH-SERVER] Client did not send authentication header.')
    }

    // Option 3: Get from cookie (recommended for production)
    // const cookieStore = cookies()
    // const sessionCookie = cookieStore.get('vicc_session')
    // if (sessionCookie) {
    //   // Verify session and get user
    // }

    console.log('[AUTH-SERVER] ❌ Authentication failed - returning null')
    console.log('[AUTH-SERVER] ================================================================')
    return null
  } catch (error) {
    console.error('[AUTH-SERVER] ❌ ERROR during authentication:', error)
    console.error('[AUTH-SERVER] ================================================================')
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
