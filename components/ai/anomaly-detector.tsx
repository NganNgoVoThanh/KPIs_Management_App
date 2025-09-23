"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle,
  Brain,
  RefreshCw
} from "lucide-react"

interface KpiData {
  id: string
  name: string
  actualValue: number
  targetValue: number
}

interface AnomalyDetectorProps {
  kpiData: KpiData[]
}

interface Anomaly {
  kpiId: string
  kpiName: string
  type: 'overachievement' | 'underachievement' | 'suspicious' | 'at_risk'
  severity: 'low' | 'medium' | 'high'
  message: string
  recommendation: string
}

export function AnomalyDetector({ kpiData }: AnomalyDetectorProps) {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    analyzeData()
  }, [kpiData])

  const analyzeData = () => {
    setIsAnalyzing(true)
    
    setTimeout(() => {
      const detectedAnomalies: Anomaly[] = []

      kpiData.forEach(kpi => {
        const achievement = (kpi.actualValue / kpi.targetValue) * 100

        // Overachievement detection
        if (achievement > 150) {
          detectedAnomalies.push({
            kpiId: kpi.id,
            kpiName: kpi.name,
            type: 'overachievement',
            severity: 'medium',
            message: `Achievement at ${achievement.toFixed(0)}% - significantly exceeding target`,
            recommendation: 'Review target setting for next cycle. Consider if resources can be reallocated.'
          })
        }

        // Underachievement detection
        if (achievement < 60) {
          detectedAnomalies.push({
            kpiId: kpi.id,
            kpiName: kpi.name,
            type: 'underachievement',
            severity: achievement < 40 ? 'high' : 'medium',
            message: `Achievement at ${achievement.toFixed(0)}% - significantly below target`,
            recommendation: 'Immediate action required. Consider requesting support or adjusting approach.'
          })
        }

        // Suspicious patterns
        if (achievement === 100 || achievement === 0) {
          detectedAnomalies.push({
            kpiId: kpi.id,
            kpiName: kpi.name,
            type: 'suspicious',
            severity: 'low',
            message: `Exact ${achievement}% achievement may need verification`,
            recommendation: 'Please verify the actual data and provide supporting evidence.'
          })
        }

        // At risk KPIs
        if (achievement >= 60 && achievement < 80) {
          detectedAnomalies.push({
            kpiId: kpi.id,
            kpiName: kpi.name,
            type: 'at_risk',
            severity: 'low',
            message: `At ${achievement.toFixed(0)}% - below expected performance`,
            recommendation: 'Monitor closely and implement improvement measures.'
          })
        }
      })

      setAnomalies(detectedAnomalies)
      setIsAnalyzing(false)
    }, 1000)
  }

  const getAnomalyIcon = (type: string) => {
    switch (type) {
      case 'overachievement':
        return <TrendingUp className="h-5 w-5" />
      case 'underachievement':
        return <TrendingDown className="h-5 w-5" />
      case 'suspicious':
        return <AlertTriangle className="h-5 w-5" />
      default:
        return <AlertTriangle className="h-5 w-5" />
    }
  }

  const getAnomalyColor = (type: string, severity: string) => {
    if (type === 'overachievement') return 'text-blue-600 bg-blue-50'
    if (type === 'underachievement') {
      return severity === 'high' ? 'text-red-600 bg-red-50' : 'text-orange-600 bg-orange-50'
    }
    if (type === 'suspicious') return 'text-yellow-600 bg-yellow-50'
    return 'text-gray-600 bg-gray-50'
  }

  const getSeverityBadge = (severity: string) => {
    const colors = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-gray-100 text-gray-700'
    }
    return colors[severity as keyof typeof colors]
  }

  if (kpiData.length === 0) return null

  return (
    <Card className="border-red-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-red-600" />
              AI Performance Analysis
            </CardTitle>
            <CardDescription>
              Intelligent detection of performance anomalies and patterns
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={analyzeData}
            disabled={isAnalyzing}
            className="border-red-200 hover:bg-red-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
            Re-analyze
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isAnalyzing ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Brain className="h-12 w-12 text-red-600 animate-pulse mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Analyzing KPI data...</p>
            </div>
          </div>
        ) : anomalies.length === 0 ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>No Anomalies Detected</AlertTitle>
            <AlertDescription>
              All KPIs are performing within expected parameters.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {anomalies.map((anomaly, index) => (
              <Alert key={index} className={`${getAnomalyColor(anomaly.type, anomaly.severity)} border`}>
                <div className="flex items-start gap-3">
                  {getAnomalyIcon(anomaly.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTitle className="text-sm font-medium">
                        {anomaly.kpiName}
                      </AlertTitle>
                      <Badge variant="outline" className={`text-xs ${getSeverityBadge(anomaly.severity)}`}>
                        {anomaly.severity}
                      </Badge>
                    </div>
                    <AlertDescription className="text-xs">
                      <p className="mb-1">{anomaly.message}</p>
                      <p className="font-medium">💡 {anomaly.recommendation}</p>
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}