import type { KpiType, KpiDefinition } from "./types"

export interface KpiTemplate {
  id: string
  name: string
  department: string
  description: string
  kpiFields: KpiTemplateField[]
  defaultWeights: Record<string, number>
  createdBy: string
  createdAt: Date
  isActive: boolean
}

export interface KpiTemplateField {
  id: string
  title: string
  type: KpiType
  unit: string
  description: string
  dataSource?: string
  formula?: string
  targetRange?: {
    min: number
    max: number
    recommended: number
  }
  weight: number
  isRequired: boolean
  evidenceRequired: boolean
}

export const kpiTemplates: KpiTemplate[] = [
  {
    id: "1",
    name: "Sales Performance Template",
    department: "Sales",
    description: "Standard KPI template for sales team performance evaluation",
    kpiFields: [
      {
        id: "s1",
        title: "Monthly Revenue Growth",
        type: "QUANT_HIGHER_BETTER",
        unit: "%",
        description: "Percentage increase in monthly revenue compared to previous month",
        dataSource: "CRM System",
        formula: "((Current Month Revenue - Previous Month Revenue) / Previous Month Revenue) * 100",
        targetRange: { min: 10, max: 25, recommended: 15 },
        weight: 30,
        isRequired: true,
        evidenceRequired: true,
      },
      {
        id: "s2",
        title: "Customer Acquisition Rate",
        type: "QUANT_HIGHER_BETTER",
        unit: "customers",
        description: "Number of new customers acquired per month",
        dataSource: "CRM System",
        targetRange: { min: 30, max: 80, recommended: 50 },
        weight: 25,
        isRequired: true,
        evidenceRequired: true,
      },
      {
        id: "s3",
        title: "Customer Retention Rate",
        type: "QUANT_HIGHER_BETTER",
        unit: "%",
        description: "Percentage of customers retained over the evaluation period",
        dataSource: "CRM System",
        targetRange: { min: 85, max: 95, recommended: 90 },
        weight: 25,
        isRequired: true,
        evidenceRequired: false,
      },
      {
        id: "s4",
        title: "Sales Target Achievement",
        type: "QUANT_HIGHER_BETTER",
        unit: "%",
        description: "Percentage of individual sales target achieved",
        dataSource: "Sales System",
        targetRange: { min: 90, max: 120, recommended: 100 },
        weight: 20,
        isRequired: true,
        evidenceRequired: true,
      },
    ],
    defaultWeights: { s1: 30, s2: 25, s3: 25, s4: 20 },
    createdBy: "admin",
    createdAt: new Date(2024, 0, 15),
    isActive: true,
  },
  {
    id: "2",
    name: "HR Performance Template",
    department: "HR",
    description: "Human Resources team KPI template focusing on talent management",
    kpiFields: [
      {
        id: "h1",
        title: "Employee Retention Rate",
        type: "QUANT_HIGHER_BETTER",
        unit: "%",
        description: "Percentage of employees retained over a 12-month period",
        dataSource: "HRIS",
        formula: "((Employees at End - New Hires) / Employees at Start) * 100",
        targetRange: { min: 80, max: 95, recommended: 85 },
        weight: 35,
        isRequired: true,
        evidenceRequired: true,
      },
      {
        id: "h2",
        title: "Time to Fill Positions",
        type: "QUANT_LOWER_BETTER",
        unit: "days",
        description: "Average number of days to fill open positions",
        dataSource: "HRIS",
        targetRange: { min: 15, max: 45, recommended: 30 },
        weight: 25,
        isRequired: true,
        evidenceRequired: true,
      },
      {
        id: "h3",
        title: "Employee Satisfaction Score",
        type: "QUANT_HIGHER_BETTER",
        unit: "score",
        description: "Average employee satisfaction score from surveys",
        dataSource: "Survey System",
        targetRange: { min: 3.5, max: 5.0, recommended: 4.0 },
        weight: 25,
        isRequired: true,
        evidenceRequired: true,
      },
      {
        id: "h4",
        title: "Training Completion Rate",
        type: "QUANT_HIGHER_BETTER",
        unit: "%",
        description: "Percentage of required training completed by employees",
        dataSource: "LMS",
        targetRange: { min: 85, max: 100, recommended: 95 },
        weight: 15,
        isRequired: false,
        evidenceRequired: false,
      },
    ],
    defaultWeights: { h1: 35, h2: 25, h3: 25, h4: 15 },
    createdBy: "admin",
    createdAt: new Date(2024, 0, 20),
    isActive: true,
  },
  {
    id: "3",
    name: "Quality Assurance Template",
    department: "Quality",
    description: "Quality control and assurance KPI template",
    kpiFields: [
      {
        id: "q1",
        title: "Reduce Internal NCR Cases",
        type: "QUANT_LOWER_BETTER",
        unit: "cases",
        description: "Number of internal non-conformance reports",
        dataSource: "eQMS System",
        targetRange: { min: 2, max: 8, recommended: 5 },
        weight: 40,
        isRequired: true,
        evidenceRequired: true,
      },
      {
        id: "q2",
        title: "Customer Complaint Resolution Time",
        type: "QUANT_LOWER_BETTER",
        unit: "days",
        description: "Average time to resolve customer complaints",
        dataSource: "CRM System",
        targetRange: { min: 1, max: 5, recommended: 3 },
        weight: 30,
        isRequired: true,
        evidenceRequired: true,
      },
      {
        id: "q3",
        title: "Quality Audit Score",
        type: "QUANT_HIGHER_BETTER",
        unit: "score",
        description: "Average score from quality audits",
        dataSource: "Audit System",
        targetRange: { min: 85, max: 100, recommended: 95 },
        weight: 30,
        isRequired: true,
        evidenceRequired: true,
      },
    ],
    defaultWeights: { q1: 40, q2: 30, q3: 30 },
    createdBy: "admin",
    createdAt: new Date(2024, 1, 1),
    isActive: true,
  },
  {
    id: "4",
    name: "Marketing Performance Template",
    department: "Marketing",
    description: "Marketing team performance and campaign effectiveness KPIs",
    kpiFields: [
      {
        id: "m1",
        title: "Lead Conversion Rate",
        type: "QUANT_HIGHER_BETTER",
        unit: "%",
        description: "Percentage of leads that convert to customers",
        dataSource: "Marketing Automation",
        formula: "(Converted Leads / Total Leads) * 100",
        targetRange: { min: 8, max: 20, recommended: 12 },
        weight: 35,
        isRequired: true,
        evidenceRequired: true,
      },
      {
        id: "m2",
        title: "Cost Per Acquisition",
        type: "QUANT_LOWER_BETTER",
        unit: "USD",
        description: "Average cost to acquire a new customer",
        dataSource: "Marketing Analytics",
        targetRange: { min: 50, max: 200, recommended: 100 },
        weight: 25,
        isRequired: true,
        evidenceRequired: true,
      },
      {
        id: "m3",
        title: "Brand Awareness Score",
        type: "QUANT_HIGHER_BETTER",
        unit: "%",
        description: "Brand recognition percentage in target market",
        dataSource: "Market Research",
        targetRange: { min: 60, max: 90, recommended: 75 },
        weight: 25,
        isRequired: false,
        evidenceRequired: true,
      },
      {
        id: "m4",
        title: "Campaign ROI",
        type: "QUANT_HIGHER_BETTER",
        unit: "%",
        description: "Return on investment for marketing campaigns",
        dataSource: "Analytics Platform",
        targetRange: { min: 200, max: 500, recommended: 300 },
        weight: 15,
        isRequired: true,
        evidenceRequired: true,
      },
    ],
    defaultWeights: { m1: 35, m2: 25, m3: 25, m4: 15 },
    createdBy: "admin",
    createdAt: new Date(2024, 1, 10),
    isActive: true,
  },
]

