// components/ai/enhanced-anomaly-detector.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle,
  Brain,
  RefreshCw,
  Shield,
  BarChart3,
  Activity,
  Eye,
  FileText,
  Clock,
  User
} from "lucide-react"
import { enhancedAIService } from "@/lib/ai-services-enhanced"
import type { EnhancedAnomalyDetection } from "@/lib/ai-services-enhanced"

interface KpiData {
  id: string
  name: string
  actualValue: number
  targetValue: number
  userId?: string
  evidenceFiles?: string[]
  submissionTime?: string
  userBehavior?: any
}

interface EnhancedAnomalyDetectorProps {
  kpiData: KpiData[]
  showStatisticalAnalysis?: boolean
  showBehaviorAnalysis?: boolean  
  showRiskScoring?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
  className?: string
}

export function EnhancedAnomalyDetector({ 
  kpiData, 
  showStatisticalAnalysis = true,
  showBehaviorAnalysis = true,
  showRiskScoring = true,
  autoRefresh = false,
  refreshInterval = 30000,
  className 
}: EnhancedAnomalyDetectorProps) {
  const [anomalies, setAnomalies] = useState<EnhancedAnomalyDetection[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [lastAnalysis, setLastAnalysis] = useState<Date | null>(null)
  const [selectedTab, setSelectedTab] = useState('overview')
  const [riskSummary, setRiskSummary] = useState<any>(null)

  useEffect(() => {
    analyzeData()
  }, [kpiData])

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(analyzeData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  const analyzeData = async () => {
    if (kpiData.length === 0) return
    
    setIsAnalyzing(true)
    
    try {
      const detectedAnomalies = await enhancedAIService.detectEnhancedAnomalies(kpiData)
      setAnomalies(detectedAnomalies)
      setLastAnalysis(new Date())
      
      const summary = calculateRiskSummary(detectedAnomalies)
      setRiskSummary(summary)
    } catch (error) {
      console.error('Enhanced anomaly detection failed:', error)
      setAnomalies([])
    } finally {
      setIsAnalyzing(false)
    }
  }

  const calculateRiskSummary = (anomalies: EnhancedAnomalyDetection[]) => {
    const total = anomalies.length
    const critical = anomalies.filter(a => a.severity === 'high').length
    const medium = anomalies.filter(a => a.severity === 'medium').length
    const low = anomalies.filter(a => a.severity === 'low').length
    const avgRiskScore = total > 0 
      ? anomalies.reduce((sum, a) => sum + a.riskScore, 0) / total 
      : 0

    return {
      total,
      critical,
      medium, 
      low,
      avgRiskScore: Math.round(avgRiskScore),
      needsReview: anomalies.filter(a => a.needsHumanReview).length,
      autoActions: anomalies.reduce((sum, a) => sum + a.autoActions.length, 0)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low': return 'bg-red-100 text-red-800 border-red-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-red-600'
    if (score >= 60) return 'text-orange-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getAnomalyIcon = (type: string) => {
    switch (type) {
      case 'sudden_spike': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'sudden_drop': return <TrendingDown className="h-4 w-4 text-red-600" />
      case 'trend_deviation': return <BarChart3 className="h-4 w-4 text-orange-600" />
      case 'seasonal_anomaly': return <Activity className="h-4 w-4 text-red-600" />
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with Risk Summary */}
      <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-orange-600" />
              <div>
                <CardTitle className="text-orange-900">AI Anomaly Detection</CardTitle>
                <CardDescription className="text-orange-700">
                  Advanced pattern recognition and fraud prevention
                </CardDescription>
              </div>
            </div>
            <Button 
              onClick={analyzeData} 
              disabled={isAnalyzing}
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
              {isAnalyzing ? 'Analyzing...' : 'Re-analyze'}
            </Button>
          </div>
        </CardHeader>

        {riskSummary && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{riskSummary.total}</div>
                <div className="text-sm text-gray-600">Total Issues</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{riskSummary.critical + riskSummary.high}</div>
                <div className="text-sm text-gray-600">High Priority</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{riskSummary.medium}</div>
                <div className="text-sm text-gray-600">Medium</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getRiskColor(riskSummary.avgRiskScore)}`}>
                  {riskSummary.avgRiskScore}
                </div>
                <div className="text-sm text-gray-600">Avg Risk</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{riskSummary.needsReview}</div>
                <div className="text-sm text-gray-600">Need Review</div>
              </div>
            </div>
            
            {lastAnalysis && (
              <div className="mt-4 text-xs text-gray-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last analyzed: {lastAnalysis.toLocaleTimeString()}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Analysis Results */}
      {isAnalyzing ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <Brain className="h-12 w-12 text-orange-600 animate-pulse mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Running advanced AI analysis...</p>
                <div className="mt-2 text-xs text-gray-400">
                  Checking statistical patterns, behavior analysis, and fraud indicators
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : anomalies.length === 0 ? (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle className="text-green-800">All Clear</AlertTitle>
          <AlertDescription className="text-green-700">
            No anomalies detected. All KPIs are performing within expected parameters.
          </AlertDescription>
        </Alert>
      ) : (
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {showStatisticalAnalysis && <TabsTrigger value="statistical">Statistical</TabsTrigger>}
            {showBehaviorAnalysis && <TabsTrigger value="behavioral">Behavioral</TabsTrigger>}
            {showRiskScoring && <TabsTrigger value="risk">Risk Analysis</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="space-y-3">
            {anomalies.map((anomaly, index) => (
              <AnomalyCard
                key={`${anomaly.kpiId}-${index}`}
                anomaly={anomaly}
                showDetails={true}
              />
            ))}
          </TabsContent>

          {showStatisticalAnalysis && (
            <TabsContent value="statistical" className="space-y-4">
              <StatisticalAnalysisPanel anomalies={anomalies} />
            </TabsContent>
          )}

          {showBehaviorAnalysis && (
            <TabsContent value="behavioral" className="space-y-4">
              <BehavioralAnalysisPanel anomalies={anomalies} />
            </TabsContent>
          )}

          {showRiskScoring && (
            <TabsContent value="risk" className="space-y-4">
              <RiskAnalysisPanel anomalies={anomalies} />
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  )
}

// Individual Anomaly Card Component
function AnomalyCard({ 
  anomaly, 
  showDetails = false 
}: { 
  anomaly: EnhancedAnomalyDetection; 
  showDetails?: boolean 
}) {
  const [expanded, setExpanded] = useState(false)

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-red-300 bg-red-50'
      case 'medium': return 'border-yellow-300 bg-yellow-50' 
      case 'low': return 'border-red-300 bg-red-50'
      default: return 'border-gray-300 bg-gray-50'
    }
  }

  const getAnomalyIcon = (type: string) => {
    switch (type) {
      case 'sudden_spike': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'sudden_drop': return <TrendingDown className="h-4 w-4 text-red-600" />
      case 'trend_deviation': return <BarChart3 className="h-4 w-4 text-orange-600" />
      case 'seasonal_anomaly': return <Activity className="h-4 w-4 text-red-600" />
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <Alert className={`${getSeverityColor(anomaly.severity)} border transition-all duration-200`}>
      <div className="flex items-start gap-3">
        {getAnomalyIcon(anomaly.anomalyType)}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <AlertTitle className="text-sm font-medium">
              KPI: {anomaly.kpiId}
            </AlertTitle>
            <Badge className={`text-xs ${
              anomaly.severity === 'high' ? 'bg-red-100 text-red-800' :
              anomaly.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {anomaly.severity.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Risk: {anomaly.riskScore}/100
            </Badge>
            {anomaly.needsHumanReview && (
              <Badge className="bg-orange-100 text-orange-800 text-xs">
                <Eye className="h-3 w-3 mr-1" />
                Needs Review
              </Badge>
            )}
          </div>

          <AlertDescription className="space-y-2">
            <p className="text-sm">{anomaly.description}</p>
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">Risk Score:</span>
              <Progress value={anomaly.riskScore} className="flex-1 h-2" />
              <span className="text-xs font-medium">{anomaly.riskScore}%</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">Confidence:</span>
              <Progress value={anomaly.confidence} className="flex-1 h-2" />
              <span className="text-xs font-medium">{Math.round(anomaly.confidence)}%</span>
            </div>

            {anomaly.autoActions.length > 0 && (
              <div className="bg-white bg-opacity-60 p-2 rounded border">
                <div className="text-xs font-medium mb-1">Auto Actions Triggered:</div>
                <ul className="text-xs space-y-1">
                  {anomaly.autoActions.map((action, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <Shield className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-white bg-opacity-60 p-2 rounded border">
              <div className="text-xs font-medium mb-1">Recommended Actions:</div>
              <ul className="text-xs space-y-1">
                {anomaly.suggestedActions.map((action, idx) => (
                  <li key={idx} className="flex items-start gap-1">
                    <span className="text-red-500 mt-1">•</span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>

            {showDetails && (
              <div className="pt-2 border-t border-white border-opacity-50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                  className="h-6 px-2 text-xs"
                >
                  {expanded ? 'Hide Details' : 'Show Details'}
                </Button>

                {expanded && (
                  <div className="mt-3 space-y-3 text-xs">
                    <div className="grid grid-cols-3 gap-2 bg-white bg-opacity-60 p-2 rounded">
                      <div className="text-center">
                        <div className="font-medium">Z-Score</div>
                        <div className="text-lg font-bold">{anomaly.statisticalAnalysis.zScore.toFixed(2)}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">Percentile</div>
                        <div className="text-lg font-bold">{anomaly.statisticalAnalysis.percentile}th</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">Trend</div>
                        <Badge className={`text-xs ${
                          anomaly.statisticalAnalysis.trend === 'improving' ? 'bg-green-100 text-green-800' :
                          anomaly.statisticalAnalysis.trend === 'declining' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {anomaly.statisticalAnalysis.trend}
                        </Badge>
                      </div>
                    </div>

                    <div className="bg-white bg-opacity-60 p-2 rounded">
                      <div className="font-medium mb-1">Submission Behavior:</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>Time: {new Date(anomaly.behaviorPattern.submissionTime).toLocaleTimeString()}</div>
                        <div>Edits: {anomaly.behaviorPattern.editCount}</div>
                        <div>Duration: {Math.round(anomaly.behaviorPattern.timeSpent / 60)}min</div>
                        <div>Device: {anomaly.behaviorPattern.deviceInfo}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  )
}

// Statistical Analysis Panel
function StatisticalAnalysisPanel({ anomalies }: { anomalies: EnhancedAnomalyDetection[] }) {
  const statisticalAnomalies = anomalies.filter(a => a.anomalyType === 'trend_deviation')
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Statistical Analysis Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-50 p-4 rounded">
              <div className="text-2xl font-bold text-red-600">
                {statisticalAnomalies.length}
              </div>
              <div className="text-sm text-gray-600">Statistical Outliers</div>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <div className="text-2xl font-bold text-green-600">
                {anomalies.filter(a => a.statisticalAnalysis.trend === 'improving').length}
              </div>
              <div className="text-sm text-gray-600">Improving Trends</div>
            </div>
            <div className="bg-red-50 p-4 rounded">
              <div className="text-2xl font-bold text-red-600">
                {anomalies.filter(a => a.statisticalAnalysis.trend === 'declining').length}
              </div>
              <div className="text-sm text-gray-600">Declining Trends</div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <h3 className="font-medium">Z-Score Distribution</h3>
            {statisticalAnomalies.map((anomaly, index) => (
              <div key={index} className="flex items-center justify-between py-1 border-b">
                <span className="text-sm">{anomaly.kpiId}</span>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={Math.min(100, Math.abs(anomaly.statisticalAnalysis.zScore) * 20)} 
                    className="w-20 h-2" 
                  />
                  <span className="text-sm font-mono">
                    {anomaly.statisticalAnalysis.zScore.toFixed(2)}σ
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Behavioral Analysis Panel
function BehavioralAnalysisPanel({ anomalies }: { anomalies: EnhancedAnomalyDetection[] }) {
  const behavioralAnomalies = anomalies.filter(a => 
    a.anomalyType === 'seasonal_anomaly' || a.behaviorPattern
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Behavioral Pattern Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {behavioralAnomalies.map((anomaly, index) => (
              <div key={index} className="border rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{anomaly.kpiId}</span>
                  <Badge className={`${
                    anomaly.riskScore > 70 ? 'bg-red-100 text-red-800' :
                    anomaly.riskScore > 40 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    Risk: {anomaly.riskScore}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Submission:</span>
                    <div className="text-xs text-gray-600">
                      {new Date(anomaly.behaviorPattern.submissionTime).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Edit Count:</span>
                    <div className="text-xs text-gray-600">
                      {anomaly.behaviorPattern.editCount} changes
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Time Spent:</span>
                    <div className="text-xs text-gray-600">
                      {Math.round(anomaly.behaviorPattern.timeSpent / 60)} minutes
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Device:</span>
                    <div className="text-xs text-gray-600">
                      {anomaly.behaviorPattern.deviceInfo}
                    </div>
                  </div>
                </div>

                {anomaly.needsHumanReview && (
                  <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded">
                    <div className="flex items-center gap-1 text-orange-800 text-sm">
                      <Eye className="h-4 w-4" />
                      <span className="font-medium">Manual Review Required</span>
                    </div>
                    <div className="text-xs text-orange-600 mt-1">
                      Unusual behavioral patterns detected that require human verification.
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Risk Analysis Panel  
function RiskAnalysisPanel({ anomalies }: { anomalies: EnhancedAnomalyDetection[] }) {
  const riskLevels = {
    critical: anomalies.filter(a => a.riskScore >= 80),
    high: anomalies.filter(a => a.riskScore >= 60 && a.riskScore < 80),
    medium: anomalies.filter(a => a.riskScore >= 40 && a.riskScore < 60),
    low: anomalies.filter(a => a.riskScore < 40)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Risk Assessment Matrix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-red-50 p-4 rounded border border-red-200">
              <div className="text-2xl font-bold text-red-600">{riskLevels.critical.length}</div>
              <div className="text-sm text-red-700">Critical Risk</div>
              <div className="text-xs text-red-600">≥80 score</div>
            </div>
            <div className="bg-orange-50 p-4 rounded border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">{riskLevels.high.length}</div>
              <div className="text-sm text-orange-700">High Risk</div>
              <div className="text-xs text-orange-600">60-79 score</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">{riskLevels.medium.length}</div>
              <div className="text-sm text-yellow-700">Medium Risk</div>
              <div className="text-xs text-yellow-600">40-59 score</div>
            </div>
            <div className="bg-green-50 p-4 rounded border border-green-200">
              <div className="text-2xl font-bold text-green-600">{riskLevels.low.length}</div>
              <div className="text-sm text-green-700">Low Risk</div>
              <div className="text-xs text-green-600">&lt;40 score</div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium">High-Risk Items Requiring Attention</h3>
            {[...riskLevels.critical, ...riskLevels.high].map((anomaly, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded">
                <div className="flex-1">
                  <div className="font-medium">{anomaly.kpiId}</div>
                  <div className="text-sm text-gray-600">{anomaly.description}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={anomaly.riskScore} className="w-20 h-2" />
                  <span className={`text-sm font-bold ${
                    anomaly.riskScore >= 80 ? 'text-red-600' : 'text-orange-600'
                  }`}>
                    {anomaly.riskScore}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default EnhancedAnomalyDetector