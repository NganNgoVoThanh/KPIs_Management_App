"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { User } from "@/lib/types"
import { 
  Plus, 
  FileText, 
  TrendingUp, 
  ClipboardCheck,
  Calendar,
  Users,
  BarChart3,
  Settings,
  Target,
  Award
} from "lucide-react"

interface QuickActionsProps {
  user: User
}

export function QuickActions({ user }: QuickActionsProps) {
  const router = useRouter()

  const getActionsForRole = () => {
    const baseActions = [
      {
        title: "Create KPI",
        description: "Set new performance goals",
        icon: Plus,
        onClick: () => router.push("/kpis/create"),
        color: "bg-red-600 hover:bg-red-700"
      },
      {
        title: "View My KPIs",
        description: "Track your progress",
        icon: Target,
        onClick: () => router.push("/kpis"),
        color: "bg-red-600 hover:bg-red-700"
      },
      {
        title: "Submit Actuals",
        description: "Report your results",
        icon: TrendingUp,
        onClick: () => router.push("/evaluation"),
        color: "bg-green-600 hover:bg-green-700"
      },
      {
        title: "Performance Review",
        description: "View your evaluation",
        icon: Award,
        onClick: () => router.push("/evaluation/review"),
        color: "bg-purple-600 hover:bg-purple-700"
      }
    ]

    const managerActions = [
      {
        title: "Pending Approvals",
        description: "Review team submissions",
        icon: ClipboardCheck,
        onClick: () => router.push("/approvals"),
        color: "bg-yellow-600 hover:bg-yellow-700"
      }
    ]

    const hrActions = [
      {
        title: "Manage Cycles",
        description: "Configure KPI periods",
        icon: Calendar,
        onClick: () => router.push("/cycles"),
        color: "bg-indigo-600 hover:bg-indigo-700"
      },
      {
        title: "Templates",
        description: "Manage KPI templates",
        icon: FileText,
        onClick: () => router.push("/templates"),
        color: "bg-pink-600 hover:bg-pink-700"
      },
      {
        title: "Reports",
        description: "Generate analytics",
        icon: BarChart3,
        onClick: () => router.push("/reports"),
        color: "bg-teal-600 hover:bg-teal-700"
      }
    ]

    const adminActions = [
      {
        title: "User Management",
        description: "Manage system users",
        icon: Users,
        onClick: () => router.push("/admin/users"),
        color: "bg-gray-600 hover:bg-gray-700"
      },
      {
        title: "System Settings",
        description: "Configure system",
        icon: Settings,
        onClick: () => router.push("/settings"),
        color: "bg-orange-600 hover:bg-orange-700"
      }
    ]

    let actions = [...baseActions]

    if (["LINE_MANAGER", "MANAGER"].includes(user.role)) {
      actions = [...managerActions, ...actions]
    }

    if (user.role === "ADMIN") {
      actions = [...actions, ...hrActions, ...adminActions]
    }

    return actions.slice(0, 6) // Return max 6 actions
  }

  const actions = getActionsForRole()

  return (
    <Card className="border-red-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-red-600" />
          Quick Actions
        </CardTitle>
        <CardDescription>Common tasks and shortcuts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto flex-col items-start justify-start p-4 hover:border-red-300"
              onClick={action.onClick}
            >
              <div className={`p-2 rounded-lg ${action.color} text-white mb-2`}>
                <action.icon className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">{action.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {action.description}
                </p>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}