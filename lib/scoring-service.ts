// lib/scoring-service.ts - FIXED: Correct cascading logic for Type IV

export type KpiType = 'QUANT_HIGHER_BETTER' | 'QUANT_LOWER_BETTER' | 'MILESTONE' | 'BOOLEAN'

export interface ScoreResult {
  percentage: number
  score: number
  band: string
  explanation: string
}

export interface TypeIVScaleEntry {
  targetLevel: number | string
  description: string
  scoreLevel: number
}

export interface TypeIVScoringRules {
  direction: 'ASCENDING' | 'DESCENDING'
  scale: TypeIVScaleEntry[]
}

export const DEFAULT_SCORE_BANDS: Record<string, number> = {
  '>=120': 5,
  '100-119': 4,
  '80-99': 3,
  '60-79': 2,
  '<60': 1
}

export function detectScaleDirection(scale: TypeIVScaleEntry[]): 'ASCENDING' | 'DESCENDING' {
  if (scale.length < 2) return 'ASCENDING'
  
  const first = Number(scale[0].targetLevel)
  const second = Number(scale[1].targetLevel)
  
  return second > first ? 'ASCENDING' : 'DESCENDING'
}

export function calculateTypeI(
  actual: number,
  target: number,
  maxCap: number = 150
): ScoreResult {
  if (target <= 0) {
    return {
      percentage: 0,
      score: 0,
      band: 'Invalid',
      explanation: 'Target must be greater than 0'
    }
  }

  const percentage = Math.min((actual / target) * 100, maxCap)
  const score = getScoreFromPercentage(percentage)
  const band = getBandFromPercentage(percentage)

  return {
    percentage: Math.round(percentage * 10) / 10,
    score,
    band,
    explanation: `Achieved ${actual} out of ${target} target (${percentage.toFixed(1)}%)`
  }
}

export function calculateTypeII(
  actual: number,
  target: number,
  maxCap: number = 150
): ScoreResult {
  if (target <= 0) {
    return {
      percentage: 0,
      score: 0,
      band: 'Invalid',
      explanation: 'Target must be greater than 0'
    }
  }

  if (actual === 0) {
    return {
      percentage: maxCap,
      score: 5,
      band: 'Excellent',
      explanation: `Perfect achievement: ${actual} (target was ${target})`
    }
  }

  const percentage = Math.min((target / actual) * 100, maxCap)
  const score = getScoreFromPercentage(percentage)
  const band = getBandFromPercentage(percentage)

  return {
    percentage: Math.round(percentage * 10) / 10,
    score,
    band,
    explanation: `Achieved ${actual} vs ${target} target (${percentage.toFixed(1)}%)`
  }
}

export function calculateTypeIII(done: boolean): ScoreResult {
  const percentage = done ? 100 : 0
  const score = done ? 4 : 0
  const band = done ? 'Achieved' : 'Not Achieved'

  return {
    percentage,
    score,
    band,
    explanation: done ? 'Task completed' : 'Task not completed'
  }
}

/**
 * Type IV: Milestone with Custom Scale - CASCADING CONDITIONS
 * 
 * CRITICAL LOGIC: Find ALL thresholds that actual satisfies, then take HIGHEST score
 * 
 * ASCENDING Example (Customer Satisfaction %):
 * Scale: [80â†’10pts, 85â†’50pts, 90â†’80pts, 100â†’100pts]
 * If actual = 92%:
 *   - Satisfies: â‰¥80 (10pts), â‰¥85 (50pts), â‰¥90 (80pts)
 *   - Does NOT satisfy: â‰¥100
 *   - Result: Take MAX = 80 points
 * 
 * DESCENDING Example (Project Delay Days):
 * Scale: [30â†’10pts, 15â†’50pts, 5â†’80pts, 0â†’100pts]
 * If actual = 12 days:
 *   - Satisfies: â‰¤30 (10pts), â‰¤15 (50pts)
 *   - Does NOT satisfy: â‰¤5, â‰¤0
 *   - Result: Take MAX = 50 points
 */
