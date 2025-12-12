import type { KpiDefinition, KpiActual, KpiType, PerformanceEvaluation, ScoreBand } from "./types"
import { calculateKpiScore } from "./kpi-utils"

export const SCORE_BANDS: ScoreBand[] = [
  {
    score: 5,
    minPercentage: 120,
    label: "Exceptional",
    color: "bg-green-600",
    description: "Significantly exceeds expectations (≥120%)",
  },
  {
    score: 4,
    minPercentage: 100,
    maxPercentage: 119,
    label: "Exceeds",
    color: "bg-green-500",
    description: "Exceeds expectations (100-119%)",
  },
  {
    score: 3,
    minPercentage: 80,
    maxPercentage: 99,
    label: "Meets",
    color: "bg-yellow-500",
    description: "Meets expectations (80-99%)",
  },
  {
    score: 2,
    minPercentage: 60,
    maxPercentage: 79,
    label: "Below",
    color: "bg-orange-500",
    description: "Below expectations (60-79%)",
  },
  {
    score: 1,
    minPercentage: 0,
    maxPercentage: 59,
    label: "Poor",
    color: "bg-red-500",
    description: "Significantly below expectations (<60%)",
  },
]

export const getScoreBand = (percentage: number): ScoreBand => {
  return (
    SCORE_BANDS.find((band) => {
      if (band.maxPercentage) {
        return percentage >= band.minPercentage && percentage <= band.maxPercentage
      }
      return percentage >= band.minPercentage
    }) || SCORE_BANDS[SCORE_BANDS.length - 1]
  )
}

export const calculateKpiActualScore = (
  kpiDefinition: KpiDefinition,
  actualValue: number,
): { percentage: number; score: number } => {
  const percentage = calculatePercentage(kpiDefinition.type, actualValue, kpiDefinition.target)
  const score = calculateKpiScore(actualValue, kpiDefinition.target, kpiDefinition.type)

  return { percentage, score }
}

const calculatePercentage = (type: KpiType, actual: number, target: number): number => {
  switch (type) {
    case "QUANT_HIGHER_BETTER":
      return Math.min((actual / target) * 100, 150)

    case "QUANT_LOWER_BETTER":
      if (actual === 0 && target === 0) return 100
      if (actual === 0 && target > 0) return 150
      return Math.min((target / actual) * 100, 150)

    case "MILESTONE":
      return (actual / target) * 100

    case "BOOLEAN":
      return actual > 0 ? 100 : 0

    case "BEHAVIOR":
      return (actual / 5) * 100

    default:
      return 0
  }
}

export const calculateOverallPerformance = (
  kpiDefinitions: KpiDefinition[],
  kpiActuals: KpiActual[],
): { overallScore: number; overallPercentage: number; totalWeight: number } => {
  let weightedScore = 0
  let weightedPercentage = 0
  let totalWeight = 0

  kpiDefinitions.forEach((kpi) => {
    const actual = kpiActuals.find((a) => a.kpiDefinitionId === kpi.id)
    if (actual) {
      weightedScore += actual.score * (kpi.weight / 100)
      weightedPercentage += actual.percentage * (kpi.weight / 100)
      totalWeight += kpi.weight
    }
  })

  return {
    overallScore: Math.round(weightedScore * 100) / 100,
    overallPercentage: Math.round(weightedPercentage * 100) / 100,
    totalWeight,
  }
}

export const getPerformanceInsights = (evaluation: PerformanceEvaluation) => {
  const insights = []

  if (evaluation.overallPercentage >= 120) {
    insights.push({
      type: "success",
      title: "Exceptional Performance",
      message: "Outstanding achievement across multiple KPIs",
    })
  } else if (evaluation.overallPercentage >= 100) {
    insights.push({
      type: "success",
      title: "Strong Performance",
      message: "Consistently meeting and exceeding targets",
    })
  } else if (evaluation.overallPercentage >= 80) {
    insights.push({
      type: "warning",
      title: "Good Performance",
      message: "Meeting most targets with room for improvement",
    })
  } else {
    insights.push({
      type: "error",
      title: "Performance Gap",
      message: "Several areas need attention and improvement",
    })
  }

  // Analyze individual KPI performance
  const highPerformers = evaluation.kpiActuals.filter((a) => a.percentage >= 120)
  const lowPerformers = evaluation.kpiActuals.filter((a) => a.percentage < 80)

  if (highPerformers.length > 0) {
    insights.push({
      type: "info",
      title: "Top Performing Areas",
      message: `${highPerformers.length} KPI(s) significantly exceeded targets`,
    })
  }

  if (lowPerformers.length > 0) {
    insights.push({
      type: "warning",
      title: "Areas for Improvement",
      message: `${lowPerformers.length} KPI(s) need focused attention`,
    })
  }

  return insights
}

export const validateEvaluation = (
  kpiDefinitions: KpiDefinition[],
  kpiActuals: KpiActual[],
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  // Check if all KPIs have actuals
  const missingActuals = kpiDefinitions.filter((kpi) => !kpiActuals.find((actual) => actual.kpiDefinitionId === kpi.id))

  if (missingActuals.length > 0) {
    errors.push(`Missing actual values for ${missingActuals.length} KPI(s)`)
  }

  // Check for negative values where not allowed
  kpiActuals.forEach((actual) => {
    if (actual.actualValue < 0) {
      errors.push("Actual values cannot be negative")
    }
  })

  // Check total weight
  const totalWeight = kpiDefinitions.reduce((sum, kpi) => sum + kpi.weight, 0)
  if (totalWeight !== 100) {
    errors.push("Total KPI weight must equal 100%")
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
