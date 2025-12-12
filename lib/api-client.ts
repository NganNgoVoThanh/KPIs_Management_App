// lib/api-client.ts - API client with authentication headers
import { authService } from './auth-service'

/**
 * Fetch wrapper that automatically adds authentication headers
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const user = authService.getCurrentUser()

  console.log('[API-CLIENT] ==================== REQUEST DEBUG ====================')
  console.log('[API-CLIENT] URL:', url)
  console.log('[API-CLIENT] Method:', options.method || 'GET')

  // Log what's actually in localStorage
  if (typeof window !== 'undefined') {
    const rawData = localStorage.getItem('vicc_kpi_current_user')
    console.log('[API-CLIENT] localStorage raw data exists:', !!rawData)
    if (rawData) {
      try {
        const parsed = JSON.parse(rawData)
        console.log('[API-CLIENT] localStorage user.id:', parsed.user?.id)
        console.log('[API-CLIENT] localStorage user.email:', parsed.user?.email)
        console.log('[API-CLIENT] localStorage user.role:', parsed.user?.role)
        console.log('[API-CLIENT] localStorage expiry:', new Date(parsed.expiry).toISOString())
        console.log('[API-CLIENT] localStorage expired:', new Date().getTime() > parsed.expiry)
      } catch (e) {
        console.error('[API-CLIENT] Failed to parse localStorage data:', e)
      }
    }
  }

  console.log('[API-CLIENT] authService.getCurrentUser() returned:', user ? { id: user.id, email: user.email, role: user.role } : 'NULL')

  const headers = new Headers(options.headers)

  // Add user ID header for server-side authentication
  if (user) {
    headers.set('x-user-id', user.id)
    console.log('[API-CLIENT] ✅ Added x-user-id header:', user.id)
  } else {
    console.error('[API-CLIENT] ❌ NO USER - x-user-id header NOT added!')
    console.error('[API-CLIENT] This will cause 401/403 errors on the server!')
  }
  console.log('[API-CLIENT] =========================================================')

  // Ensure Content-Type is set for POST/PUT requests
  if (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH') {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
  }

  return fetch(url, {
    ...options,
    headers,
  })
}

/**
 * Helper for GET requests
 */
export async function apiGet<T = any>(url: string): Promise<T> {
  const response = await authenticatedFetch(url, { method: 'GET' })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }
  return response.json()
}

/**
 * Helper for POST requests
 */
export async function apiPost<T = any>(url: string, data: any): Promise<T> {
  const response = await authenticatedFetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }
  return response.json()
}

/**
 * Helper for PUT requests
 */
export async function apiPut<T = any>(url: string, data: any): Promise<T> {
  const response = await authenticatedFetch(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }
  return response.json()
}

/**
 * Helper for DELETE requests
 */
export async function apiDelete<T = any>(url: string): Promise<T> {
  const response = await authenticatedFetch(url, { method: 'DELETE' })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }
  return response.json()
}
