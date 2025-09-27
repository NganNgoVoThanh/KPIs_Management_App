"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { KpiTemplateSelector } from "@/components/kpi/kpi-template-selector"
import { KpiForm } from "@/components/kpi/enhanced-kpi-form"
import type { KpiTemplate } from "@/lib/types"
import { authService } from "@/lib/auth-service"
import { storageService } from "@/lib/storage-service"
import { kpiService } from "@/lib/kpi-service"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

type CreateStep = "select-template" | "create-kpis"

export default function CreateKpiPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState<CreateStep>("select-template")
  const [selectedTemplate, setSelectedTemplate] = useState<KpiTemplate | undefined>()
  const [isLoading, setIsLoading] = useState(false)

  const handleSelectTemplate = (template: KpiTemplate) => {
    setSelectedTemplate(template)
    setStep("create-kpis")
  }

  const handleCreateFromScratch = () => {
    setSelectedTemplate(undefined)
    setStep("create-kpis")
  }

  const handleSubmitKpis = async (kpis: any[]) => {
    setIsLoading(true)
    
    try {
      const user = authService.getCurrentUser()
      const cycle = storageService.getCurrentCycle()
      
      if (!user || !cycle) {
        throw new Error("User or cycle not found")
      }

      // Save KPIs
      kpis.forEach(kpi => {
        const kpiDefinition = {
          id: `kpi-${Date.now()}-${Math.random()}`,
          cycleId: cycle.id,
          userId: user.id,
          orgUnitId: user.orgUnitId || 'org-vicc',
          title: kpi.title,
          description: kpi.description || '',
          type: kpi.type,
          unit: kpi.unit,
          target: kpi.target,
          formula: kpi.formula,
          weight: kpi.weight,
          dataSource: kpi.dataSource || '',
          ownerId: user.id,
          contributors: [],
          status: 'DRAFT' as any,
          createdFromTemplateId: selectedTemplate?.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        storageService.saveKpiDefinition(kpiDefinition)
      })

      toast({
        title: "Success",
        description: `Created ${kpis.length} KPIs successfully`
      })

      router.push("/kpis")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create KPIs",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push("/kpis")
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 text-red-600 animate-spin" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-6">
        {step === "select-template" && (
          <KpiTemplateSelector 
            onSelectTemplate={handleSelectTemplate} 
            onCreateFromScratch={handleCreateFromScratch} 
          />
        )}

        {step === "create-kpis" && (
          <EnhancedKpiForm
            template={selectedTemplate} 
            onSubmit={handleSubmitKpis} 
            onCancel={handleCancel} 
          />
        )}
      </div>
    </AppLayout>
  )
}