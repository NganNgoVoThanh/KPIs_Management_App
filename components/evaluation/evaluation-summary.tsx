"use client"

import type { KpiDefinition, PerformanceEvaluation } from "@/lib/types"
import { getScoreBand, getPerformanceInsights } from "@/lib/evaluation-utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TrendingUp, Target, Award, AlertTriangle, CheckCircle, Info } from "lucide-react"

interface EvaluationSummaryProps {
  evaluation: PerformanceEvaluation
  kpiDefinitions: KpiDefinition[]
}

export function EvaluationSummary({ evaluation, kpiDefinitions }: EvaluationSummaryProps) {
  const overallScoreBand = getScoreBand(evaluation.overallPercentage)
  const insights = getPerformanceInsights(evaluation)

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-4 w-4" />
      case "warning":
        return <AlertTriangle className="h-4 w-4" />
      case "error":
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  const getInsightVariant = (type: string) => {
    switch (type) {
      case "success":
        return "default"
      case "warning":
        return "default"
      case "error":
        return "destructive"
      default:
        return "default"
    }
  }

  return (
    <div className="space-y-6">
      {/* Overall Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Overall Performance
          </CardTitle>
          <CardDescription>Summary of your performance across all KPIs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold">{evaluation.overallPercentage.toFixed(1)}%</div>
              <p className="text-sm text-muted-foreground">Achievement Rate</p>
              <Progress value={Math.min(evaluation.overallPercentage, 100)} className="h-2" />
            </div>

            <div className="text-center space-y-2">
              <div className="text-3xl font-bold">{evaluation.overallScore.toFixed(1)}/5</div>
              <p className="text-sm text-muted-foreground">Overall Score</p>
              <Badge className={overallScoreBand.color} variant="default">
                {overallScoreBand.label}
              </Badge>
            </div>

            <div className="text-center space-y-2">
              <div className="text-3xl font-bold">{evaluation.kpiActuals.length}</div>
              <p className="text-sm text-muted-foreground">KPIs Completed</p>
              <p className="text-xs text-muted-foreground">Total Weight: {evaluation.totalWeight}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Performance Insights</h3>
        {insights.map((insight, index) => (
          <Alert key={index} variant={getInsightVariant(insight.type)}>
            {getInsightIcon(insight.type)}
            <div>
              <div className="font-medium">{insight.title}</div>
              <AlertDescription>{insight.message}</AlertDescription>
            </div>
          </Alert>
        ))}
      </div>

      {/* Individual KPI Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Individual KPI Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {evaluation.kpiActuals.map((actual) => {
              const kpiDef = kpiDefinitions.find((k) => k.id === actual.kpiDefinitionId)
              if (!kpiDef) return null

              const scoreBand = getScoreBand(actual.percentage)

              return (
                <div key={actual.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{kpiDef.title}</h4>
                    <Badge className={scoreBand.color} variant="default">
                      {actual.score}/5
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-muted-foreground">Target:</span>
                      <p className="font-medium">
                        {kpiDef.target} {kpiDef.unit}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Actual:</span>
                      <p className="font-medium">
                        {actual.actualValue} {kpiDef.unit}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Achievement:</span>
                      <p className="font-medium">{actual.percentage.toFixed(1)}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Weight:</span>
                      <p className="font-medium">{kpiDef.weight}%</p>
                    </div>
                  </div>

                  <Progress value={Math.min(actual.percentage, 100)} className="h-2 mb-3" />

                  {actual.selfComment && (
                    <div className="bg-muted/50 p-3 rounded text-sm">
                      <span className="font-medium">Self Assessment: </span>
                      {actual.selfComment}
                    </div>
                  )}

                  {actual.evidenceFiles && actual.evidenceFiles.length > 0 && (
                    <div className="mt-2">
                      <span className="text-sm font-medium">Evidence Files: </span>
                      <span className="text-sm text-muted-foreground">
                        {actual.evidenceFiles.length} file(s) attached
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Score Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Score Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[5, 4, 3, 2, 1].map((score) => {
              const count = evaluation.kpiActuals.filter((a) => a.score === score).length
              const percentage = evaluation.kpiActuals.length > 0 ? (count / evaluation.kpiActuals.length) * 100 : 0
              const band = getScoreBand(
                score === 5 ? 120 : score === 4 ? 110 : score === 3 ? 90 : score === 2 ? 70 : 50,
              )

              return (
                <div key={score} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-32">
                    <div className={`w-4 h-4 rounded ${band.color}`} />
                    <span className="text-sm font-medium">{band.label}</span>
                  </div>
                  <div className="flex-1">
                    <Progress value={percentage} className="h-2" />
                  </div>
                  <div className="text-sm font-medium w-16 text-right">
                    {count} KPI{count !== 1 ? "s" : ""}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