export function calculateTypeIV(
  actual: number,
  scoringRules: TypeIVScoringRules
): ScoreResult {
  if (!scoringRules || !scoringRules.scale || scoringRules.scale.length < 2) {
    return {
      percentage: 0,
      score: 0,
      band: 'Invalid',
      explanation: 'Invalid scoring rules: minimum 2 scale entries required'
    }
  }

  const { direction, scale } = scoringRules

  let maxScore = 0
  let matchedEntry: TypeIVScaleEntry | null = null
  const matchedConditions: string[] = []

  if (direction === 'ASCENDING') {
    // ASCENDING: Check all conditions where actual >= threshold
    for (const entry of scale) {
      const threshold = Number(entry.targetLevel)
      
      if (actual >= threshold) {
        matchedConditions.push(`â‰¥${threshold} (${entry.scoreLevel}pts)`)
        
        if (entry.scoreLevel > maxScore) {
          maxScore = entry.scoreLevel
          matchedEntry = entry
        }
      }
    }
  } else {
    // DESCENDING: Check all conditions where actual <= threshold
    for (const entry of scale) {
      const threshold = Number(entry.targetLevel)
      
      if (actual <= threshold) {
        matchedConditions.push(`â‰¤${threshold} (${entry.scoreLevel}pts)`)
        
        if (entry.scoreLevel > maxScore) {
          maxScore = entry.scoreLevel
          matchedEntry = entry
        }
      }
    }
  }

  // If no conditions matched â†’ 0 points
  if (!matchedEntry) {
    const directionText = direction === 'ASCENDING' ? 'below minimum' : 'above maximum'
    return {
      percentage: 0,
      score: 0,
      band: 'Not Achieved',
      explanation: `Actual ${actual} is ${directionText} threshold â†’ 0 points`
    }
  }

  const percentage = maxScore
  const score = getScoreFromPercentage(percentage)
  const band = getBandFromPercentage(percentage)

  return {
    percentage: Math.round(percentage * 10) / 10,
    score,
    band,
    explanation: `Matched: ${matchedConditions.join(', ')} â†’ Best: ${maxScore} points`
  }
}

export function getScoreFromPercentage(percentage: number): number {
  if (percentage >= 120) return 5
  if (percentage >= 100) return 4
  if (percentage >= 80) return 3
  if (percentage >= 60) return 2
  if (percentage < 60) return 1
  return 0
}

export function getBandFromPercentage(percentage: number): string {
  if (percentage >= 120) return 'Outstanding'
  if (percentage >= 100) return 'Excellent'
  if (percentage >= 80) return 'Good'
  if (percentage >= 60) return 'Fair'
  return 'Needs Improvement'
}

export function validateTypeIVScale(scale: TypeIVScaleEntry[]): { valid: boolean; message: string } {
  if (scale.length < 2) {
    return { valid: false, message: 'Scale must have at least 2 entries' }
  }

  if (scale.length > 5) {
    return { valid: false, message: 'Scale cannot have more than 5 entries' }
  }

  for (const entry of scale) {
    if (entry.scoreLevel < 0 || entry.scoreLevel > 100) {
      return {
        valid: false,
        message: `Score levels must be between 0-100 (found: ${entry.scoreLevel})`
      }
    }
  }

  const direction = detectScaleDirection(scale)

  for (let i = 1; i < scale.length; i++) {
    const prevTarget = Number(scale[i - 1].targetLevel)
    const currTarget = Number(scale[i].targetLevel)
    const prevScore = scale[i - 1].scoreLevel
    const currScore = scale[i].scoreLevel

    if (currScore <= prevScore) {
      return {
        valid: false,
        message: `Score levels must strictly increase: ${prevScore} â†’ ${currScore}`
      }
    }

    if (direction === 'ASCENDING') {
      if (currTarget <= prevTarget) {
        return {
          valid: false,
          message: `Ascending scale: Targets must increase (${prevTarget} â†’ ${currTarget})`
        }
      }
    } else {
      if (currTarget >= prevTarget) {
        return {
          valid: false,
          message: `Descending scale: Targets must decrease (${prevTarget} â†’ ${currTarget})`
        }
      }
    }
  }

  return { valid: true, message: `Valid ${direction.toLowerCase()} scale` }
}

export function autoPopulateTypeIVScale(direction: 'ASCENDING' | 'DESCENDING'): TypeIVScaleEntry[] {
  if (direction === 'ASCENDING') {
    return [
      { targetLevel: 80, description: 'Below expectations', scoreLevel: 10 },
      { targetLevel: 85, description: 'Approaching expectations', scoreLevel: 50 },
      { targetLevel: 90, description: 'Meets expectations', scoreLevel: 80 },
      { targetLevel: 100, description: 'Exceeds expectations', scoreLevel: 100 }
    ]
  } else {
    return [
      { targetLevel: 30, description: 'High risk', scoreLevel: 10 },
      { targetLevel: 15, description: 'Moderate risk', scoreLevel: 50 },
      { targetLevel: 5, description: 'Low risk', scoreLevel: 80 },
      { targetLevel: 0, description: 'No issues', scoreLevel: 100 }
    ]
  }
}