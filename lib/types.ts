// lib/types.ts

// User and Auth Types
export type UserRole = "HR" | "ADMIN" | "STAFF" | "LINE_MANAGER" | "HEAD_OF_DEPT" | "BOD"
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
  | "QUANT_HIGHER_BETTER" 
  | "QUANT_LOWER_BETTER" 
  | "MILESTONE" 
  | "BOOLEAN" 
  | "BEHAVIOR"

export type KpiStatus = 
  | "DRAFT" 
  | "SUBMITTED" 
  | "PENDING_LM" 
  | "PENDING_HOD" 
  | "PENDING_BOD" 
  | "APPROVED" 
  | "REJECTED" 
  | "LOCKED_GOALS"

export interface KpiDefinition {
  id: string
  cycleId: string
  userId: string
  orgUnitId: string
  title: string
  description?: string
  type: KpiType
  unit: string
  target: number
  formula?: string
  weight: number
  dataSource?: string
  ownerId: string
  contributors?: string[]
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
  approvedByLevel3?: string
  approvedAtLevel3?: string
  rejectedBy?: string
  rejectedAt?: string
  rejectionReason?: string
  [key: string]: any
}

// KPI Template Types
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

export interface KpiTemplate {
  id: string
  name: string
  department: string
  description?: string
  kpiFields: KpiTemplateField[]
  defaultWeights?: Record<string, number>
  createdBy: string
  createdAt: Date | string
  updatedAt?: Date | string
  isActive?: boolean
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
  settings?: {
    allowLateSubmission?: boolean
    requireEvidence?: boolean
    minKpisPerUser?: number
    maxKpisPerUser?: number
    totalWeightMustEqual?: number
  }
}

// Actual/Evaluation Types
export type ActualStatus = 
  | "DRAFT" 
  | "SUBMITTED" 
  | "PENDING_REVIEW" 
  | "APPROVED" 
  | "REJECTED"

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
}

// Approval Types
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"
export type ApprovalEntityType = "KPI" | "ACTUAL" | "CHANGE_REQUEST"

export interface Approval {
  id: string
  entityId: string
  entityType: ApprovalEntityType
  level: 1 | 2 | 3
  approverId: string
  status: ApprovalStatus
  comment?: string
  createdAt: string
  decidedAt?: string
  delegatedTo?: string
  delegatedAt?: string
}

// Change Request Types
export type ChangeRequestStatus = 
  | "DRAFT" 
  | "SUBMITTED" 
  | "APPROVED" 
  | "REJECTED" 
  | "CANCELLED"

export interface ChangeRequest {
  id: string
  kpiDefinitionId: string
  requesterId: string
  reason: string
  changes: {
    field: string
    oldValue: any
    newValue: any
  }[]
  status: ChangeRequestStatus
  createdAt: string
  updatedAt?: string
  approvedAt?: string
  approvedBy?: string
  rejectedAt?: string
  rejectedBy?: string
  rejectionReason?: string
}

// Evidence/File Types
export interface Evidence {
  id: string
  actualId: string
  fileName: string
  fileSize: number
  fileType: string
  storageUrl?: string
  base64Data?: string
  uploadedBy: string
  uploadedAt: Date | string
  description?: string
  checksum?: string
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

// Performance Evaluation Types
export interface PerformanceEvaluation {
  id: string
  cycleId: string
  userId: string
  overallScore: number
  overallPercentage: number
  overallBand: string
  kpiScores: {
    kpiId: string
    score: number
    percentage: number
    weight: number
    weightedScore: number
  }[]
  managerComment?: string
  hodComment?: string
  bodComment?: string
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
  userId: string
  entityType: string
  entityId: string
  action: string
  beforeValue?: any
  afterValue?: any
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp: string
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

// Helper Types
export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type ValueOf<T> = T[keyof T]

// Report Filter Types
export interface ReportFilter {
  cycleId?: string
  department?: string
  userId?: string
  orgUnitId?: string
  dateRange?: {
    start: string
    end: string
  }
  status?: string
  performanceLevel?: 'HIGH' | 'MEDIUM' | 'LOW'
}
// AI-specific interfaces
export interface AIValidationResult {
  score: number;
  level: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  feedback: string;
  improvements: string[];
  validatedAt: string;
}

export interface AIKpiSuggestion {
  id: string;
  title: string;
  description: string;
  type: KpiType;
  suggestedTarget: number;
  unit: string;
  weight: number;
  category: 'Business Objective' | 'Individual Development' | 'Core Values';
  confidenceScore: number;
  smartScore: number;
  riskFactors: string[];
  ogsmAlignment: string;
  dataSource: string;
  rationale: string;
}

export interface AIAnomalyResult {
  id: string;
  kpiId: string;
  anomalyType: 'statistical' | 'behavioral' | 'evidence' | 'pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  confidence: number;
  description: string;
  recommendations: string[];
  autoActions: string[];
  needsHumanReview: boolean;
  detectedAt: string;
}

export interface AIApprovalRecommendation {
  decision: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT';
  confidence: number;
  reasoning: {
    primaryFactors: string[];
    positiveAspects: string[];
    concerningAspects: string[];
    riskAssessment: string;
  };
  suggestedComments: {
    professional: string;
    constructive: string;
    developmental: string;
  };
  timeEstimate: number;
  generatedAt: string;
}

// Enhanced KPI with AI metadata
export interface EnhancedKpiDefinition extends KpiDefinition {
  aiEnhancements?: {
    smartScore: number;
    smartFeedback: string[];
    riskFactors: string[];
    suggestedImprovements: string[];
    validatedAt: string;
  };
}
// Enhanced anomaly detection type
export interface EnhancedAnomalyDetection {
  id: string;
  kpiId: string;
  userId: string;
  anomalyType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  confidence: number;
  needsHumanReview: boolean;
  autoActions: string[];
  suggestedActions: string[];
  description: string;
  behaviorPattern: {
    submissionTime: string;
    editCount: number;
    timeSpent: number;
    deviceInfo: string;
  };
  statisticalAnalysis: {
    zScore: number;
    percentile: number;
    trend: 'improving' | 'stable' | 'declining';
  };
}
// Add this to lib/types.ts - Replace the existing Approval interface

export interface Approval {
  id: string
  kpiDefinitionId: string  // ✅ Added this field
  entityId: string
  entityType: ApprovalEntityType
  level: 1 | 2 | 3
  approverId: string
  status: ApprovalStatus
  comment?: string
  createdAt: string
  decidedAt?: string
  delegatedTo?: string
  delegatedAt?: string
}

// Also add ApprovalWorkflow interface to types.ts
export interface ApprovalWorkflow {
  kpiId: string
  currentLevel: 1 | 2 | 3 | null
  level1?: Approval
  level2?: Approval
  level3?: Approval
  isComplete: boolean
  finalStatus: "APPROVED" | "REJECTED" | "PENDING"
}