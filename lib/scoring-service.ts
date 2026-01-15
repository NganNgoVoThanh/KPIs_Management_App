// lib/scoring-service.ts - FIXED: Correct cascading logic for Type IV

export type KpiType = 'QUANT_HIGHER_BETTER' | 'QUANT_LOWER_BETTER' | 'MILESTONE' | 'BOOLEAN'

export interface ScoreResult {
  percentage: number
  score: number
  band: string
  explanation: string
}

export interface TypeIVScaleEntry {
  from: number
  to: number
  scoreLevel: number
}

export interface TypeIVScoringRules {
  scale: TypeIVScaleEntry[]
  // Direction is no longer strictly needed for calculation but kept for compatibility or sorting if needed
  direction?: 'ASCENDING' | 'DESCENDING'
}

export const DEFAULT_SCORE_BANDS: Record<string, number> = {
  '>=120': 5,
  '100-119': 4,
  '80-99': 3,
  '60-79': 2,
  '<60': 1
}

export function detectScaleDirection(scale: TypeIVScaleEntry[]): 'ASCENDING' | 'DESCENDING' {
  // Simple heuristic based on 'from' values
  if (scale.length < 2) return 'ASCENDING'
  return scale[0].from < scale[1].from ? 'ASCENDING' : 'DESCENDING'
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
 * Type IV: Milestone with Custom Scale - RANGE BASED
 * 
 * Logic: Find the range [min, max] that contains the actual value.
 * If multiple ranges match, take the one with the highest score.
 */
export function calculateTypeIV(
  actual: number,
  scoringRules: TypeIVScoringRules
): ScoreResult {
  if (!scoringRules || !scoringRules.scale || scoringRules.scale.length === 0) {
    return {
      percentage: 0,
      score: 0,
      band: 'Invalid',
      explanation: 'Invalid scoring rules: minimum 1 scale entry required'
    }
  }

  const { scale } = scoringRules
  let matchedEntry: TypeIVScaleEntry | null = null
  let maxScore = -1

  for (const entry of scale) {
    const min = Math.min(entry.from, entry.to)
    const max = Math.max(entry.from, entry.to)

    if (actual >= min && actual <= max) {
      if (entry.scoreLevel > maxScore) {
        maxScore = entry.scoreLevel
        matchedEntry = entry
      }
    }
  }

  if (!matchedEntry) {
    return {
      percentage: 0,
      score: 0,
      band: 'Not Achieved',
      explanation: `Actual ${actual} falls outside all defined ranges.`
    }
  }

  const percentage = maxScore
  const score = getScoreFromPercentage(percentage)
  const band = getBandFromPercentage(percentage)

  return {
    percentage: Math.round(percentage * 10) / 10,
    score,
    band,
    explanation: `Matched range [${matchedEntry.from} - ${matchedEntry.to}] → ${maxScore} points`
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
  if (scale.length < 1) {
    return { valid: false, message: 'Scale must have at least 1 entry' }
  }

  if (scale.length > 10) {
    return { valid: false, message: 'Scale cannot have more than 10 entries' }
  }

  for (const entry of scale) {
    if (isNaN(entry.from) || isNaN(entry.to)) {
      return { valid: false, message: 'From/To values must be numbers' }
    }
    if (entry.scoreLevel < 0 || entry.scoreLevel > 120) { // Allow up to 120 for bonuses? sticking to 0-100 logic but checking strictness
      // User asked for "score 100".
      if (entry.scoreLevel < 0) return { valid: false, message: 'Score must be positive' }
    }
  }

  return { valid: true, message: `Valid scale with ${scale.length} ranges` }
}
