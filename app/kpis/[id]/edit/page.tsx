// app/kpis/[id]/edit/page.tsx - Edit KPI Page
"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { authService } from '@/lib/auth-service'
import { authenticatedFetch } from '@/lib/api-client'
import { KpiForm } from '@/components/kpi/enhanced-kpi-form'
import { Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function EditKpiPage() {
  const router = useRouter()
  const params = useParams()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [kpi, setKpi] = useState<any>(null)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    setUser(currentUser)

    // Fetch KPI data
    const fetchKpi = async () => {
      try {
        const response = await authenticatedFetch(`/api/kpi/${params.id}`)
        const result = await response.json()

        if (!response.ok || !result.success) {
          setError(result.error || 'Failed to load KPI')
          return
        }

        const kpiData = result.data

        // Check if KPI is editable
        const editableStatuses = ['DRAFT', 'REJECTED', 'CHANGE_REQUESTED']
        if (!editableStatuses.includes(kpiData.status)) {
          setError(`Cannot edit KPI in ${kpiData.status} status. Only DRAFT, REJECTED, and CHANGE_REQUESTED KPIs can be edited.`)
          return
        }

        // Check ownership
        if (kpiData.userId !== currentUser.id) {
          setError('You can only edit your own KPIs')
          return
        }

        setKpi(kpiData)
      } catch (err: any) {
        console.error('Failed to fetch KPI:', err)
        setError('Failed to load KPI data')
      } finally {
        setLoading(false)
      }
    }

    fetchKpi()
  }, [router, params.id])

  const handleKpiUpdate = async (kpis: any[]) => {
    try {
      if (kpis.length === 0) {
        alert('No KPI data to save')
        return
      }

      // Since we're editing a single KPI, take the first one from the form
      const updatedKpiData = kpis[0]

      // Remove fields that shouldn't be updated
      const { id, userId, cycleId, createdAt, approvals, ...updateData } = updatedKpiData

      // Call API to update KPI
      const response = await authenticatedFetch(`/api/kpi/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update KPI')
      }

      if (result.success) {
        alert('KPI updated successfully!')
        router.push(`/kpis/${params.id}`)
      } else {
        throw new Error(result.error || 'Unknown error occurred')
      }
    } catch (error: any) {
      console.error('KPI update failed:', error)
      alert(`Failed to update KPI: ${error.message || 'Please try again.'}`)
    }
  }

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
      router.push(`/kpis/${params.id}`)
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

  if (error) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="max-w-2xl mx-auto">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4">
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

  if (!kpi) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-gray-600 mb-4">KPI not found</p>
            <button
              onClick={() => router.push('/kpis')}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Back to My KPIs
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Prepare initial data for the form
  const initialKpiData = {
    title: kpi.title,
    description: kpi.description,
    type: kpi.type,
    unit: kpi.unit,
    target: kpi.target,
    weight: kpi.weight,
    formula: kpi.formula,
    dataSource: kpi.dataSource,
    evidenceRequirements: kpi.evidenceRequirements,
    category: kpi.category,
    ogsmAlignment: kpi.ogsmAlignment,
    frequency: kpi.frequency,
    priority: kpi.priority,
    dependencies: kpi.dependencies,
    scoringRules: kpi.scoringRules,
    startDate: kpi.startDate ? new Date(kpi.startDate).toISOString().split('T')[0] : undefined,
    dueDate: kpi.dueDate ? new Date(kpi.dueDate).toISOString().split('T')[0] : undefined,
  }

  return (
    <AppLayout>
      <div className="p-6 mb-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Edit KPI</h1>
            <p className="text-sm text-gray-500 mt-1">
              Status: <span className="font-medium">{kpi.status}</span>
            </p>
          </div>
          {kpi.status === 'REJECTED' && kpi.rejectionReason && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Rejection Reason:</strong> {kpi.rejectionReason}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
      <KpiForm
        initialData={initialKpiData}
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
        maxKpis={1}
        cycleYear={kpi.cycleId ? new Date(kpi.createdAt).getFullYear() : new Date().getFullYear()}
        onSubmit={handleKpiUpdate}
        onCancel={handleCancel}
      />
    </AppLayout>
  )
}
