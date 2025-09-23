"use client"

import { useState } from "react"
import { KpiTemplateSelector } from "@/components/kpi/kpi-template-selector"
import { KpiForm } from "@/components/kpi/kpi-form"
import type { KpiTemplate } from "@/lib/kpi-utils"

type CreateStep = "select-template" | "create-kpis"

interface KpiFormData {
  title: string
  type: string
  unit: string
  target: number
  weight: number
  dataSource: string
  formula?: string
  description?: string
}

export default function CreateKpiPage() {
  const [step, setStep] = useState<CreateStep>("select-template")
  const [selectedTemplate, setSelectedTemplate] = useState<KpiTemplate | undefined>()

  const handleSelectTemplate = (template: KpiTemplate) => {
    setSelectedTemplate(template)
    setStep("create-kpis")
  }

  const handleCreateFromScratch = () => {
    setSelectedTemplate(undefined)
    setStep("create-kpis")
  }

  const handleSubmitKpis = (kpis: KpiFormData[]) => {
    console.log("Creating KPIs:", kpis)
    // Here you would typically save to your backend
    alert(`Successfully created ${kpis.length} KPIs!`)
    setStep("select-template")
  }

  const handleCancel = () => {
    setStep("select-template")
    setSelectedTemplate(undefined)
  }

  return (
    <div className="container mx-auto py-6">
      {step === "select-template" && (
        <KpiTemplateSelector onSelectTemplate={handleSelectTemplate} onCreateFromScratch={handleCreateFromScratch} />
      )}

      {step === "create-kpis" && (
        <KpiForm template={selectedTemplate} onSubmit={handleSubmitKpis} onCancel={handleCancel} />
      )}
    </div>
  )
}
