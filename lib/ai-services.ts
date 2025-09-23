// AI Services for KPI Management
export interface AIKPISuggestion {
  name: string
  description: string
  target: number
  unit: string
  type: "quantitative" | "qualitative" | "binary"
  formula: string
  weight: number
  rationale: string
  smartAnalysis: {
    specific: boolean
    measurable: boolean
    achievable: boolean
    relevant: boolean
    timeBound: boolean
    score: number
    suggestions: string[]
  }
}

export interface AIAnomalyDetection {
  kpiId: string
  anomalyType: "sudden_drop" | "sudden_spike" | "trend_deviation" | "seasonal_anomaly"
  severity: "low" | "medium" | "high"
  description: string
  suggestedActions: string[]
  confidence: number
}

// Mock AI service - in production this would call actual AI APIs
export class AIService {
  static async generateKPISuggestions(department: string, role: string, context?: string): Promise<AIKPISuggestion[]> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const suggestions: Record<string, AIKPISuggestion[]> = {
      Sales: [
        {
          name: "Monthly Revenue Growth",
          description: "Percentage increase in monthly revenue compared to previous month",
          target: 15,
          unit: "%",
          type: "quantitative",
          formula: "((Current Month Revenue - Previous Month Revenue) / Previous Month Revenue) * 100",
          weight: 25,
          rationale: "Revenue growth is a key indicator of sales performance and business expansion",
          smartAnalysis: {
            specific: true,
            measurable: true,
            achievable: true,
            relevant: true,
            timeBound: true,
            score: 95,
            suggestions: ["Consider seasonal variations", "Set realistic targets based on market conditions"],
          },
        },
        {
          name: "Customer Acquisition Rate",
          description: "Number of new customers acquired per month",
          target: 50,
          unit: "customers",
          type: "quantitative",
          formula: "COUNT(new_customers_this_month)",
          weight: 20,
          rationale: "New customer acquisition drives long-term business growth",
          smartAnalysis: {
            specific: true,
            measurable: true,
            achievable: true,
            relevant: true,
            timeBound: true,
            score: 90,
            suggestions: ['Define clear criteria for "new customer"', "Consider lead quality metrics"],
          },
        },
      ],
      Marketing: [
        {
          name: "Lead Conversion Rate",
          description: "Percentage of leads that convert to customers",
          target: 12,
          unit: "%",
          type: "quantitative",
          formula: "(Converted Leads / Total Leads) * 100",
          weight: 30,
          rationale: "Measures marketing effectiveness in generating quality leads",
          smartAnalysis: {
            specific: true,
            measurable: true,
            achievable: true,
            relevant: true,
            timeBound: true,
            score: 92,
            suggestions: ["Track by lead source", "Consider lead scoring implementation"],
          },
        },
      ],
      HR: [
        {
          name: "Employee Retention Rate",
          description: "Percentage of employees retained over a 12-month period",
          target: 85,
          unit: "%",
          type: "quantitative",
          formula: "((Employees at End - New Hires) / Employees at Start) * 100",
          weight: 25,
          rationale: "High retention reduces recruitment costs and maintains institutional knowledge",
          smartAnalysis: {
            specific: true,
            measurable: true,
            achievable: true,
            relevant: true,
            timeBound: true,
            score: 88,
            suggestions: ["Exclude involuntary terminations", "Consider department-specific targets"],
          },
        },
      ],
    }

    return suggestions[department] || []
  }

  static async analyzeSMARTCriteria(kpi: any): Promise<AIKPISuggestion["smartAnalysis"]> {
    await new Promise((resolve) => setTimeout(resolve, 800))

    const analysis = {
      specific: kpi.name && kpi.description ? true : false,
      measurable: kpi.target && kpi.unit ? true : false,
      achievable: kpi.target > 0 && kpi.target < 1000 ? true : false,
      relevant: kpi.description.length > 20 ? true : false,
      timeBound: true, // Assuming all KPIs have time bounds
      score: 0,
      suggestions: [] as string[],
    }

    // Calculate score
    const criteria = [
      analysis.specific,
      analysis.measurable,
      analysis.achievable,
      analysis.relevant,
      analysis.timeBound,
    ]
    analysis.score = (criteria.filter(Boolean).length / criteria.length) * 100

    // Generate suggestions
    if (!analysis.specific) {
      analysis.suggestions.push("Make the KPI name and description more specific")
    }
    if (!analysis.measurable) {
      analysis.suggestions.push("Add clear target value and unit of measurement")
    }
    if (!analysis.achievable) {
      analysis.suggestions.push("Review target value for achievability")
    }
    if (!analysis.relevant) {
      analysis.suggestions.push("Provide more detailed description explaining relevance")
    }

    return analysis
  }

  static async detectAnomalies(kpiData: any[]): Promise<AIAnomalyDetection[]> {
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const anomalies: AIAnomalyDetection[] = []

    // Mock anomaly detection logic
    kpiData.forEach((kpi, index) => {
      if (kpi.actualValue < kpi.targetValue * 0.5) {
        anomalies.push({
          kpiId: kpi.id,
          anomalyType: "sudden_drop",
          severity: "high",
          description: `${kpi.name} has dropped significantly below target (${kpi.actualValue} vs ${kpi.targetValue})`,
          suggestedActions: [
            "Investigate root causes for performance drop",
            "Review recent changes in processes or market conditions",
            "Consider adjusting targets or implementation strategy",
          ],
          confidence: 0.85,
        })
      }

      if (kpi.actualValue > kpi.targetValue * 1.5) {
        anomalies.push({
          kpiId: kpi.id,
          anomalyType: "sudden_spike",
          severity: "medium",
          description: `${kpi.name} has exceeded target significantly (${kpi.actualValue} vs ${kpi.targetValue})`,
          suggestedActions: [
            "Analyze factors contributing to exceptional performance",
            "Consider if targets need adjustment for next period",
            "Document best practices for replication",
          ],
          confidence: 0.78,
        })
      }
    })

    return anomalies
  }

  static async generateInsights(performanceData: any): Promise<string[]> {
    await new Promise((resolve) => setTimeout(resolve, 600))

    const insights = [
      "Sales KPIs show strong performance with 23% above target average",
      "Marketing conversion rates have improved by 15% compared to last quarter",
      "HR retention metrics indicate stable workforce with low turnover risk",
      "Overall organizational performance is trending upward with 78% KPI achievement rate",
    ]

    return insights
  }
}
