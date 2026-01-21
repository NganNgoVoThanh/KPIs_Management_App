// app/evaluation/review/page.tsx - Performance Review Page
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { authService } from "@/lib/auth-service"
import { Loader2, Award, TrendingUp, Target, Calendar, FileText, CheckCircle, XCircle, Clock, User, ChevronRight } from "lucide-react"

export default function PerformanceReviewPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [reviews, setReviews] = useState<any[]>([])
  const [cycles, setCycles] = useState<any[]>([])
  const [selectedCycle, setSelectedCycle] = useState<string>('')

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) {
      router.push('/')
      return
    }
    setUser(currentUser)
    loadData()
  }, [router])

  const loadData = async () => {
    try {
      // Fetch cycles
      const cyclesRes = await fetch('/api/cycles')
      const cyclesData = await cyclesRes.json()

      if (cyclesData.success) {
        setCycles(cyclesData.data)
        if (cyclesData.data.length > 0) {
          setSelectedCycle(cyclesData.data[0].id)
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('Failed to load data:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 text-red-600 animate-spin" />
        </div>
      </AppLayout>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Pending Review' },
      IN_REVIEW: { color: 'bg-blue-100 text-blue-800 border-blue-300', label: 'In Review' },
      COMPLETED: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Completed' },
      DRAFT: { color: 'bg-gray-100 text-gray-800 border-gray-300', label: 'Draft' }
    }
    const config = statusConfig[status] || statusConfig.DRAFT
    return <Badge className={`${config.color} border font-semibold`}>{config.label}</Badge>
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Performance Review</h1>
            <p className="text-gray-600 mt-1">
              Review and evaluate KPI performance across cycles
            </p>
          </div>
          <Button
            onClick={() => router.push('/evaluation')}
            className="bg-red-600 hover:bg-red-700"
          >
            <FileText className="mr-2 h-4 w-4" />
            Submit Actuals
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Reviews</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-xl">
                  <Award className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
                </div>
                <div className="bg-green-100 p-3 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-xl">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Score</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">-</p>
                </div>
                <div className="bg-red-100 p-3 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="my-reviews" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 h-12 bg-white border-2 border-gray-200">
            <TabsTrigger
              value="my-reviews"
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white font-semibold"
            >
              <User className="mr-2 h-4 w-4" />
              My Reviews
            </TabsTrigger>
            <TabsTrigger
              value="team-reviews"
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white font-semibold"
            >
              <Target className="mr-2 h-4 w-4" />
              Team Reviews
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white font-semibold"
            >
              <Calendar className="mr-2 h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-reviews">
            <Card>
              <CardHeader>
                <CardTitle>My Performance Reviews</CardTitle>
                <CardDescription>
                  View and manage your performance review submissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cycles.length === 0 ? (
                  <div className="text-center py-12">
                    <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Cycles Available</h3>
                    <p className="text-gray-600 mb-6">
                      There are no active cycles for performance review at the moment.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => router.push('/dashboard')}
                    >
                      Back to Dashboard
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reviews Yet</h3>
                    <p className="text-gray-600 mb-6">
                      You haven't submitted any performance reviews for this cycle.
                    </p>
                    <Button
                      onClick={() => router.push('/evaluation')}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Submit Actuals
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team-reviews">
            <Card>
              <CardHeader>
                <CardTitle>Team Performance Reviews</CardTitle>
                <CardDescription>
                  {user?.role === 'ADMIN' || user?.role === 'LINE_MANAGER' || user?.role === 'MANAGER'
                    ? 'Review and evaluate your team members performance'
                    : 'You do not have permission to view team reviews'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {user?.role === 'ADMIN' || user?.role === 'LINE_MANAGER' || user?.role === 'MANAGER' ? (
                  <div className="text-center py-12">
                    <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Team Reviews</h3>
                    <p className="text-gray-600">
                      Your team members haven't submitted any reviews yet.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <XCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
                    <p className="text-gray-600">
                      You need manager permissions to view team reviews.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Review History</CardTitle>
                <CardDescription>
                  View past performance reviews and evaluations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No History Available</h3>
                  <p className="text-gray-600">
                    Historical performance review data will appear here.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
