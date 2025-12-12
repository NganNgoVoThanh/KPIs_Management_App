// lib/types.ts - FIXED: 4 roles, 2-level approval only

// User and Auth Types
export type UserRole = "ADMIN" | "STAFF" | "LINE_MANAGER" | "MANAGER"
export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  orgUnitId: string
  department?: string
  employeeId?: string
  managerId?: string
  status: UserStatus
  locale?: string
  createdAt?: string
  updatedAt?: string
  lastLoginAt?: string
  [key: string]: any
}

// Organization Types
export type OrgUnitType = "COMPANY" | "DEPARTMENT" | "TEAM" | "GROUP"

export interface OrgUnit {
  id: string
  name: string
  parentId: string | null
  type: OrgUnitType
  managerId?: string
  createdAt?: string
  updatedAt?: string
}

// KPI Types
export type KpiType =
  | "QUANT_HIGHER_BETTER"  // Type I
  | "QUANT_LOWER_BETTER"   // Type II
  | "BOOLEAN"               // Type III
  | "MILESTONE"             // Type IV

export type KpiStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "PENDING_LM"
  | "PENDING_MANAGER"
  | "APPROVED"
  | "REJECTED"
  | "LOCKED_GOALS"
  | "CHANGE_REQUESTED"
  | "ARCHIVED"

export interface KpiDefinition {
  id: string
  cycleId: string
  userId: string
  orgUnitId: string
  title: string
  description?: string | null
  type: KpiType
  unit: string
  target: number
  formula?: string | null
  weight: number
  dataSource?: string | null
  ownerId: string
  contributors?: string[]
  adminNote?: string
  status: KpiStatus
  createdFromTemplateId?: string
  createdAt: string
  updatedAt?: string
  submittedAt?: string
  approvedAt?: string
  lockedAt?: string
  approvedByLevel1?: string
  approvedAtLevel1?: string
  approvedByLevel2?: string
  approvedAtLevel2?: string
  rejectedBy?: string
  rejectedAt?: string
  rejectionReason?: string
  changeRequestedBy?: string
  changeRequestedAt?: string
  changeRequestReason?: string
  [key: string]: any
}

// KPI Template Types - Enhanced for unified system
export interface KpiTemplateField {
  id: string
  title: string
  type: KpiType
  unit: string
  description?: string
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

export type TemplateSource = 'MANUAL' | 'EXCEL_UPLOAD' | 'CLONED' | 'IMPORTED'
export type TemplateStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ARCHIVED'

export interface KpiTemplate {
  id: string

  // Basic information
  name: string
  description?: string
  department: string
  jobTitle?: string
  category?: string

  // KPI Details
  kpiType: string // QUANTITATIVE, QUALITATIVE
  unit?: string
  formula?: string
  dataSource?: string
  targetValue?: number
  weight?: number

  // Template structure (deprecated, kept for migration)
  kpiFields?: KpiTemplateField[]
  defaultWeights?: Record<string, number>

  // Metadata
  tags?: string[]
  ogsmAlignment?: string
  frequency?: string
  priority?: string

  // Source tracking
  source: TemplateSource
  uploadId?: string
  clonedFromId?: string

  // Approval workflow
  status: TemplateStatus
  submittedBy?: string
  submittedAt?: string
  reviewedBy?: string
  reviewedAt?: string
  reviewComment?: string
  rejectionReason?: string

  // Usage statistics
  usageCount: number
  lastUsedAt?: string

  // Versioning
  version: number
  isActive: boolean

