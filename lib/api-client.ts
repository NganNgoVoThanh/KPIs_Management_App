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
  let userId = user?.id;

  // Fallback: Try to get from localStorage directly if authService returns null (Client-side only)
  if (!userId && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('vicc_kpi_current_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.user?.id) {
          userId = parsed.user.id;
          console.log('[API-CLIENT] ⚠️ Retrieved User ID from localStorage fallback:', userId);
        }
      }
    } catch (e) {
      console.error('[API-CLIENT] Failed to parse localStorage in fallback:', e);
    }
  }

  if (userId) {
    headers.set('x-user-id', userId)
    console.log('[API-CLIENT] ✅ Added x-user-id header:', userId)
  } else {
    console.error('[API-CLIENT] ❌ NO USER - x-user-id header NOT added!')
    console.error('[API-CLIENT] This will cause 401/403 errors on the server!')
  }
  console.log('[API-CLIENT] =========================================================')

  // Ensure Content-Type is set for POST/PUT requests
  // BUT NOT if it's FormData (let browser set multipart/form-data with boundary)
  if (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH') {
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    if (!headers.has('Content-Type') && !isFormData) {
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
