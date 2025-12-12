// lib/approval-utils.ts - Utility functions for approval workflows
import type { Approval, ApprovalWorkflow } from './types'

/**
 * Get approval workflow for a KPI
 * Mock implementation - replace with real DB query
 */
export function getApprovalWorkflow(kpiId: string): ApprovalWorkflow {
  // TODO: Replace with real DB query
  // const approvals = await db.getApprovals({ entityId: kpiId, entityType: 'KPI' })
  
  const mockApprovals: Approval[] = []
  
  const level1 = mockApprovals.find(a => a.level === 1)
  const level2 = mockApprovals.find(a => a.level === 2)
  
  let currentLevel: 1 | 2 | null = null
  let finalStatus: "APPROVED" | "REJECTED" | "PENDING" = "PENDING"
  
  if (level1?.status === "PENDING") {
    currentLevel = 1
  } else if (level1?.status === "APPROVED" && level2?.status === "PENDING") {
    currentLevel = 2
  } else if (level2?.status === "APPROVED") {
    currentLevel = null
    finalStatus = "APPROVED"
  } else if (level1?.status === "REJECTED" || level2?.status === "REJECTED") {
    currentLevel = null
    finalStatus = "REJECTED"
  }
  
  return {
    kpiId,
    currentLevel,
    level1,
    level2,
    isComplete: currentLevel === null,
    finalStatus
  }
}

/**
 * Get approval history for a KPI
 * Returns all approvals sorted by level
 */
export function getApprovalHistory(kpiId: string): Approval[] {
  // TODO: Replace with real DB query
  // return await db.getApprovals({ entityId: kpiId, entityType: 'KPI' })
  return []
}

/**
 * Format approval level to readable string
 */
export function formatApprovalLevel(level: 1 | 2): string {
  switch (level) {
    case 1:
      return "Level 1: Line Manager (N+1)"
    case 2:
      return "Level 2: Manager (N+2)"
    default:
      return `Level ${level}`
  }
}

/**
 * Get approval status badge variant
 */
export function getApprovalStatusVariant(status: string): "default" | "destructive" | "secondary" {
  switch (status) {
    case "APPROVED":
      return "default"
    case "REJECTED":
      return "destructive"
    default:
      return "secondary"
  }
}