  // Timestamps
  createdBy: string
  createdAt: Date | string
  updatedAt?: Date | string
}

// Cycle Types
export type CycleType = "YEARLY" | "SEMI_ANNUAL" | "QUARTERLY" | "MONTHLY"
export type CycleStatus = "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED"

export interface Cycle {
  id: string
  name: string
  type: CycleType
  periodStart: string
  periodEnd: string
  status: CycleStatus
  createdBy: string
  createdAt: string
  updatedAt?: string
  openedAt?: string
  closedAt?: string
  notificationSentAt?: string
  targetUsers?: string[]
  settings?: {
    allowLateSubmission?: boolean
    requireEvidence?: boolean
    minKpisPerUser?: number
    maxKpisPerUser?: number
    totalWeightMustEqual?: number
    autoNotifyUsers?: boolean
  }
}

// Actual/Evaluation Types
export type ActualStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "PENDING_LM"
  | "PENDING_MANAGER"
  | "APPROVED"
  | "REJECTED"
  | "LOCKED_ACTUALS"
  | "ARCHIVED"

export interface KpiActual {
  id: string
  kpiDefinitionId: string
  actualValue: number
  percentage: number
  score: number
  selfComment?: string
  status: ActualStatus
  submittedAt?: string
  createdAt: string
  updatedAt?: string
  approvedAt?: string
  approvedBy?: string
  rejectedAt?: string
  rejectedBy?: string
  rejectionReason?: string
  evidenceFiles?: Evidence[]
  lastModifiedAt?: Date | string
  adminNote?: string
  userId?: string
}

// Approval Types
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"
export type ApprovalEntityType = "KPI" | "ACTUAL" | "CHANGE_REQUEST"
export type ApprovalLevel = 1 | 2

export interface Approval {
  id: string
  kpiDefinitionId?: string
  actualId?: string
  entityId: string
  entityType: ApprovalEntityType
  level: ApprovalLevel
  approverId: string
  status: ApprovalStatus
  comment?: string
  createdAt: string
  decidedAt?: string
  delegatedTo?: string
  delegatedAt?: string
  reassignedBy?: string
  reassignedAt?: string
  reassignReason?: string
}

export interface ApprovalWorkflow {
  kpiId: string
  currentLevel: 1 | 2 | null
  level1?: Approval
  level2?: Approval
  isComplete: boolean
  finalStatus: "APPROVED" | "REJECTED" | "PENDING"
}

// Change Request Types
export interface ChangeRequest {
  id: string
  kpiDefinitionId: string
  requesterId: string
  requesterType: "USER" | "ADMIN"
  changeType: "TARGET" | "WEIGHT" | "DESCRIPTION" | "FORMULA" | "ALL"
  currentValues: Record<string, any>
  proposedValues: Record<string, any>
  reason: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  createdAt: string
  resolvedAt?: string
  resolvedBy?: string
  resolutionComment?: string
  requiresApproval: boolean
  approvalWorkflow?: {
    level1?: { approverId: string; status: ApprovalStatus; decidedAt?: string }
    level2?: { approverId: string; status: ApprovalStatus; decidedAt?: string }
  }
}

// Evidence/File Types
export interface Evidence {
  id: string
  actualId: string
  fileName: string
  fileSize: number
  fileType: string
  storageUrl?: string
  checksum?: string
  uploadedBy: string
  uploadedAt: Date
  description?: string
  virusScanStatus?: "PENDING" | "CLEAN" | "INFECTED"
  virusScanAt?: Date
}

// Notification Types
export type NotificationType = 
  | "KPI_CREATED"
  | "KPI_SUBMITTED"
  | "KPI_APPROVED"
  | "KPI_REJECTED"
  | "APPROVAL_REQUIRED"
  | "ACTUAL_SUBMITTED"
  | "ACTUAL_APPROVED"
  | "ACTUAL_REJECTED"
  | "ACTUAL_APPROVAL_REQUIRED"
  | "CYCLE_OPENED"
  | "CYCLE_CLOSING_SOON"
  | "CYCLE_CLOSED"
  | "CHANGE_REQUEST"
  | "REMINDER"
  | "SYSTEM"

export type NotificationPriority = "LOW" | "MEDIUM" | "HIGH"
export type NotificationStatus = "UNREAD" | "READ" | "ARCHIVED"

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  priority: NotificationPriority
  status: NotificationStatus
  actionRequired?: boolean
  actionUrl?: string
  metadata?: Record<string, any>
  createdAt: string
  readAt?: string
  archivedAt?: string
}

// Approval Hierarchy
export interface ApprovalHierarchy {
  userId: string
  level1ApproverId?: string
  level2ApproverId?: string
  effectiveFrom: string
  effectiveTo?: string
  createdBy: string
  createdAt: string
  isActive: boolean
}

