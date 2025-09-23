// lib/seed-data.ts
import { storageService } from './storage-service'
import type { KpiTemplate, Cycle, OrgUnit } from './types'

// Tạo hàm UUID đơn giản thay thế cho v4
function generateUUID(): string {
  return 'xxxx-xxxx-4xxx-yxxx-xxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Initialize the system with default data
 */
export function seedInitialData(): void {
  console.log('🌱 Seeding initial data...')
  
  // Check if already seeded
  const existingTemplates = storageService.getTemplates()
  if (existingTemplates.length > 0) {
    console.log('✅ Data already seeded')
    return
  }

  // Seed organization units
  seedOrgUnits()
  
  // Seed KPI templates
  seedKpiTemplates()
  
  // Seed initial cycle
  seedInitialCycle()
  
  console.log('✅ Initial data seeded successfully')
}

/**
 * Seed organization units
 */
function seedOrgUnits(): void {
  const orgUnits: OrgUnit[] = [
    { id: 'org-vicc', name: 'Vietnam Intersnack Cashew Company', parentId: null, type: 'COMPANY' },
    { id: 'org-executive', name: 'Executive', parentId: 'org-vicc', type: 'DEPARTMENT' },
    { id: 'org-hr', name: 'Human Resources', parentId: 'org-vicc', type: 'DEPARTMENT' },
    { id: 'org-it', name: 'Information Technology', parentId: 'org-vicc', type: 'DEPARTMENT' },
    { id: 'org-production', name: 'Production', parentId: 'org-vicc', type: 'DEPARTMENT' },
    { id: 'org-quality', name: 'Quality Assurance', parentId: 'org-vicc', type: 'DEPARTMENT' },
    { id: 'org-rnd', name: 'Research & Development', parentId: 'org-vicc', type: 'DEPARTMENT' },
    { id: 'org-sales', name: 'Sales', parentId: 'org-vicc', type: 'DEPARTMENT' },
    { id: 'org-marketing', name: 'Marketing', parentId: 'org-vicc', type: 'DEPARTMENT' },
    { id: 'org-finance', name: 'Finance', parentId: 'org-vicc', type: 'DEPARTMENT' },
    { id: 'org-supply-chain', name: 'Supply Chain', parentId: 'org-vicc', type: 'DEPARTMENT' }
  ]

  localStorage.setItem('vicc_kpi_org_units', JSON.stringify(orgUnits))
}

/**
 * Seed KPI templates
 */
function seedKpiTemplates(): void {
  const templates: KpiTemplate[] = [
    // R&D Template
    {
      id: `template-${generateUUID()}`,
      name: 'R&D Department KPI Template 2025',
      department: 'Research & Development',
      description: 'Standard KPIs for R&D team members focusing on innovation and quality',
      kpiFields: [
        {
          id: 'rnd-1',
          title: 'Reduce Internal NCR Cases',
          type: 'QUANT_LOWER_BETTER',
          unit: 'cases',
          description: 'Number of internal non-conformance reports',
          dataSource: 'eQMS System',
          targetRange: { min: 5, max: 15, recommended: 12 },
          weight: 25,
          isRequired: true,
          evidenceRequired: true
        },
        {
          id: 'rnd-2',
          title: 'New Product Development',
          type: 'MILESTONE',
          unit: 'milestones',
          description: 'Completion of product development milestones',
          dataSource: 'Project Management System',
          targetRange: { min: 3, max: 5, recommended: 4 },
          weight: 30,
          isRequired: true,
          evidenceRequired: true
        },
        {
          id: 'rnd-3',
          title: 'Process Improvement Projects',
          type: 'QUANT_HIGHER_BETTER',
          unit: 'projects',
          description: 'Number of process improvements implemented',
          dataSource: 'Innovation Portal',
          targetRange: { min: 2, max: 6, recommended: 3 },
          weight: 20,
          isRequired: true,
          evidenceRequired: true
        },
        {
          id: 'rnd-4',
          title: 'Technical Documentation Quality',
          type: 'QUANT_HIGHER_BETTER',
          unit: 'score',
          description: 'Quality score of technical documentation',
          dataSource: 'Document Review System',
          targetRange: { min: 80, max: 100, recommended: 90 },
          weight: 15,
          isRequired: false,
          evidenceRequired: false
        },
        {
          id: 'rnd-5',
          title: 'Innovation & Collaboration',
          type: 'BEHAVIOR',
          unit: 'rating',
          description: 'Innovation mindset and team collaboration',
          dataSource: '360 Feedback',
          targetRange: { min: 3, max: 5, recommended: 4 },
          weight: 10,
          isRequired: false,
          evidenceRequired: false
        }
      ],
      defaultWeights: { 'rnd-1': 25, 'rnd-2': 30, 'rnd-3': 20, 'rnd-4': 15, 'rnd-5': 10 },
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      isActive: true
    },

    // Sales Template
    {
      id: `template-${generateUUID()}`,
      name: 'Sales Department KPI Template 2025',
      department: 'Sales',
      description: 'Performance metrics for sales team members',
      kpiFields: [
        {
          id: 'sales-1',
          title: 'Revenue Target Achievement',
          type: 'QUANT_HIGHER_BETTER',
          unit: '%',
          description: 'Percentage of revenue target achieved',
          dataSource: 'CRM System',
          formula: '(Actual Revenue / Target Revenue) × 100',
          targetRange: { min: 85, max: 120, recommended: 100 },
          weight: 40,
          isRequired: true,
          evidenceRequired: true
        },
        {
          id: 'sales-2',
          title: 'New Customer Acquisition',
          type: 'QUANT_HIGHER_BETTER',
          unit: 'customers',
          description: 'Number of new customers acquired',
          dataSource: 'CRM System',
          targetRange: { min: 5, max: 20, recommended: 10 },
          weight: 25,
          isRequired: true,
          evidenceRequired: true
        },
        {
          id: 'sales-3',
          title: 'Customer Retention Rate',
          type: 'QUANT_HIGHER_BETTER',
          unit: '%',
          description: 'Percentage of customers retained',
          dataSource: 'CRM System',
          formula: '(Retained Customers / Total Customers) × 100',
          targetRange: { min: 80, max: 95, recommended: 90 },
          weight: 20,
          isRequired: true,
          evidenceRequired: false
        },
        {
          id: 'sales-4',
          title: 'Sales Pipeline Management',
          type: 'MILESTONE',
          unit: 'milestones',
          description: 'Key account management milestones',
          dataSource: 'CRM Pipeline',
          targetRange: { min: 4, max: 6, recommended: 5 },
          weight: 15,
          isRequired: false,
          evidenceRequired: false
        }
      ],
      defaultWeights: { 'sales-1': 40, 'sales-2': 25, 'sales-3': 20, 'sales-4': 15 },
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      isActive: true
    },

    // Quality Template
    {
      id: `template-${generateUUID()}`,
      name: 'Quality Department KPI Template 2025',
      department: 'Quality Assurance',
      description: 'Quality control and compliance KPIs',
      kpiFields: [
        {
          id: 'qa-1',
          title: 'Product Quality Score',
          type: 'QUANT_HIGHER_BETTER',
          unit: 'score',
          description: 'Average product quality score from audits',
          dataSource: 'Quality Management System',
          targetRange: { min: 90, max: 100, recommended: 95 },
          weight: 35,
          isRequired: true,
          evidenceRequired: true
        },
        {
          id: 'qa-2',
          title: 'Customer Complaint Resolution',
          type: 'QUANT_LOWER_BETTER',
          unit: 'days',
          description: 'Average days to resolve customer complaints',
          dataSource: 'Complaint Management System',
          targetRange: { min: 1, max: 5, recommended: 3 },
          weight: 30,
          isRequired: true,
          evidenceRequired: true
        },
        {
          id: 'qa-3',
          title: 'Audit Compliance Rate',
          type: 'QUANT_HIGHER_BETTER',
          unit: '%',
          description: 'Percentage of successful audit outcomes',
          dataSource: 'Audit System',
          formula: '(Passed Audits / Total Audits) × 100',
          targetRange: { min: 95, max: 100, recommended: 98 },
          weight: 25,
          isRequired: true,
          evidenceRequired: true
        },
        {
          id: 'qa-4',
          title: 'Quality Improvement Initiatives',
          type: 'BOOLEAN',
          unit: 'completed',
          description: 'Completion of annual quality improvement project',
          dataSource: 'Project Tracker',
          targetRange: { min: 0, max: 1, recommended: 1 },
          weight: 10,
          isRequired: false,
          evidenceRequired: false
        }
      ],
      defaultWeights: { 'qa-1': 35, 'qa-2': 30, 'qa-3': 25, 'qa-4': 10 },
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      isActive: true
    },

    // Production Template
    {
      id: `template-${generateUUID()}`,
      name: 'Production Department KPI Template 2025',
      department: 'Production',
      description: 'Manufacturing efficiency and output KPIs',
      kpiFields: [
        {
          id: 'prod-1',
          title: 'Production Output',
          type: 'QUANT_HIGHER_BETTER',
          unit: 'tons',
          description: 'Total production output',
          dataSource: 'Production System',
          targetRange: { min: 800, max: 1200, recommended: 1000 },
          weight: 35,
          isRequired: true,
          evidenceRequired: true
        },
        {
          id: 'prod-2',
          title: 'OEE (Overall Equipment Effectiveness)',
          type: 'QUANT_HIGHER_BETTER',
          unit: '%',
          description: 'Machine efficiency percentage',
          dataSource: 'OEE System',
          formula: 'Availability × Performance × Quality',
          targetRange: { min: 75, max: 90, recommended: 85 },
          weight: 30,
          isRequired: true,
          evidenceRequired: true
        },
        {
          id: 'prod-3',
          title: 'Waste Reduction',
          type: 'QUANT_LOWER_BETTER',
          unit: '%',
          description: 'Percentage of production waste',
          dataSource: 'Waste Management System',
          formula: '(Waste / Total Production) × 100',
          targetRange: { min: 1, max: 5, recommended: 3 },
          weight: 20,
          isRequired: true,
          evidenceRequired: true
        },
        {
          id: 'prod-4',
          title: 'Safety Incidents',
          type: 'QUANT_LOWER_BETTER',
          unit: 'incidents',
          description: 'Number of safety incidents',
          dataSource: 'HSE System',
          targetRange: { min: 0, max: 2, recommended: 0 },
          weight: 15,
          isRequired: true,
          evidenceRequired: true
        }
      ],
      defaultWeights: { 'prod-1': 35, 'prod-2': 30, 'prod-3': 20, 'prod-4': 15 },
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      isActive: true
    },

    // Marketing Template
    {
      id: `template-${generateUUID()}`,
      name: 'Marketing Department KPI Template 2025',
      department: 'Marketing',
      description: 'Brand awareness and marketing effectiveness KPIs',
      kpiFields: [
        {
          id: 'mkt-1',
          title: 'Lead Generation',
          type: 'QUANT_HIGHER_BETTER',
          unit: 'leads',
          description: 'Number of qualified leads generated',
          dataSource: 'Marketing Automation',
          targetRange: { min: 100, max: 300, recommended: 200 },
          weight: 30,
          isRequired: true,
          evidenceRequired: true
        },
        {
          id: 'mkt-2',
          title: 'Conversion Rate',
          type: 'QUANT_HIGHER_BETTER',
          unit: '%',
          description: 'Lead to customer conversion rate',
          dataSource: 'CRM System',
          formula: '(Converted Leads / Total Leads) × 100',
          targetRange: { min: 5, max: 15, recommended: 10 },
          weight: 25,
          isRequired: true,
          evidenceRequired: true
        },
        {
          id: 'mkt-3',
          title: 'Brand Awareness Score',
          type: 'QUANT_HIGHER_BETTER',
          unit: 'score',
          description: 'Brand recognition survey score',
          dataSource: 'Market Research',
          targetRange: { min: 60, max: 80, recommended: 70 },
          weight: 20,
          isRequired: true,
          evidenceRequired: false
        },
        {
          id: 'mkt-4',
          title: 'Campaign ROI',
          type: 'QUANT_HIGHER_BETTER',
          unit: '%',
          description: 'Return on marketing investment',
          dataSource: 'Marketing Analytics',
          formula: '((Revenue - Cost) / Cost) × 100',
          targetRange: { min: 150, max: 300, recommended: 200 },
          weight: 25,
          isRequired: true,
          evidenceRequired: true
        }
      ],
      defaultWeights: { 'mkt-1': 30, 'mkt-2': 25, 'mkt-3': 20, 'mkt-4': 25 },
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      isActive: true
    }
  ]

  templates.forEach(template => storageService.saveTemplate(template))
}

/**
 * Seed initial cycle
 */
function seedInitialCycle(): void {
  const currentYear = new Date().getFullYear()
  const cycle: Cycle = {
    id: `cycle-${generateUUID()}`,
    name: `FY ${currentYear} Performance Cycle`,
    type: 'YEARLY',
    periodStart: `${currentYear}-01-01`,
    periodEnd: `${currentYear}-12-31`,
    status: 'ACTIVE',
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    openedAt: new Date().toISOString(),
    settings: {
      allowLateSubmission: false,
      requireEvidence: true,
      minKpisPerUser: 3,
      maxKpisPerUser: 10,
      totalWeightMustEqual: 100
    }
  }

  storageService.saveCycle(cycle)
}

/**
 * Create sample KPIs for demo user
 */
export function createDemoKpis(userId: string, cycleId: string): void {
  const templates = storageService.getTemplates('Research & Development')
  if (templates.length === 0) return

  const template = templates[0]
  const kpis = template.kpiFields.slice(0, 4).map((field, index) => ({
    id: `kpi-demo-${generateUUID()}`,
    cycleId,
    userId,
    orgUnitId: 'org-rnd',
    title: field.title,
    description: field.description || '',
    type: field.type,
    unit: field.unit,
    target: field.targetRange?.recommended || 10,
    formula: field.formula,
    weight: index === 0 ? 40 : index === 1 ? 30 : index === 2 ? 20 : 10,
    dataSource: field.dataSource || '',
    ownerId: userId,
    contributors: [],
    status: index === 0 ? 'LOCKED_GOALS' : 'DRAFT' as any,
    createdFromTemplateId: template.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }))

  kpis.forEach(kpi => storageService.saveKpiDefinition(kpi))

  // Add sample actual for the first KPI
  if (kpis.length > 0) {
    storageService.saveKpiActual({
      id: `actual-demo-${generateUUID()}`,
      kpiDefinitionId: kpis[0].id,
      actualValue: 8,
      percentage: 133,
      score: 5,
      selfComment: 'Successfully reduced NCR cases through improved QA processes',
      status: 'APPROVED',
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    })
  }
}

/**
 * Reset all data (for testing)
 */
export function resetAllData(): void {
  if (confirm('⚠️ This will delete ALL data. Are you sure?')) {
    storageService.clearAllData()
    seedInitialData()
    console.log('✅ All data reset to initial state')
  }
}

/**
 * Check if system needs initialization
 */
export function checkAndInitialize(): void {
  const templates = storageService.getTemplates()
  const cycles = storageService.getCycles()
  
  if (templates.length === 0 || cycles.length === 0) {
    seedInitialData()
  }
}

// Auto-initialize on import if in browser
if (typeof window !== 'undefined') {
  // Check after a short delay to ensure localStorage is ready
  setTimeout(() => {
    checkAndInitialize()
  }, 100)
}