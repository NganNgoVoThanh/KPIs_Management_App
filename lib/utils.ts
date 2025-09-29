// lib/utils.ts - FIXED: Add missing generateUUID function
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate UUID for unique IDs
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Format date to locale string
 */
export function formatDate(date: Date | string, locale: string = 'vi-VN'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(locale)
}

/**
 * Format datetime to locale string
 */
export function formatDateTime(date: Date | string, locale: string = 'vi-VN'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString(locale)
}

/**
 * Calculate percentage
 */
export function calculatePercentage(actual: number, target: number): number {
  if (target === 0) return actual === 0 ? 100 : 150
  return Math.round((actual / target) * 100)
}

/**
 * Format number with thousand separator
 */
export function formatNumber(num: number, locale: string = 'vi-VN'): string {
  return new Intl.NumberFormat(locale).format(num)
}

/**
 * Truncate text
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}