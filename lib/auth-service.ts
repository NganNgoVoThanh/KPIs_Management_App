// lib/auth-service.ts
import type { User, UserRole } from './types'

interface AuthorizedUser {
  email: string
  name: string
  role: UserRole
  department: string
  employeeId: string
}

// Danh sách users với quyền truy cập
const AUTHORIZED_USERS: AuthorizedUser[] = [
  {
    email: 'hr@intersnack.com.vn',
    name: 'Nguyễn Thị Hương',
    role: 'HR',
    department: 'Human Resources',
    employeeId: 'VICC-HR-001'
  },
  {
    email: 'admin@intersnack.com.vn',
    name: 'Trần Văn Nam',
    role: 'ADMIN',
    department: 'IT',
    employeeId: 'VICC-IT-001'
  },
  {
    email: 'staff@intersnack.com.vn',
    name: 'Lê Thị Mai',
    role: 'STAFF',
    department: 'R&D',
    employeeId: 'VICC-RD-001'
  },
  {
    email: 'linemanager@intersnack.com.vn',
    name: 'Phạm Văn Đức',
    role: 'LINE_MANAGER',
    department: 'Production',
    employeeId: 'VICC-PD-001'
  },
  {
    email: 'hod@intersnack.com.vn',
    name: 'Võ Thị Lan',
    role: 'HEAD_OF_DEPT',
    department: 'Quality',
    employeeId: 'VICC-QA-001'
  },
  {
    email: 'bod@intersnack.com.vn',
    name: 'Nguyễn Văn Long',
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
   * Check if user has specific permission
   */
  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser()
    if (!user) return false

    const permissions: Record<UserRole, string[]> = {
      'HR': ['manage_templates', 'view_all_kpis', 'manage_cycles', 'generate_reports'],
      'ADMIN': ['*'], // All permissions
      'STAFF': ['view_own_kpis', 'submit_kpis', 'update_actuals'],
      'LINE_MANAGER': ['approve_level_1', 'view_team_kpis', 'submit_kpis'],
      'HEAD_OF_DEPT': ['approve_level_2', 'view_dept_kpis', 'manage_dept_templates'],
      'BOD': ['approve_level_3', 'view_all_kpis', 'strategic_decisions']
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
   * Check if user has admin role
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
      'STAFF': 'user-VICC-PD-001', // Reports to Line Manager
      'LINE_MANAGER': 'user-VICC-QA-001', // Reports to HoD
      'HEAD_OF_DEPT': 'user-VICC-EX-001', // Reports to BOD
      'HR': 'user-VICC-EX-001', // Reports to BOD
      'ADMIN': undefined,
      'BOD': undefined
    }
    return managerMap[role]
  }

  private clearUserData(): void {
    // Clear all user-specific data from localStorage
    const keysToKeep = ['vicc_kpi_templates', 'vicc_kpi_cycles']
    const allKeys = Object.keys(localStorage)
    
    allKeys.forEach(key => {
      if (!keysToKeep.includes(key) && key.startsWith('vicc_')) {
        localStorage.removeItem(key)
      }
    })
  }

  private logActivity(action: string, userId: string): void {
    const activities = JSON.parse(localStorage.getItem('vicc_auth_activities') || '[]')
    activities.push({
      action,
      userId,
      timestamp: new Date().toISOString(),
      ip: 'localhost', // In production, get real IP
      userAgent: navigator.userAgent
    })
    
    // Keep only last 100 activities
    if (activities.length > 100) {
      activities.splice(0, activities.length - 100)
    }
    
    localStorage.setItem('vicc_auth_activities', JSON.stringify(activities))
  }
}

export const authService = new AuthService()

// Export helper functions for backward compatibility
export function getCurrentUser(): User | null {
  return authService.getCurrentUser()
}

export function isAuthenticated(): boolean {
  return authService.isAuthenticated()
}

export function hasPermission(permission: string): boolean {
  return authService.hasPermission(permission)
}