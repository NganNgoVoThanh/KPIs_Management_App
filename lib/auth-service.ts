// lib/auth-service.ts - UPDATED: Admin role với đầy đủ quyền
import type { User, UserRole } from './types'

interface AuthorizedUser {
  email: string
  name: string
  role: UserRole
  department: string
  employeeId: string
}

// Danh sách users - UPDATED: Admin thay thế HR
const AUTHORIZED_USERS: AuthorizedUser[] = [
  {
    email: 'admin@intersnack.com.vn',
    name: 'Vu Van Tai',
    role: 'ADMIN',
    department: 'Administration',
    employeeId: 'VICC-ADM-001'
  },
  {
    email: 'staff@intersnack.com.vn',
    name: 'Ngo Vo Thanh Ngan',
    role: 'STAFF',
    department: 'R&D',
    employeeId: 'VICC-RD-001'
  },
  {
    email: 'linemanager@intersnack.com.vn',
    name: 'Dang Quoc Hung',
    role: 'LINE_MANAGER',
    department: 'R&D',
    employeeId: 'VICC-RD-002'
  },
  {
    email: 'hod@intersnack.com.vn',
    name: 'Nguyen Trung Viet',
    role: 'HEAD_OF_DEPT',
    department: 'Technical',
    employeeId: 'VICC-TECH-001'
  },
  {
    email: 'bod@intersnack.com.vn',
    name: 'Nguyen Viet Cuong',
    role: 'BOD',
    department: 'Executive',
    employeeId: 'VICC-EX-001'
  }
]

class AuthService {
  private readonly STORAGE_KEY = 'vicc_kpi_current_user'
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

  /**
   * Login with SSO (simulated)
   */
  async loginWithSSO(email: string, password?: string): Promise<User> {
    // Validate email domain
    if (!email.endsWith('@intersnack.com.vn')) {
      throw new Error('Please use your Intersnack company email (@intersnack.com.vn)')
    }

    // Find authorized user
    const authorizedUser = AUTHORIZED_USERS.find(u => u.email.toLowerCase() === email.toLowerCase())
    
    if (!authorizedUser) {
      throw new Error('Unauthorized. Please contact IT support for access.')
    }

    // Create user object
    const user: User = {
      id: `user-${authorizedUser.employeeId}`,
      email: authorizedUser.email,
      name: authorizedUser.name,
      role: authorizedUser.role,
      orgUnitId: `org-${authorizedUser.department.toLowerCase()}`,
      department: authorizedUser.department,
      employeeId: authorizedUser.employeeId,
      managerId: this.getManagerId(authorizedUser.role),
      status: 'ACTIVE',
      locale: 'vi-VN',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    }

    // Save to localStorage with expiry
    this.saveUser(user)
    
    // Log login activity
    this.logActivity('login', user.id)

    return user
  }

  /**
   * Get current logged in user
   */
  getCurrentUser(): User | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return null

      const { user, expiry } = JSON.parse(stored)
      
      // Check if session expired
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
   * Logout current user
   */
  async logout(): Promise<void> {
    const user = this.getCurrentUser()
    if (user) {
      this.logActivity('logout', user.id)
    }
    
    localStorage.removeItem(this.STORAGE_KEY)
    
    // Clear all user-related data
    this.clearUserData()
  }

  /**
   * Check if user has specific permission - UPDATED with Admin permissions
   */
  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser()
    if (!user) return false

    // Admin permissions - FULL ACCESS
    const permissions: Record<UserRole, string[]> = {
      'ADMIN': ['*'], // All permissions
      'STAFF': ['view_own_kpis', 'submit_kpis', 'update_actuals'],
      'LINE_MANAGER': ['approve_level_1', 'view_team_kpis', 'submit_kpis'],
      'HEAD_OF_DEPT': ['approve_level_2', 'view_dept_kpis', 'manage_dept_templates'],
      'BOD': ['approve_level_3', 'view_all_kpis', 'strategic_decisions'],
      HR: []
    }

    const userPermissions = permissions[user.role] || []
    return userPermissions.includes('*') || userPermissions.includes(permission)
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null
  }

  /**
   * Check if user has admin role - UPDATED
   */
  isAdmin(): boolean {
    const user = this.getCurrentUser()
    return user?.role === 'ADMIN'
  }

  /**
   * Get user's approval level
   */
  getApprovalLevel(): number {
    const user = this.getCurrentUser()
    if (!user) return 0

    switch (user.role) {
      case 'LINE_MANAGER': return 1
      case 'HEAD_OF_DEPT': return 2
      case 'BOD': return 3
      default: return 0
    }
  }

  /**
   * Private methods
   */
  private saveUser(user: User): void {
    const data = {
      user,
      expiry: new Date().getTime() + this.SESSION_DURATION
    }
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data))
  }

  private getManagerId(role: UserRole): string | undefined {
    const managerMap: Record<UserRole, string | undefined> = {
      'STAFF': 'user-VICC-RD-002', // Reports to Line Manager
      'LINE_MANAGER': 'user-VICC-TECH-001', // Reports to HoD
      'HEAD_OF_DEPT': 'user-VICC-EX-001', // Reports to BOD
      'ADMIN': undefined, // Admin không có manager
      'BOD': undefined,
      HR: undefined
    }
    return managerMap[role]
  }

  private logActivity(action: string, userId: string): void {
    const logs = JSON.parse(localStorage.getItem('auth_logs') || '[]')
    logs.push({
      action,
      userId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    })
    
    // Keep last 100 logs
    if (logs.length > 100) {
      logs.shift()
    }
    
    localStorage.setItem('auth_logs', JSON.stringify(logs))
  }

  private clearUserData(): void {
    // Clear all user-specific data
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('vicc_')) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }
}

export const authService = new AuthService()
export default authService