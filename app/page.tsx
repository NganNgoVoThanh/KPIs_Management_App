"use client"

import { useState, useEffect } from "react"
import { LoginForm } from "@/components/auth/login-form"
import { Sidebar } from "@/components/layout/sidebar"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { QuickActions } from "@/components/dashboard/quick-actions"
import type { User } from "@/lib/types"
import { authService } from "@/lib/auth-service"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const currentUser = authService.getCurrentUser()
    setUser(currentUser)
    setIsLoading(false)
  }, [])

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser)
    // Reload to update all components
    window.location.reload()
  }

  const handleLogout = async () => {
    await authService.logout()
    setUser(null)
    window.location.reload()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-red-600 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading KPI System...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="mb-6 bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-lg shadow-lg">
            <h1 className="text-3xl font-bold">Welcome back, {user.name}</h1>
            <p className="mt-2">
              {user.role === 'HR' && 'Human Resources Manager'}
              {user.role === 'ADMIN' && 'System Administrator'}
              {user.role === 'STAFF' && 'Staff Member'}
              {user.role === 'LINE_MANAGER' && 'Line Manager'}
              {user.role === 'HEAD_OF_DEPT' && 'Head of Department'}
              {user.role === 'BOD' && 'Board of Directors'}
              {' • '}{user.department}
            </p>
            <p className="text-sm opacity-90 mt-1">
              Manage your KPIs and track performance across the organization
            </p>
          </div>

          <DashboardStats user={user} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentActivity user={user} />
            <QuickActions user={user} />
          </div>
        </div>
      </main>
    </div>
  )
}