// Performance Evaluation Types
export interface ScoreBand {
  score: number
  minPercentage: number
  maxPercentage?: number
  label: string
  color: string
  description: string
}

export interface PerformanceEvaluation {
  id: string
  cycleId: string
  userId: string
  overallScore: number
  overallPercentage: number
  overallBand: string
  totalWeight?: number
  kpiScores: {
    kpiId: string
    score: number
    percentage: number
    weight: number
    weightedScore: number
  }[]
  kpiActuals?: KpiActual[]
  managerComment?: string
  status: "DRAFT" | "FINALIZED" | "CALIBRATED"
  createdAt: string
  finalizedAt?: string
  calibratedAt?: string
}

// Calibration Types
export interface Calibration {
  id: string
  cycleId: string
  orgUnitId: string
  originalScores: {
    userId: string
    score: number
  }[]
  calibratedScores: {
    userId: string
    originalScore: number
    calibratedScore: number
    adjustment: number
  }[]
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED"
  performedBy: string
  note?: string
  createdAt: string
  completedAt?: string
}

// Audit Log Types
export interface AuditLog {
  id: string
  actorId: string
  actorName: string
  actorRole: UserRole
  entityType: "USER" | "KPI" | "CYCLE" | "TEMPLATE" | "APPROVAL" | "CHANGE_REQUEST"
  entityId: string
  action: string
  beforeData?: Record<string, any>
  afterData?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

// Dashboard & Analytics Types
export interface DashboardStats {
  totalKpis: number
  completedKpis: number
  pendingApprovals: number
  averageScore: number
  cycleProgress: number
  notifications: number
}

export interface KpiAnalytics {
  kpiId: string
  kpiTitle: string
  trend: "UP" | "DOWN" | "STABLE"
  monthlyProgress: {
    month: string
    actual: number
    target: number
    percentage: number
  }[]
  yearToDate: {
    actual: number
    target: number
    percentage: number
  }
  projectedYearEnd: {
    value: number
    confidence: number
  }
}

// Report Types
export interface Report {
  id: string
  name: string
  type: "INDIVIDUAL" | "DEPARTMENT" | "COMPANY"
  cycleId: string
  filters?: Record<string, any>
  data: any
  generatedBy: string
  generatedAt: string
  format: "PDF" | "EXCEL" | "CSV"
  fileUrl?: string
}

export interface ReportFilter {
  cycleId?: string
  department?: string
  userId?: string
  orgUnitId?: string
  dateRange?: {
    start: string
    end: string
  }
  status?: KpiStatus
  dateFrom?: string
  dateTo?: string
  performanceLevel?: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface ReportData {
  summary: {
    totalKpis: number
    completedKpis: number
    averageScore: number
    participationRate: number
  }
  departmentBreakdown: {
    name: string
    totalKpis: number
    completedKpis: number
    avgScore: number
    participationRate: number
  }[]
  topPerformers: {
    userId: string
    userName: string
    department: string
    avgScore: number
    completedKpis: number
  }[]
  improvements: {
    area: string
    currentScore: number
    targetScore: number
    gap: number
    priority: "HIGH" | "MEDIUM" | "LOW"
  }[]
}

// Settings/Configuration Types
export interface SystemSettings {
  companyName: string
  companyDomain: string
  locale: string
  timezone: string
  cycleFrequency: CycleType[]
  approvalLevels: number
  totalWeightMustEqual: number
  scoreScale: number[]
  scoreBands: Record<string, number>
  maxOverachieveCap: number
  sla: {
    submitGoalsDays: number
    approveEachLevelDays: number
    submitActualDays: number
    approveActualEachLevelDays: number
  }
  changeRequestRequiresApproval: boolean
  attachmentMaxSizeMB: number
  authMethod: string[]
  deployTarget: string[]
}

// AI-specific interfaces
export interface AIValidationResult {
  score: number
  level: 'Poor' | 'Fair' | 'Good' | 'Excellent'
  feedback: string
  improvements: string[]
  validatedAt: string
}

export interface AIKpiSuggestion {
  id: string
  title: string
  description: string
  type: KpiType
  suggestedTarget: number
  unit: string
  weight: number
  category: 'Business Objective' | 'Individual Development' | 'Core Values'
  confidenceScore: number
  smartScore: number
  riskFactors: string[]
  ogsmAlignment: string
  dataSource: string
  rationale: string
}

export interface AIAnomalyResult {
  id: string
  kpiId: string
  anomalyType: 'statistical' | 'behavioral' | 'evidence' | 'pattern'
  severity: 'low' | 'medium' | 'high' | 'critical'
  riskScore: number
  confidence: number
  description: string
  recommendations: string[]
  autoActions: string[]
  needsHumanReview: boolean
  detectedAt: string
}

export interface AIApprovalRecommendation {
  decision: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT'
  confidence: number
  reasoning: {
    primaryFactors: string[]
    positiveAspects: string[]
    concerningAspects: string[]
    riskAssessment: string
  }
  suggestedComments: {
    professional: string
    constructive: string
    developmental: string
  }
  timeEstimate: number
  generatedAt: string
}

export interface EnhancedKpiDefinition extends KpiDefinition {
  aiEnhancements?: {
    smartScore: number
    smartFeedback: string[]
    riskFactors: string[]
    suggestedImprovements: string[]
    validatedAt: string
  }
}

export interface EnhancedAnomalyDetection {
  id: string
  kpiId: string
  userId: string
  anomalyType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  riskScore: number
  confidence: number
  needsHumanReview: boolean
  autoActions: string[]
  suggestedActions: string[]
  description: string
  behaviorPattern: {
    submissionTime: string
    editCount: number
    timeSpent: number
    deviceInfo: string
  }
  statisticalAnalysis: {
    zScore: number
    percentile: number
    trend: 'improving' | 'stable' | 'declining'
  }
}

// Admin-specific Types
export interface AdminNotificationConfig {
  cycleId: string
  templateId?: string
  targetRoles?: UserRole[]
  targetDepartments?: string[]
  targetUsers?: string[]
  subject: string
  message: string
  includeKpiTemplate: boolean
  dueDate?: string
  scheduledSendAt?: string
}

export interface CompanyDocument {
  id: string
  title: string
  type: "OGSM" | "STRATEGIC_PLAN" | "POLICY" | "GUIDELINE" | "TEMPLATE" | "OTHER"
  fileName: string
  fileSize: number
  fileType: string
  storageUrl: string
  department?: string
  uploadedBy: string
  uploadedAt: string
  tags?: string[]
  description?: string
  isPublic: boolean
  aiIndexed: boolean
  aiIndexedAt?: string
}

export interface HistoricalKpiData {
  userId: string
  year: number
  quarter?: number
  kpis: {
    title: string
    type: KpiType
    target: number
    actual: number
    score: number
    weight: number
  }[]
  totalScore: number
  performanceRating: string
}

// KPI Library Types - Templates (structured data)
export interface KpiLibraryEntry {
  id: string
  stt: number
  ogsmTarget: string
  department: string
  jobTitle: string
  kpiName: string
  kpiType: 'I' | 'II' | 'III' | 'IV'
  unit: string
  dataSource: string
  yearlyTarget?: number | string
  quarterlyTarget?: number | string
  createdAt: string
  updatedAt: string
  uploadedBy: string
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING_APPROVAL'
  version: number
  isTemplate: boolean
}

export interface KpiLibraryUpload {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  storageUrl?: string

