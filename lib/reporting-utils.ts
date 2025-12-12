// lib/reporting-utils.ts - FIXED: Optional department filter
import type { User, KpiDefinition, KpiActual, ReportFilter, ReportData } from './types'
import { storageService } from './storage-service'

// Re-export types for easier imports
export type { ReportFilter, ReportData } from './types'

/**
 * Generate comprehensive report data
 */
export function generateReportData(filter: ReportFilter): ReportData {
  try {
    // Get filtered KPI definitions
    let kpiDefinitions = storageService.getKpiDefinitions()
    
    if (filter.cycleId) {
      kpiDefinitions = kpiDefinitions.filter(k => k.cycleId === filter.cycleId)
    }
    
    if (filter.userId) {
      kpiDefinitions = kpiDefinitions.filter(k => k.userId === filter.userId)
    }
    
    if (filter.orgUnitId) {
      kpiDefinitions = kpiDefinitions.filter(k => k.orgUnitId === filter.orgUnitId)
    }
    
    if (filter.status) {
      kpiDefinitions = kpiDefinitions.filter(k => k.status === filter.status)
    }
    
    // Get all actuals for these KPIs
    const kpiActuals = kpiDefinitions
      .map(kpi => storageService.getKpiActuals({ kpiDefinitionId: kpi.id }))
      .flat()
    
    // Calculate summary
    const totalKpis = kpiDefinitions.length
    const completedKpis = kpiDefinitions.filter(kpi => 
      kpi.status === 'APPROVED' || kpi.status === 'LOCKED_GOALS'
    ).length
    
    const relevantActuals = kpiActuals.filter(actual => 
      actual.status === 'APPROVED' || actual.status === 'LOCKED_ACTUALS'
    )
    
    const averageScore = relevantActuals.length > 0 
      ? relevantActuals.reduce((sum, actual) => sum + actual.score, 0) / relevantActuals.length 
      : 0
    
    const participationRate = totalKpis > 0 ? (completedKpis / totalKpis) * 100 : 0
    
    // Generate department breakdown
    const departmentBreakdown = generateDepartmentBreakdown(kpiDefinitions, kpiActuals)
    
    // Generate top performers
    const topPerformers = generateTopPerformers(kpiDefinitions, kpiActuals)
    
    // Generate improvement areas
    const improvements = generateImprovementAreas(kpiDefinitions, kpiActuals)
    
    return {
      summary: {
        totalKpis,
        completedKpis,
        averageScore,
        participationRate
      },
      departmentBreakdown,
      topPerformers,
      improvements
    }
  } catch (error) {
    console.error('Error generating report data:', error)
    return {
      summary: { totalKpis: 0, completedKpis: 0, averageScore: 0, participationRate: 0 },
      departmentBreakdown: [],
      topPerformers: [],
      improvements: []
    }
  }
}

/**
 * Generate department breakdown
 */
function generateDepartmentBreakdown(
  kpiDefinitions: KpiDefinition[], 
  kpiActuals: KpiActual[]
): ReportData['departmentBreakdown'] {
  const departmentMap = new Map<string, {
    name: string
    kpis: KpiDefinition[]
    actuals: KpiActual[]
  }>()
  
  // Group KPIs by department
  kpiDefinitions.forEach(kpi => {
    const deptKey = kpi.orgUnitId || 'unknown'
    const deptName = getDepartmentName(deptKey)
    
    if (!departmentMap.has(deptKey)) {
      departmentMap.set(deptKey, {
        name: deptName,
        kpis: [],
        actuals: []
      })
    }
    
    departmentMap.get(deptKey)!.kpis.push(kpi)
  })
  
  // Add actuals to departments
  kpiActuals.forEach(actual => {
    const kpi = kpiDefinitions.find(k => k.id === actual.kpiDefinitionId)
    if (kpi) {
      const deptKey = kpi.orgUnitId || 'unknown'
      const dept = departmentMap.get(deptKey)
      if (dept) {
        dept.actuals.push(actual)
      }
    }
  })
  
  // Calculate metrics for each department
  return Array.from(departmentMap.values()).map(dept => ({
    name: dept.name,
    totalKpis: dept.kpis.length,
    completedKpis: dept.kpis.filter(kpi => kpi.status === 'LOCKED_GOALS').length,
    avgScore: dept.actuals.length > 0 
      ? dept.actuals.reduce((sum, actual) => sum + actual.score, 0) / dept.actuals.length 
      : 0,
    participationRate: dept.kpis.length > 0 
      ? (dept.kpis.filter(kpi => kpi.status === 'LOCKED_GOALS').length / dept.kpis.length) * 100 
      : 0
  }))
}

/**
 * Generate top performers list
 */