export const KPI_TYPES = {
  QUANT_HIGHER_BETTER: "Quantitative (Higher is Better)",
  QUANT_LOWER_BETTER: "Quantitative (Lower is Better)",
  MILESTONE: "Milestone-based",
  BOOLEAN: "Yes/No Achievement",
  BEHAVIOR: "Behavioral/Competency",
} as const

export const SCORE_BANDS = {
  5: { min: 120, label: "Exceptional (≥120%)", color: "bg-green-600" },
  4: { min: 100, max: 119, label: "Exceeds (100-119%)", color: "bg-green-500" },
  3: { min: 80, max: 99, label: "Meets (80-99%)", color: "bg-yellow-500" },
  2: { min: 60, max: 79, label: "Below (60-79%)", color: "bg-orange-500" },
  1: { min: 0, max: 59, label: "Poor (<60%)", color: "bg-red-500" },
}

export const calculateKpiScore = (actual: number, target: number, type: KpiType): number => {
  let percentage: number

  switch (type) {
    case "QUANT_HIGHER_BETTER":
      percentage = (actual / target) * 100
      // Apply cap at 150%
      percentage = Math.min(percentage, 150)
      break

    case "QUANT_LOWER_BETTER":
      if (actual === 0 && target === 0) {
        percentage = 100
      } else if (actual === 0 && target > 0) {
        percentage = 150
      } else {
        percentage = (target / actual) * 100
        percentage = Math.min(percentage, 150)
      }
      break

    case "MILESTONE":
      percentage = (actual / target) * 100
      break

    case "BOOLEAN":
      percentage = actual > 0 ? 100 : 0
      break

    case "BEHAVIOR":
      // For behavior, actual is already a score 1-5
      percentage = (actual / 5) * 100
      break

    default:
      percentage = 0
  }

  // Convert percentage to score (1-5)
  if (percentage >= 120) return 5
  if (percentage >= 100) return 4
  if (percentage >= 80) return 3
  if (percentage >= 60) return 2
  return 1
}

export const validateKpiWeights = (kpis: { weight: number }[]): boolean => {
  const totalWeight = kpis.reduce((sum, kpi) => sum + kpi.weight, 0)
  return totalWeight === 100
}

export const checkSmartCriteria = (
  kpi: Partial<KpiDefinition>,
): {
  score: number
  issues: string[]
  suggestions: string[]
} => {
  const issues: string[] = []
  const suggestions: string[] = []
  let score = 0

  // Specific
  if (kpi.title && kpi.title.length > 10) {
    score += 20
  } else {
    issues.push("Title should be more specific and descriptive")
    suggestions.push("Include what exactly will be measured")
  }

  // Measurable
  if (kpi.unit && kpi.target !== undefined) {
    score += 20
  } else {
    issues.push("Missing measurable unit or target")
    suggestions.push("Define clear unit of measurement and target value")
  }

  // Achievable
  if (kpi.target !== undefined && kpi.target > 0) {
    score += 20
  } else {
    issues.push("Target should be realistic and achievable")
    suggestions.push("Set a positive, realistic target based on historical data")
  }

  // Relevant
  if (kpi.dataSource) {
    score += 20
  } else {
    issues.push("Data source not specified")
    suggestions.push("Specify where the data will come from")
  }

  // Time-bound (assuming cycle provides time boundary)
  score += 20

  return { score, issues, suggestions }
}
