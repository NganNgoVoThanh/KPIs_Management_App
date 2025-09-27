import type { User, KpiDefinition, Approval, ApprovalStatus } from "./types"
import { mockUsers, mockApprovals } from "./mockdata"

// Define ApprovalWorkflow interface locally if not in types
interface ApprovalWorkflow {
  kpiId: string
  currentLevel: 1 | 2 | 3 | null
  level1?: Approval
  level2?: Approval
  level3?: Approval
  isComplete: boolean
  finalStatus: "APPROVED" | "REJECTED" | "PENDING"
}

export const getApprovalWorkflow = (kpiId: string): ApprovalWorkflow => {
  const approvals = mockApprovals.filter((a: any) => a.kpiDefinitionId === kpiId)

  const level1 = approvals.find((a: any) => a.level === 1)
  const level2 = approvals.find((a: any) => a.level === 2)
  const level3 = approvals.find((a: any) => a.level === 3)

  let currentLevel: 1 | 2 | 3 | null = null
  let finalStatus: "APPROVED" | "REJECTED" | "PENDING" = "PENDING"
  let isComplete = false

  // Determine current level and status
  if (!level1 || level1.status === "PENDING") {
    currentLevel = 1
  } else if (level1.status === "REJECTED") {
    finalStatus = "REJECTED"
    isComplete = true
  } else if (level1.status === "APPROVED") {
    if (!level2 || level2.status === "PENDING") {
      currentLevel = 2
    } else if (level2.status === "REJECTED") {
      finalStatus = "REJECTED"
      isComplete = true
    } else if (level2.status === "APPROVED") {
      if (!level3 || level3.status === "PENDING") {
        currentLevel = 3
      } else if (level3.status === "REJECTED") {
        finalStatus = "REJECTED"
        isComplete = true
      } else if (level3.status === "APPROVED") {
        finalStatus = "APPROVED"
        isComplete = true
      }
    }
  }

  return {
    kpiId,
    currentLevel,
    level1,
    level2,
    level3,
    isComplete,
    finalStatus,
  }
}

export const getNextApprover = (userId: string, level: 1 | 2 | 3): User | null => {
  const user = mockUsers.find((u: any) => u.id === userId)
  if (!user) return null

  switch (level) {
    case 1:
      // Line Manager approval
      return user.managerId ? mockUsers.find((u: any) => u.id === user.managerId) || null : null
    case 2:
      // Head of Department approval
      const lineManager = user.managerId ? mockUsers.find((u: any) => u.id === user.managerId) : null
      return lineManager?.managerId ? mockUsers.find((u: any) => u.id === lineManager.managerId) || null : null
    case 3:
      // BOD approval
      return mockUsers.find((u: any) => u.role === "BOD") || null
    default:
      return null
  }
}

export const canUserApprove = (userId: string, kpi: KpiDefinition, level: 1 | 2 | 3): boolean => {
  const approver = getNextApprover(kpi.userId, level)
  return approver?.id === userId
}

export const getApprovalStatusFromWorkflow = (workflow: ApprovalWorkflow): ApprovalStatus => {
  if (workflow.isComplete) {
    return workflow.finalStatus === "APPROVED" ? "APPROVED" : "REJECTED"
  }

  switch (workflow.currentLevel) {
    case 1:
      return "PENDING"
    case 2:
      return "PENDING"
    case 3:
      return "PENDING"
    default:
      return "PENDING"
  }
}

export const getPendingApprovalsForUser = (userId: string): KpiDefinition[] => {
  const user = mockUsers.find((u: any) => u.id === userId)
  if (!user) return []

  // Mock KPI definitions that need approval with proper types
  const mockKpiDefinitions: KpiDefinition[] = [
    {
      id: "1",
      cycleId: "1",
      userId: "3",
      orgUnitId: "org-rd",
      title: "Reduce Internal NCR Cases",
      type: "QUANT_LOWER_BETTER",
      unit: "cases",
      target: 12,
      weight: 25,
      dataSource: "eQMS",
      ownerId: "3",
      status: "PENDING_LM",
      createdAt: new Date("2025-01-15").toISOString(),
      submittedAt: new Date("2025-01-15").toISOString(),
    },
    {
      id: "2",
      cycleId: "1",
      userId: "3",
      orgUnitId: "org-rd",
      title: "New Product Development",
      type: "MILESTONE",
      unit: "milestones",
      target: 5,
      weight: 30,
      dataSource: "Project Management System",
      ownerId: "3",
      status: "PENDING_HOD",
      createdAt: new Date("2025-01-15").toISOString(),
      submittedAt: new Date("2025-01-14").toISOString(),
    },
    {
      id: "5",
      cycleId: "1",
      userId: "4",
      orgUnitId: "org-production",
      title: "Team Performance Improvement",
      type: "QUANT_HIGHER_BETTER",
      unit: "percentage",
      target: 20,
      weight: 35,
      dataSource: "HR System",
      ownerId: "4",
      status: "PENDING_BOD",
      createdAt: new Date("2025-01-13").toISOString(),
      submittedAt: new Date("2025-01-13").toISOString(),
    },
  ]

  return mockKpiDefinitions.filter((kpi: any) => {
    const workflow = getApprovalWorkflow(kpi.id)
    if (workflow.isComplete) return false

    const requiredApprover = getNextApprover(kpi.userId, workflow.currentLevel!)
    return requiredApprover?.id === userId
  })
}

export const getApprovalHistory = (kpiId: string): Approval[] => {
  return mockApprovals.filter((a: any) => a.kpiDefinitionId === kpiId).sort((a: any, b: any) => a.level - b.level)
}

export const formatApprovalLevel = (level: 1 | 2 | 3): string => {
  switch (level) {
    case 1:
      return "Level 1 - Line Manager"
    case 2:
      return "Level 2 - Head of Department"
    case 3:
      return "Level 3 - Board of Directors"
    default:
      return "Unknown Level"
  }
}