function generateTopPerformers(
  kpiDefinitions: KpiDefinition[], 
  kpiActuals: KpiActual[]
): ReportData['topPerformers'] {
  const userMap = new Map<string, {
    userId: string
    userName: string
    department: string
    scores: number[]
    completedKpis: number
  }>()
  
  // Group by user
  kpiDefinitions.forEach(kpi => {
    const actuals = kpiActuals.filter(actual => actual.kpiDefinitionId === kpi.id)
    
    if (!userMap.has(kpi.userId)) {
      userMap.set(kpi.userId, {
        userId: kpi.userId,
        userName: getUserName(kpi.userId),
        department: getDepartmentName(kpi.orgUnitId || ''),
        scores: [],
        completedKpis: 0
      })
    }
    
    const user = userMap.get(kpi.userId)!
    if (actuals.length > 0) {
      user.scores.push(...actuals.map(a => a.score))
      user.completedKpis += 1
    }
  })
  
  // Calculate average scores and return top performers
  return Array.from(userMap.values())
    .map(user => ({
      userId: user.userId,
      userName: user.userName,
      department: user.department,
      avgScore: user.scores.length > 0 
        ? user.scores.reduce((sum, score) => sum + score, 0) / user.scores.length 
        : 0,
      completedKpis: user.completedKpis
    }))
    .filter(user => user.completedKpis > 0)
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 10)
}

/**
 * Generate improvement areas
 */
function generateImprovementAreas(
  kpiDefinitions: KpiDefinition[], 
  kpiActuals: KpiActual[]
): ReportData['improvements'] {
  const improvements: ReportData['improvements'] = []
  
  // Analyze completion rates
  const completionRate = kpiDefinitions.length > 0 
    ? (kpiDefinitions.filter(kpi => kpi.status === 'LOCKED_GOALS').length / kpiDefinitions.length) * 100 
    : 0
  
  if (completionRate < 80) {
    improvements.push({
      area: 'KPI Completion Rate',
      currentScore: completionRate,
      targetScore: 90,
      gap: 90 - completionRate,
      priority: completionRate < 60 ? 'HIGH' : 'MEDIUM'
    })
  }
  
  // Analyze average scores by department
  const deptBreakdown = generateDepartmentBreakdown(kpiDefinitions, kpiActuals)
  deptBreakdown.forEach(dept => {
    if (dept.avgScore < 3.5 && dept.completedKpis > 0) {
      improvements.push({
        area: `${dept.name} Performance`,
        currentScore: dept.avgScore,
        targetScore: 4.0,
        gap: 4.0 - dept.avgScore,
        priority: dept.avgScore < 3.0 ? 'HIGH' : 'MEDIUM'
      })
    }
  })
  
  return improvements.slice(0, 5) // Top 5 improvement areas
}

/**
 * Export report to Excel format
 */
export async function exportToExcel(data: ReportData, filename: string): Promise<void> {
  try {
    // Generate CSV content
    const csvContent = generateCSVContent(data)
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('Export failed:', error)
    throw new Error('Export failed')
  }
}

/**
 * Generate CSV content from report data
 */
function generateCSVContent(data: ReportData): string {
  const lines: string[] = []
  
  // Summary section
  lines.push('SUMMARY')
  lines.push('Metric,Value')
  lines.push(`Total KPIs,${data.summary.totalKpis}`)
  lines.push(`Completed KPIs,${data.summary.completedKpis}`)
  lines.push(`Average Score,${data.summary.averageScore.toFixed(2)}`)
  lines.push(`Participation Rate,${data.summary.participationRate.toFixed(2)}%`)
  lines.push('')
  
  // Department breakdown
  lines.push('DEPARTMENT BREAKDOWN')
  lines.push('Department,Total KPIs,Completed KPIs,Average Score,Participation Rate')
  data.departmentBreakdown.forEach(dept => {
    lines.push(`${dept.name},${dept.totalKpis},${dept.completedKpis},${dept.avgScore.toFixed(2)},${dept.participationRate.toFixed(2)}%`)
  })
  lines.push('')
  
  // Top performers
  lines.push('TOP PERFORMERS')
  lines.push('User,Department,Average Score,Completed KPIs')
  data.topPerformers.forEach(performer => {
    lines.push(`${performer.userName},${performer.department},${performer.avgScore.toFixed(2)},${performer.completedKpis}`)
  })
  
  return lines.join('\n')
}

/**
 * Check user permissions for reports
 */
export function getReportPermissions(user: User) {
  return {
    canViewAll: user.role === 'ADMIN' || user.role === 'MANAGER',
    canExport: user.role === 'ADMIN',
    canViewDepartment: user.role === 'LINE_MANAGER' || user.role === 'MANAGER',
    canViewOwn: true
  }
}

/**
 * Helper functions
 */
function getDepartmentName(orgUnitId: string): string {
  const departmentMap: Record<string, string> = {
    'org-admin': 'Administration',
    'org-hr': 'Human Resources',
    'org-it': 'Information Technology',
    'org-rnd': 'Research & Development', 
    'org-r&d': 'Research & Development',
    'org-production': 'Production',
    'org-quality': 'Quality Assurance',
    'org-sales': 'Sales',
    'org-marketing': 'Marketing',
    'org-finance': 'Finance',
    'org-executive': 'Executive'
  }
  return departmentMap[orgUnitId] || orgUnitId
}

function getUserName(userId: string): string {
  // Mock user names - in real app would query user service
  const userMap: Record<string, string> = {
    'user-VICC-ADM-001': 'Admin User',
    'user-VICC-HR-001': 'HR Manager',
    'user-VICC-IT-001': 'IT Manager', 
    'user-VICC-RD-001': 'R&D Staff',
    'user-VICC-RD-002': 'R&D Manager',
    'user-VICC-TECH-001': 'Technical Head',
    'user-VICC-EX-001': 'Executive Director'
  }
  return userMap[userId] || `User ${userId.slice(-3)}`
}