  // Parsed data from Excel
  rawData: any[] // Original Excel data
  totalEntries: number
  validEntries: number
  invalidEntries: number
  parseErrors?: Array<{
    row: number
    error: string
  }>

  // Upload tracking
  uploadedBy: string
  uploadedAt: string

  // Approval workflow
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewedBy?: string
  reviewedAt?: string
  reviewComment?: string
  rejectionReason?: string

  // Processing
  processedAt?: string
  processedCount: number
}

export interface KpiLibraryChangeRequest {
  id: string
  requestType: 'ADD' | 'EDIT' | 'DELETE'
  requestedBy: string
  requestedAt: string
  department: string
  currentEntry?: KpiLibraryEntry
  proposedEntry: Partial<KpiLibraryEntry>
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewedBy?: string
  reviewedAt?: string
  reviewComment?: string
}

// KPI Library Types - Resources (documents/files/BI dashboards)
export type KpiResourceCategory =
  | 'TEMPLATE'
  | 'GUIDE'
  | 'REPORT'
  | 'EXAMPLE'
  | 'DASHBOARD'  // Added for BI dashboards
  | 'BI_REPORT'  // Added for BI reports
  | 'OTHER'

export type KpiResourceStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED'
export type KpiResourceApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type KpiResourceType = 'FILE' | 'BI_DASHBOARD' | 'LINK' | 'EMBEDDED'
export type BiDashboardType = 'POWER_BI' | 'FABRIC' | 'TABLEAU' | 'LOOKER' | 'CUSTOM'

export interface KpiResource {
  id: string
  title: string
  description?: string
  category: KpiResourceCategory
  department?: string
  tags?: string[]

