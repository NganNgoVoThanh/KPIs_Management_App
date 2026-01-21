"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { User } from "@/lib/types"
import { storageService } from "@/lib/storage-service"
import { Target, TrendingUp, Clock, CheckCircle, Award } from "lucide-react"

interface DashboardStatsProps {
  user: User
}

export function DashboardStats({ user }: DashboardStatsProps) {
  const [stats, setStats] = useState({
    totalKpis: 0,
    completedKpis: 0,
    pendingApprovals: 0,
    averageScore: 0,
    cycleProgress: 0,
    notifications: 0
  })

  useEffect(() => {
    loadStats()
  }, [user])

  const loadStats = () => {
    const currentCycle = storageService.getCurrentCycle()
    if (!currentCycle) return

    // Get user's KPIs
    const kpis = storageService.getKpiDefinitions({
      userId: user.id,
      cycleId: currentCycle.id
    })

    // Count completed KPIs
    const completed = kpis.filter(k => k.status === 'LOCKED_GOALS').length

    // Get pending approvals
    const approvals = storageService.getItem<any>('vicc_kpi_approvals')
    const pending = approvals.filter((a: any) =>
      a.approverId === user.id && a.status === 'PENDING'
    ).length

    // Calculate average score from actuals
    const actuals = storageService.getKpiActuals()
    const userActuals = actuals.filter(a => {
      const kpi = kpis.find(k => k.id === a.kpiDefinitionId)
      return kpi !== undefined
    })

    const avgScore = userActuals.length > 0
      ? userActuals.reduce((sum, a) => sum + a.score, 0) / userActuals.length
      : 0

    // Calculate cycle progress
    const now = new Date()
    const start = new Date(currentCycle.periodStart)
    const end = new Date(currentCycle.periodEnd)
    const progress = Math.min(100, Math.max(0,
      ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100
    ))

    // Count notifications
    const notifications = storageService.getNotifications(user.id, true).length

    setStats({
      totalKpis: kpis.length,
      completedKpis: completed,
      pendingApprovals: pending,
      averageScore: Math.round(avgScore * 10) / 10,
      cycleProgress: Math.round(progress),
      notifications
    })
  }

  const statCards = [
    {
      title: "Total KPIs",
      value: stats.totalKpis,
      icon: Target,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "Active KPIs this cycle"
    },
    {
      title: "Completed",
      value: `${stats.completedKpis}/${stats.totalKpis}`,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      description: "KPIs approved & locked"
    },
    {
      title: "Average Score",
      value: stats.averageScore,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      description: "Out of 5.0",
      suffix: "/5"
    },
    {
      title: "Pending Approvals",
      value: stats.pendingApprovals,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      description: "Awaiting your review"
    }
  ]

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2.5 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {stat.value}
                {stat.suffix && <span className="text-lg text-muted-foreground ml-1">{stat.suffix}</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cycle Progress */}
      <Card className="border-0 shadow-sm card-premium">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5 text-red-600" />
            Cycle Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-medium">Current Timeline</span>
              <span className="font-bold text-gray-900">{stats.cycleProgress}%</span>
            </div>
            <Progress value={stats.cycleProgress} className="h-2.5 bg-gray-100" />
            <p className="text-xs text-muted-foreground">
              {stats.cycleProgress < 25 && "Early stage - Set your KPI goals"}
              {stats.cycleProgress >= 25 && stats.cycleProgress < 50 && "Q1 completed - Review your progress"}
              {stats.cycleProgress >= 50 && stats.cycleProgress < 75 && "Halfway through - Submit mid-year actuals"}
              {stats.cycleProgress >= 75 && "Final quarter - Prepare for year-end evaluation"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}