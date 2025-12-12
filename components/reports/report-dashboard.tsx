"use client"

import type { ReportData } from "@/lib/reporting-utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Users, Target, TrendingUp, Award, Download, FileSpreadsheet } from "lucide-react"

interface ReportDashboardProps {
  reportData: ReportData
  onExportExcel: () => void
  onExportPDF?: () => void
}

const COLORS = ["#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0"]

export function ReportDashboard({ reportData, onExportExcel, onExportPDF }: ReportDashboardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 4.5) return "text-green-600"
    if (score >= 4.0) return "text-green-500"
    if (score >= 3.0) return "text-yellow-500"
    if (score >= 2.0) return "text-orange-500"
    return "text-red-500"
  }

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 4.0) return "default"
    if (score >= 3.0) return "secondary"
    return "destructive"
  }

  return (
    <div className="space-y-6">
      {/* Header with Export Options */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Report</h2>
          <p className="text-muted-foreground">Comprehensive analysis of KPI performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          {onExportPDF && (
            <Button variant="outline" onClick={onExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.summary.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">Active participants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total KPIs</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.summary.totalKpis}</div>
            <p className="text-xs text-muted-foreground">Defined objectives</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(reportData.summary.averageScore)}`}>
              {reportData.summary.averageScore.toFixed(1)}/5
            </div>
            <p className="text-xs text-muted-foreground">Overall performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.summary.completionRate.toFixed(1)}%</div>
            <Progress value={reportData.summary.completionRate} className="h-1 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On-time Submission</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.summary.onTimeSubmission}%</div>
            <Progress value={reportData.summary.onTimeSubmission} className="h-1 mt-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="departments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="individuals">Individuals</TabsTrigger>
          <TabsTrigger value="kpis">KPI Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Department Performance</CardTitle>
                <CardDescription>Average scores by department</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.departmentBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Bar dataKey="averageScore" fill="#059669" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Department Completion Rates */}
            <Card>
              <CardHeader>
                <CardTitle>Completion Rates</CardTitle>
                <CardDescription>KPI completion by department</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.departmentBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="completionRate" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Department Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Department Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Department</th>
                      <th className="text-right p-2">Employees</th>
                      <th className="text-right p-2">Avg Score</th>
                      <th className="text-right p-2">Completion</th>
                      <th className="text-right p-2">Top Performers</th>
                      <th className="text-right p-2">Need Improvement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.departmentBreakdown.map((dept) => (
                      <tr key={dept.department} className="border-b">
                        <td className="p-2 font-medium">{dept.department}</td>
                        <td className="p-2 text-right">{dept.employeeCount}</td>
                        <td className="p-2 text-right">
                          <Badge variant={getScoreBadgeVariant(dept.averageScore)}>
                            {dept.averageScore.toFixed(1)}
                          </Badge>
                        </td>
                        <td className="p-2 text-right">{dept.completionRate.toFixed(1)}%</td>
                        <td className="p-2 text-right text-green-600">{dept.topPerformers}</td>
                        <td className="p-2 text-right text-red-600">{dept.needsImprovement}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="individuals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Individual Performance</CardTitle>
              <CardDescription>Detailed view of each employee's performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Department</th>
                      <th className="text-left p-2">Role</th>
                      <th className="text-right p-2">KPIs</th>
                      <th className="text-right p-2">Score</th>
                      <th className="text-right p-2">Completion</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.individualPerformance.map((perf) => (
                      <tr key={perf.userId} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{perf.userName}</td>
                        <td className="p-2">{perf.department}</td>
                        <td className="p-2">{perf.role}</td>
                        <td className="p-2 text-right">{perf.kpiCount}</td>
                        <td className="p-2 text-right">
                          <Badge variant={getScoreBadgeVariant(perf.averageScore)}>
                            {perf.averageScore.toFixed(1)}
                          </Badge>
                        </td>
                        <td className="p-2 text-right">{perf.completionRate.toFixed(1)}%</td>
                        <td className="p-2">
                          <Badge variant="outline">{perf.status.replace("_", " ")}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kpis" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* KPI Performance Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>KPI Performance Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={reportData.kpiAnalysis.map((kpi, index) => ({
                        name: kpi.kpiTitle.length > 20 ? kpi.kpiTitle.substring(0, 20) + "..." : kpi.kpiTitle,
                        value: kpi.averageAchievement,
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {reportData.kpiAnalysis.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Performing KPIs */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing KPIs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.kpiAnalysis
                    .sort((a, b) => b.averageAchievement - a.averageAchievement)
                    .slice(0, 5)
                    .map((kpi, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{kpi.kpiTitle}</p>
                          <p className="text-xs text-muted-foreground">
                            {kpi.participantCount} participants • Top: {kpi.topPerformer}
                          </p>
                        </div>
                        <Badge variant="default">{kpi.averageAchievement.toFixed(1)}%</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* KPI Analysis Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed KPI Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">KPI Title</th>
                      <th className="text-right p-2">Avg Achievement</th>
                      <th className="text-right p-2">Participants</th>
                      <th className="text-left p-2">Top Performer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.kpiAnalysis.map((kpi, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{kpi.kpiTitle}</td>
                        <td className="p-2 text-right">
                          <Badge variant={kpi.averageAchievement >= 100 ? "default" : "secondary"}>
                            {kpi.averageAchievement.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="p-2 text-right">{kpi.participantCount}</td>
                        <td className="p-2">{kpi.topPerformer}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>Track performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={reportData.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="averageScore" stroke="#059669" strokeWidth={2} name="Average Score" />
                  <Line
                    type="monotone"
                    dataKey="completionRate"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Completion Rate"
                  />
                  <Line
                    type="monotone"
                    dataKey="submissionRate"
                    stroke="#34d399"
                    strokeWidth={2}
                    name="Submission Rate"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
