// components/layout/authenticated-layout.tsx - Master layout with persistent sidebar
"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { authService } from "@/lib/auth-service"
import { Sidebar } from "./sidebar"
import type { User } from "@/lib/types"

interface AuthenticatedLayoutProps {
  children: React.ReactNode
  requireAuth?: boolean
  requiredRole?: string[]
}

export function AuthenticatedLayout({
  children,
  requireAuth = true,
  requiredRole
}: AuthenticatedLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const currentUser = authService.getCurrentUser()

    if (requireAuth && !currentUser) {
      router.push('/login')
      return
    }

    if (currentUser && requiredRole && !requiredRole.includes(currentUser.role)) {
      router.push('/dashboard')
      return
    }

    setUser(currentUser)
    setLoading(false)
  }, [requireAuth, requiredRole, router, pathname])

  const handleLogout = () => {
    authService.logout()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-red-50 to-orange-50">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-red-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user && requireAuth) {
    return null
  }

  // Pages without sidebar (login, etc.)
  if (!user) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
