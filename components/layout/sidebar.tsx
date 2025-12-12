"use client"

import Link from "next/link"
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
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { notificationService } from "@/lib/notification-service"
import { kpiService } from "@/lib/kpi-service"

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

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Get pending counts
  const unreadNotifications = notificationService.getUnreadCount(user.id)
  const pendingApprovals = kpiService.getPendingApprovals().length

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
                "w-full justify-start hover:bg-red-50 hover:text-red-700",
                isActive && "bg-red-100 text-red-700 font-medium"
              )}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
              <ChevronDown className={cn(
                "ml-auto h-4 w-4 transition-transform",
                openSections[item.section] && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4">
            {item.children
              .filter((child: any) => child.show)
              .map((child: any, childIndex: number) => (
                <Link key={childIndex} href={child.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-sm hover:bg-red-50 hover:text-red-700",
                      pathname === child.href && "bg-red-100 text-red-700 font-medium"
                    )}
                  >
                    <child.icon className="mr-2 h-3 w-3" />
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
            "w-full justify-start hover:bg-red-50 hover:text-red-700",
            pathname === item.href && "bg-red-100 text-red-700 font-medium"
          )}
        >
          <item.icon className="mr-2 h-4 w-4" />
          {item.label}
          {item.badge && (
            <Badge 
              variant="default" 
              className="ml-auto bg-red-600 text-white"
            >
              {item.badge}
            </Badge>
          )}
        </Button>
      </Link>
    )
  }

  return (
    <div className="flex h-full w-64 flex-col border-r bg-white">
      {/* Logo/Header */}
      <div className="p-6 border-b bg-gradient-to-r from-red-600 to-red-700">
        <div className="flex items-center gap-2 text-white">
          <Shield className="h-8 w-8" />
          <div>
            <h2 className="text-lg font-bold">VICC KPI</h2>
            <p className="text-xs opacity-90">Management System</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b bg-red-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-red-600 text-white flex items-center justify-center font-semibold">
            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user.role.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {menuItems.map((item, index) => renderMenuItem(item, index))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t">
        <Button
          variant="outline"
          className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          onClick={onLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  )
}