  // Resource type
  resourceType: KpiResourceType

  // File information (for FILE type)
  fileName?: string
  fileType?: string  // pdf, xlsx, xls, docx, pptx, jpg, png, gif, csv, etc.
  fileSize?: number
  mimeType?: string
  storageProvider?: string  // M365, LOCAL, AZURE_BLOB, S3
  storageUrl?: string

  // Microsoft 365 specific (if using SharePoint/OneDrive)
  driveId?: string
  fileId?: string

  // BI Dashboard specific (for BI_DASHBOARD type)
  dashboardUrl?: string
  dashboardType?: BiDashboardType
  embedUrl?: string  // For iframe embedding
  workspaceId?: string  // Power BI/Fabric workspace ID
  reportId?: string     // Power BI/Fabric report ID
  datasetId?: string    // Power BI/Fabric dataset ID
  requiresAuth?: boolean
  authConfig?: {
    type: 'AZURE_AD' | 'SERVICE_PRINCIPAL' | 'API_KEY' | 'OAUTH'
    tenantId?: string
    clientId?: string
    scopes?: string[]
  }

  // External link (for LINK type)
  externalUrl?: string

  // Metadata
  uploadedBy: string
  uploadedAt: string
  updatedAt: string
  status: KpiResourceStatus
  isPublic: boolean
  isFeatured?: boolean
  downloadCount: number
  viewCount: number

  // Approval workflow
  approvalStatus: KpiResourceApprovalStatus
  approvedBy?: string
  approvedAt?: string
  rejectionReason?: string

  // Versioning & updates
  version?: number
  lastSyncedAt?: string  // For BI dashboards that sync data
}

export interface KpiResourceUploadRequest {
  title: string
  description?: string
  category: KpiResourceCategory
  department?: string
  tags?: string[]
  resourceType: KpiResourceType

  // For FILE type
  file?: File

  // For BI_DASHBOARD type
  dashboardUrl?: string
  dashboardType?: BiDashboardType
  embedUrl?: string
  workspaceId?: string
  reportId?: string
  datasetId?: string
  requiresAuth?: boolean
  authConfig?: {
    type: 'AZURE_AD' | 'SERVICE_PRINCIPAL' | 'API_KEY' | 'OAUTH'
    tenantId?: string
    clientId?: string
    scopes?: string[]
  }

  // For LINK type
  externalUrl?: string

  isPublic?: boolean
  isFeatured?: boolean
}

// Admin Proxy Types
export type ProxyActionType = 
  | 'RETURN_TO_STAFF' 
  | 'APPROVE_AS_MANAGER' 
  | 'REJECT_AS_MANAGER' 
  | 'REASSIGN_APPROVER'

export interface ProxyAction {
  id: string
  actionType: ProxyActionType
  performedBy: string
  performedAt: string
  targetUserId?: string
  entityType: 'KPI' | 'ACTUAL'
  entityId: string
  level?: number
  reason: string
  comment?: string
  previousApproverId?: string
  newApproverId?: string
  metadata?: Record<string, any>
}

// Helper Types
export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}
export type ValueOf<T> = T[keyof T]