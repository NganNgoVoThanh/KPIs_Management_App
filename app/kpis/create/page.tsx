// app/kpis/create/page.tsx - Create KPI Page with AppLayout
"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { authService } from '@/lib/auth-service'
import { authenticatedFetch } from '@/lib/api-client'
import { KpiForm } from '@/components/kpi/enhanced-kpi-form'
import { Loader2 } from 'lucide-react'

export default function CreateKpiPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentCycle, setCurrentCycle] = useState<any>(null)

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    setUser(currentUser)

    // Fetch cycles from API
    const fetchCycles = async () => {
      try {
        const response = await authenticatedFetch('/api/cycles?status=ACTIVE')
        const result = await response.json()

        if (result.success && result.data && result.data.length > 0) {
          // Get the first active cycle
          setCurrentCycle(result.data[0])
        } else {
          // If no active cycle, try to get OPEN cycles
          const openResponse = await authenticatedFetch('/api/cycles?status=OPEN')
          const openResult = await openResponse.json()

          if (openResult.success && openResult.data && openResult.data.length > 0) {
            setCurrentCycle(openResult.data[0])
          }
        }
      } catch (error) {
        console.error('Failed to fetch cycles:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCycles()
  }, [router])

  const handleKpiSubmit = async (kpis: any[]) => {
    try {
      if (!currentCycle) {
        alert('No active cycle found. Please contact HR to open a KPI cycle.')
        return
      }

      // Call API to create KPIs
      const response = await fetch('/api/kpi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kpis,
          cycleId: currentCycle.id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create KPIs')
      }

      if (result.success) {
        alert(`Successfully created ${result.count} KPI(s)!`)
        router.push('/kpis?created=true')
      } else {
        throw new Error(result.error || 'Unknown error occurred')
      }
    } catch (error: any) {
      console.error('KPI submission failed:', error)
      alert(`Failed to submit KPIs: ${error.message || 'Please try again.'}`)
    }
  }

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
      router.push('/kpis')
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

  if (!currentCycle) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white border-2 border-red-300 rounded-lg p-8 text-center shadow-lg">
              <div className="text-6xl mb-4">🚫</div>
              <h2 className="text-2xl font-bold text-red-900 mb-2">No Active Cycle</h2>
              <p className="text-gray-600 mb-6">
                There is currently no active KPI cycle. Please contact HR to open a new cycle.
              </p>
              <button
                onClick={() => router.push('/kpis')}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Back to My KPIs
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <KpiForm
        userProfile={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department || 'Unknown',
          jobTitle: user.jobTitle || 'Employee',
          managerId: user.managerId
        }}
        showAISuggestions={true}
        maxKpis={currentCycle?.settings?.maxKpisPerUser || 5}
        minKpis={currentCycle?.settings?.minKpisPerUser || 3}
        cycleYear={currentCycle.periodStart ? new Date(currentCycle.periodStart).getFullYear() : new Date().getFullYear()}
        currentCycle={currentCycle}
        onSubmit={handleKpiSubmit}
        onCancel={handleCancel}
      />
    </AppLayout>
  )
}