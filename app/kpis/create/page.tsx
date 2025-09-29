"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/auth-service'
import { storageService } from '@/lib/storage-service'
import { KpiForm } from '@/components/kpi/enhanced-kpi-form'
import type { KpiDefinition, Notification } from '@/lib/types'

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

    const cycles = storageService.getCycles()
    const activeCycle = cycles.find(c => c.status === 'ACTIVE')
    setCurrentCycle(activeCycle)

    setLoading(false)
  }, [router])

  const handleKpiSubmit = async (kpis: any[]) => {
    try {
      if (!currentCycle) {
        alert('No active cycle found. Please contact HR to open a KPI cycle.')
        return
      }

      const savedKpis: KpiDefinition[] = []
      
      for (const kpi of kpis) {
        const kpiDefinition: KpiDefinition = {
          id: `kpi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          cycleId: currentCycle.id,
          userId: user.id,
          orgUnitId: user.orgUnitId || 'org-vicc',
          title: kpi.title,
          description: kpi.description,
          type: kpi.type === 1 ? 'QUANT_HIGHER_BETTER' : 
                kpi.type === 2 ? 'QUANT_LOWER_BETTER' :
                kpi.type === 3 ? 'BOOLEAN' : 'BEHAVIOR',
          unit: kpi.unit,
          target: kpi.target,
          weight: kpi.weight,
          formula: kpi.formula,
          dataSource: kpi.dataSource,
          ownerId: user.id,
          contributors: [],
          status: 'SUBMITTED',
          category: kpi.category,
          frequency: kpi.frequency,
          priority: kpi.priority,
          ogsmAlignment: kpi.ogsmAlignment,
          evidenceRequirements: kpi.evidenceRequirements,
          dependencies: kpi.dependencies,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          submittedAt: new Date().toISOString(),
          smartScore: kpi.smartScore || 0
        }

        storageService.saveKpiDefinition(kpiDefinition)
        savedKpis.push(kpiDefinition)
      }

      // Create notification for Line Manager - FIXED TYPE
      if (user.managerId) {
        const notification: Notification = {
          id: `notif-${Date.now()}`,
          userId: user.managerId,
          type: 'APPROVAL_REQUIRED', // ✅ This is now correctly typed as NotificationType
          title: 'New KPI Approval Request',
          message: `${user.name} has submitted ${savedKpis.length} KPIs for your approval.`,
          priority: 'HIGH',
          status: 'UNREAD',
          actionRequired: true,
          actionUrl: '/approvals',
          createdAt: new Date().toISOString()
        }
        
        storageService.saveNotification(notification)
      }

      router.push('/kpis?created=true')
    } catch (error) {
      console.error('KPI submission failed:', error)
      alert('Failed to submit KPIs. Please try again.')
    }
  }

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
      router.push('/kpis')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-red-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading KPI form...</p>
        </div>
      </div>
    )
  }

  if (!currentCycle) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white border-2 border-red-300 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-red-900 mb-2">No Active Cycle</h2>
            <p className="text-gray-600 mb-6">
              There is currently no active KPI cycle. Please contact HR to open a new cycle.
            </p>
            <button
              onClick={() => router.push('/kpis')}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
            >
              Back to My KPIs
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <KpiForm
      userProfile={{
        id: user.id,
        name: user.name,
        department: user.department || 'Unknown',
        jobTitle: user.jobTitle || 'Employee'
      }}
      showAISuggestions={true}
      enableSmartValidation={true}
      enableRealTimeAnalysis={false}
      maxKpis={5}
      cycleYear={new Date().getFullYear()}
      onSubmit={handleKpiSubmit}
      onCancel={handleCancel}
    />
  )
}