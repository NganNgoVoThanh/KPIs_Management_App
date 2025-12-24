"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Target,
  FileText,
  Users,
  Calendar,
  TrendingUp,
  Settings,
  Shield,
  LogOut,
  ChevronDown,
  Bell,
  ClipboardCheck,
  Award,
  BarChart3,
  Building2,
  Library
} from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { authenticatedFetch } from "@/lib/api-client"

interface SidebarProps {
  user: User
  onLogout: () => void
}

export function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname()
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    kpis: true,
    evaluation: false,
    management: false,
    admin: false
  })
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [pendingApprovals, setPendingApprovals] = useState(0)

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Fetch notification count from API
  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const response = await authenticatedFetch('/api/notifications')
        const data = await response.json()
        if (data.success && data.stats) {
          setUnreadNotifications(data.stats.unread || 0)
        }
      } catch (error) {
        console.error('Error fetching notification count:', error)
      }
    }

    const fetchApprovalCount = async () => {
      try {
        const response = await authenticatedFetch('/api/approvals?status=PENDING')
        const data = await response.json()
        if (data.success) {
          setPendingApprovals(data.data?.length || 0)
        }
      } catch (error) {
        console.error('Error fetching approval count:', error)
      }
    }

    fetchNotificationCount()
    if (["LINE_MANAGER", "MANAGER", "ADMIN"].includes(user.role)) {
      fetchApprovalCount()
    }

    // Poll for updates every 30 seconds
    const notificationInterval = setInterval(fetchNotificationCount, 30000)
    const approvalInterval = ["LINE_MANAGER", "MANAGER", "ADMIN"].includes(user.role)
      ? setInterval(fetchApprovalCount, 30000)
      : null

    return () => {
      clearInterval(notificationInterval)
      if (approvalInterval) clearInterval(approvalInterval)
    }
  }, [user.role])

  const menuItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      show: true
    },
    {
      label: "KPI Library",
      href: user.role === "ADMIN" ? "/admin/kpi-library" : "/library",
      icon: Library,
      show: true
    },
    {
      label: "KPI Management",
      icon: Target,
      show: true,
      section: "kpis",
      children: [
        {
          label: "My KPIs",
          href: "/kpis",
          icon: Target,
          show: true
        },
        {
          label: "Create KPI",
          href: "/kpis/create",
          icon: FileText,
          show: true
        }
      ]
    },
    {
      label: "Evidence",
      icon: TrendingUp,
      show: true,
      section: "evaluation",
      children: [
        {
          label: "Submit Actuals",
          href: "/evaluation",
          icon: TrendingUp,
          show: true
        },
        {
          label: "Performance Review",
          href: "/evaluation/review",
          icon: Award,
          show: true
        }
      ]
    },
    {
      label: "Approvals",
      href: "/approvals",
      icon: ClipboardCheck,
      show: ["LINE_MANAGER", "MANAGER", "ADMIN"].includes(user.role),
      badge: pendingApprovals > 0 ? pendingApprovals : undefined
    },
    {
      label: "Management",
      icon: Building2,
      show: user.role === "ADMIN",
      section: "management",
      children: [
        {
          label: "Cycles",
          href: "/cycles",
          icon: Calendar,
          show: true
        },
        {
          label: "Reports",
          href: "/reports",
          icon: BarChart3,
          show: true
        }
      ]
    },
    {
      label: "Notifications",
      href: "/notifications",
      icon: Bell,
      show: true,
      badge: unreadNotifications > 0 ? unreadNotifications : undefined
    },
    {
      label: "Settings",
      href: "/settings",
      icon: Settings,
      show: true
    },
    {
      label: "Admin Panel",
      icon: Shield,
      show: user.role === "ADMIN",
      section: "admin",
      children: [
        {
          label: "Admin Dashboard",
          href: "/admin",
          icon: Shield,
          show: true
        },
        {
          label: "Users Management",
          href: "/admin/users",
          icon: Users,
          show: true
        },
        {
          label: "Proxy Actions",
          href: "/admin/proxy",
          icon: Shield,
          show: true
        }
      ]
    }
  ]

  const renderMenuItem = (item: any, index: number) => {
    if (!item.show) return null

    const isActive = pathname === item.href ||
      (item.children && item.children.some((child: any) => pathname === child.href))

    if (item.children) {
      return (
        <Collapsible
          key={index}
          open={openSections[item.section]}
          onOpenChange={() => toggleSection(item.section)}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start hover:bg-red-50 hover:text-red-700 rounded-xl transition-all duration-200",
                isActive && "bg-red-50 text-red-700 font-semibold shadow-sm"
              )}
            >
              <item.icon className="mr-3 h-4 w-4" />
              {item.label}
              <ChevronDown className={cn(
                "ml-auto h-4 w-4 transition-transform duration-200",
                openSections[item.section] && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 space-y-1 mt-1">
            {item.children
              .filter((child: any) => child.show)
              .map((child: any, childIndex: number) => (
                <Link key={childIndex} href={child.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-sm hover:bg-red-50 hover:text-red-700 rounded-lg h-9",
                      pathname === child.href && "bg-red-100/50 text-red-700 font-medium"
                    )}
                  >
                    <child.icon className="mr-3 h-3.5 w-3.5" />
                    {child.label}
                  </Button>
                </Link>
              ))}
          </CollapsibleContent>
        </Collapsible>
      )
    }

    return (
      <Link key={index} href={item.href}>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start hover:bg-red-50 hover:text-red-700 rounded-xl transition-all duration-200",
            pathname === item.href && "bg-red-50 text-red-700 font-bold shadow-sm"
          )}
        >
          <item.icon className="mr-3 h-4 w-4" />
          {item.label}
          {item.badge && (
            <Badge
              variant="default"
              className="ml-auto bg-red-600 text-white hover:bg-red-700"
            >
              {item.badge}
            </Badge>
          )}
        </Button>
      </Link>
    )
  }

  return (
    <div className="flex h-full w-72 flex-col border-r bg-white shadow-xl shadow-gray-200/50 z-20">
      {/* Logo/Header */}
      <div className="p-6 border-b border-gray-100/50 bg-gradient-to-b from-red-50/50 to-white">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-lg shadow-sm shrink-0 bg-white ring-1 ring-gray-100 p-0.5">
            <Image
              src="/logo1.jpg"
              alt="Intersnack Logo"
              fill
              className="object-contain"
            />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 leading-tight">KPI System</h2>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Intersnack Cashew</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 mx-4 mt-4 mb-2 rounded-2xl bg-gradient-to-r from-red-50 to-white border border-red-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-red-600 to-red-700 text-white flex items-center justify-center font-bold shadow-lg shadow-red-200">
            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-red-600 font-medium truncate">
              {user.role.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300">
        {menuItems.map((item, index) => renderMenuItem(item, index))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <Button
          variant="outline"
          className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors"
          onClick={onLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  )
}