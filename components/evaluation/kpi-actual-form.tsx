"use client"

import type React from "react"

import { useState } from "react"
import type { KpiDefinition, KpiActual } from "@/lib/types"
import { calculateKpiActualScore, getScoreBand } from "@/lib/evaluation-utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Upload, FileText, Trash2, Target, TrendingUp } from "lucide-react"

interface KpiActualFormProps {
  kpiDefinition: KpiDefinition
  initialActual?: KpiActual
  onSave: (actual: Partial<KpiActual>) => void
  onCancel: () => void
}

export function KpiActualForm({ kpiDefinition, initialActual, onSave, onCancel }: KpiActualFormProps) {
  const [actualValue, setActualValue] = useState(initialActual?.actualValue || 0)
  const [selfComment, setSelfComment] = useState(initialActual?.selfComment || "")
  const [evidenceFiles, setEvidenceFiles] = useState(initialActual?.evidenceFiles || [])

  const { percentage, score } = calculateKpiActualScore(kpiDefinition, actualValue)
  const scoreBand = getScoreBand(percentage)

  const handleSubmit = () => {
    const actualData: Partial<KpiActual> = {
      kpiDefinitionId: kpiDefinition.id,
      actualValue,
      percentage,
      score,
      selfComment: selfComment.trim() || undefined,
      evidenceFiles,
      status: "DRAFT",
      lastModifiedAt: new Date(),
    }

    if (!initialActual) {
      actualData.submittedAt = new Date()
    }

    onSave(actualData)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    // Mock file upload - in real app, you'd upload to storage
    Array.from(files).forEach((file, index) => {
      const mockFile = {
        id: `file-${Date.now()}-${index}`,
        actualId: initialActual?.id || "new",
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadedBy: "current-user",
        uploadedAt: new Date(),
        description: "",
      }
      setEvidenceFiles((prev) => [...prev, mockFile])
    })

    // Clear the input
    event.target.value = ""
  }

  const removeFile = (fileId: string) => {
    setEvidenceFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  const getTypeDescription = (type: string) => {
    switch (type) {
      case "QUANT_HIGHER_BETTER":
        return "Higher values are better"
      case "QUANT_LOWER_BETTER":
        return "Lower values are better"
      case "MILESTONE":
        return "Number of milestones completed"
      case "BOOLEAN":
        return "Yes (1) or No (0)"
      case "BEHAVIOR":
        return "Score from 1-5"
      default:
        return ""
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{kpiDefinition.title}</h2>
          <p className="text-muted-foreground">{getTypeDescription(kpiDefinition.type)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save Actual</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KPI Details */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">KPI Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Target</span>
                </div>
                <p className="text-2xl font-bold">
                  {kpiDefinition.target} {kpiDefinition.unit}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <span className="text-sm font-medium">Weight</span>
                <p className="text-lg">{kpiDefinition.weight}%</p>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium">Data Source</span>
                <p className="text-sm text-muted-foreground">{kpiDefinition.dataSource}</p>
              </div>

              {kpiDefinition.formula && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Formula</span>
                  <p className="text-xs font-mono bg-muted p-2 rounded">{kpiDefinition.formula}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actual Value Form */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actual Performance</CardTitle>
              <CardDescription>Enter your actual achievement for this KPI</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="actualValue">Actual Value ({kpiDefinition.unit}) *</Label>
                <Input
                  id="actualValue"
                  type="number"
                  value={actualValue}
                  onChange={(e) => setActualValue(Number.parseFloat(e.target.value) || 0)}
                  placeholder={`Enter actual ${kpiDefinition.unit}`}
                  step={kpiDefinition.type === "BEHAVIOR" ? "1" : "0.01"}
                  min={kpiDefinition.type === "BEHAVIOR" ? "1" : "0"}
                  max={kpiDefinition.type === "BEHAVIOR" ? "5" : undefined}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="selfComment">Self Assessment Comment</Label>
                <Textarea
                  id="selfComment"
                  value={selfComment}
                  onChange={(e) => setSelfComment(e.target.value)}
                  placeholder="Describe your achievement, challenges faced, and key learnings..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Evidence Files (Optional)</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                  <div className="text-center">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">Upload supporting documents</p>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    />
                    <Button variant="outline" size="sm" onClick={() => document.getElementById("file-upload")?.click()}>
                      Choose Files
                    </Button>
                  </div>
                </div>

                {evidenceFiles.length > 0 && (
                  <div className="space-y-2">
                    {evidenceFiles.map((file) => (
                      <div key={file.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm flex-1 truncate">{file.fileName}</span>
                        <span className="text-xs text-muted-foreground">{(file.fileSize / 1024).toFixed(1)}KB</span>
                        <Button variant="ghost" size="sm" onClick={() => removeFile(file.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Score Calculation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Score
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold">{percentage.toFixed(1)}%</div>
                <Badge className={scoreBand.color} variant="default">
                  Score: {score}/5 - {scoreBand.label}
                </Badge>
                <p className="text-xs text-muted-foreground">{scoreBand.description}</p>
              </div>

              <Progress value={Math.min(percentage, 100)} className="h-3" />

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Target:</span>
                  <span className="font-medium">
                    {kpiDefinition.target} {kpiDefinition.unit}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Actual:</span>
                  <span className="font-medium">
                    {actualValue} {kpiDefinition.unit}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Achievement:</span>
                  <span className="font-medium">{percentage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Weight:</span>
                  <span className="font-medium">{kpiDefinition.weight}%</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Weighted Score:</span>
                  <span>{((score * kpiDefinition.weight) / 100).toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Score Bands</h4>
                <div className="space-y-1">
                  {[5, 4, 3, 2, 1].map((bandScore) => {
                    const band = getScoreBand(
                      bandScore === 5 ? 120 : bandScore === 4 ? 110 : bandScore === 3 ? 90 : bandScore === 2 ? 70 : 50,
                    )
                    return (
                      <div key={bandScore} className="flex items-center gap-2 text-xs">
                        <div className={`w-3 h-3 rounded-full ${band.color}`} />
                        <span>
                          {bandScore}: {band.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
