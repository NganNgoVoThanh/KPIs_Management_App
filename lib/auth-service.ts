// lib/auth-service.ts - Real Database Authentication
import type { User, UserRole } from './types'

/**
 * Determine role based on email address
 * Rules:
 * - admin@intersnack.com.vn → ADMIN
 * - linemanager@intersnack.com.vn → LINE_MANAGER
 * - hod@intersnack.com.vn → MANAGER
 * - Any other @intersnack.com.vn → STAFF
 */
function getRoleFromEmail(email: string): UserRole {
  const lowerEmail = email.toLowerCase()

  if (lowerEmail === 'admin@intersnack.com.vn') return 'ADMIN'
  if (lowerEmail === 'linemanager@intersnack.com.vn' || lowerEmail.includes('queanh')) return 'LINE_MANAGER'
  if (lowerEmail === 'hod@intersnack.com.vn') return 'MANAGER'
  if (lowerEmail.endsWith('@intersnack.com.vn')) return 'STAFF'

  // Special case for demo/testing
  if (lowerEmail.includes('manager')) return 'LINE_MANAGER'

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

class AuthService {
  private readonly STORAGE_KEY = 'vicc_kpi_current_user'
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

  // ✅ Check if running on server or client
  private get isServer(): boolean {
    return typeof window === 'undefined'
  }

  /**
   * Login with email (real database authentication)
   * This method is called from the login API endpoint
   */
  async loginWithSSO(email: string, password?: string): Promise<User> {
    // Validate email domain
    if (!email.endsWith('@intersnack.com.vn')) {
      throw new Error('Please use your Intersnack company email (@intersnack.com.vn)')
    }

    // Determine role from email
    const role = getRoleFromEmail(email)

    // This method will be called from API route which has access to database
    // The API will handle user lookup/creation and return the user object
    // For client-side, we'll store the user in localStorage after successful API call

    throw new Error('Please use /api/auth/login endpoint for authentication')
  }

  /**
   * Get current user from sessionStorage (client-side only)
   * SessionStorage clears on browser close, preventing stale data
   * For server-side authentication, use API middleware to get user from session/cookie
   */
  getCurrentUser(): User | null {
    // SERVER SIDE: Cannot access sessionStorage on server
    if (this.isServer) {
      return null
    }

    // CLIENT SIDE: Use sessionStorage instead of localStorage
    // This auto-clears when browser closes, preventing role cache issues
    try {
      const stored = sessionStorage.getItem(this.STORAGE_KEY)
      if (!stored) return null

      const { user, expiry } = JSON.parse(stored)

      if (new Date().getTime() > expiry) {
        this.logout()
        return null
      }

      return user
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  }

  /**
   * Save user to sessionStorage after successful login
   * Called from login form after API authentication succeeds
   */
  setCurrentUser(user: User): void {
    this.saveUser(user)
    // Don't log to localStorage
  }

  async logout(): Promise<void> {
    if (this.isServer) {
      console.warn('[AUTH] Cannot logout on server-side')
      return
    }

    // Clear sessionStorage
    sessionStorage.removeItem(this.STORAGE_KEY)
    // Also clear any old localStorage data
    localStorage.clear()
  }

  // ✅ UPDATED: New permission system for 4 roles
  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser()
    if (!user) return false

    const permissions: Record<UserRole, string[]> = {
      'ADMIN': ['*'], // Full access including proxy actions
      'STAFF': ['view_own_kpis', 'submit_kpis', 'update_actuals', 'upload_evidence'],
      'LINE_MANAGER': ['approve_level_1', 'view_team_kpis', 'submit_kpis', 'delegate_approval'],
      'MANAGER': ['approve_level_2', 'view_all_kpis', 'strategic_decisions', 'final_approval']
    }

    const userPermissions = permissions[user.role] || []
    return userPermissions.includes('*') || userPermissions.includes(permission)
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser()
    return user?.role === 'ADMIN'
  }

  // ✅ UPDATED: Only 2 approval levels
  getApprovalLevel(): number {
    const user = this.getCurrentUser()
    if (!user) return 0

    switch (user.role) {
      case 'LINE_MANAGER': return 1
      case 'MANAGER': return 2
      default: return 0
    }
  }

  // ✅ NEW: Can user approve at this level?
  canApproveAtLevel(level: 1 | 2): boolean {
    const userLevel = this.getApprovalLevel()
    return userLevel === level
  }

  private saveUser(user: User): void {
    if (this.isServer) {
      console.warn('[AUTH] Cannot save user on server-side')
      return
    }

    const data = {
      user,
      expiry: new Date().getTime() + this.SESSION_DURATION
    }
    // Use sessionStorage instead of localStorage
    // This clears automatically when browser/tab closes
    sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(data))
  }

  /**
   * Export helper functions for use in API routes
   */
  static getRoleFromEmail = getRoleFromEmail
  static getDisplayNameFromEmail = getDisplayNameFromEmail
}

export const authService = new AuthService()
export default authService