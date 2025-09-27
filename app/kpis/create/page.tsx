// BEFORE: Basic form with simple AI suggestions
// AFTER: Enhanced form with integrated AI assistance

"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/auth-service'
import { KpiForm } from '@/components/kpi/enhanced-kpi-form'
import { enhancedAIService } from '@/lib/ai-services-enhanced'

export default function CreateKpiPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    setUser(currentUser)
    setLoading(false)
  }, [router])

  const handleKpiSubmit = async (kpis: any[]) => {
    try {
      // Enhanced submission with AI validation
      const validatedKpis = await Promise.all(
        kpis.map(async (kpi) => {
          const validation = await enhancedAIService.validateKPISMART(kpi)
          return {
            ...kpi,
            smartScore: validation.score,
            aiValidated: true,
            validationTimestamp: new Date().toISOString()
          }
        })
      )

      // Save KPIs with AI metadata
      console.log('Submitting enhanced KPIs:', validatedKpis)
      
      // Navigate to success page
      router.push('/kpis?created=true')
    } catch (error) {
      console.error('Enhanced KPI submission failed:', error)
    }
  }

  const handleCancel = () => {
    router.push('/kpis')
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto py-6">
      <KpiForm
        userProfile={{
          id: user.id,
          name: user.name,
          department: user.department || 'Unknown',
          jobTitle: user.jobTitle || 'Employee'
        }}
        showAISuggestions={true}
        enableSmartValidation={true}
        maxKpis={8}
        onSubmit={handleKpiSubmit}
        onCancel={handleCancel}
      />
    </div>
  )
}