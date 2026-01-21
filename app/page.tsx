"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { QuickActions } from "@/components/dashboard/quick-actions"
import type { User } from "@/lib/types"
import { authService } from "@/lib/auth-service"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const currentUser = authService.getCurrentUser()
    setUser(currentUser)
    setIsLoading(false)

    // Redirect to dashboard if already logged in
    if (currentUser) {
      router.push('/dashboard')
    }
  }, [router])

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser)
    router.push('/dashboard')
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

  // Show loading while redirecting to dashboard
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 text-red-600 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting to dashboard...</p>
      </div>
    </div>
  )
}