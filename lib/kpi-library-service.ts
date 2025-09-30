// lib/kpi-library-service.ts

export interface KpiLibraryEntry {
  id: string
  department: string
  jobTitle: string
  kpiName: string
  kpiType: string
  unit: string
  dataSource: string
}

class KpiLibraryServiceSimple {
  private STORAGE_KEY = 'vicc_kpi_library'

  getKpiLibrary(): KpiLibraryEntry[] {
    if (typeof window === 'undefined') return []
    
    try {
      const data = localStorage.getItem(this.STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  saveKpiLibrary(entries: KpiLibraryEntry[]): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries))
    } catch (error) {
      console.error('Error saving KPI library:', error)
    }
  }

  searchKpiLibrary(query: string, department?: string): KpiLibraryEntry[] {
    const entries = this.getKpiLibrary()
    
    return entries.filter(entry => {
      const matchQuery = !query || entry.kpiName.toLowerCase().includes(query.toLowerCase())
      const matchDept = !department || entry.department === department
      return matchQuery && matchDept
    })
  }
}

export const kpiLibraryServiceSimple = new KpiLibraryServiceSimple()


// lib/admin-proxy-service-simple.ts  
// Service đơn giản cho admin proxy

export interface ProxyActionSimple {
  id: string
  actionType: string
  performedBy: string
  performedAt: string
  entityType: string
  entityId: string
  reason: string
}

class AdminProxyServiceSimple {
  private STORAGE_KEY = 'vicc_admin_proxy_actions'

  async returnToStaff(params: {
    entityType: string
    entityId: string
    staffUserId: string
    reason: string
    comment?: string
  }): Promise<{ success: boolean; message: string }> {
    
    try {
      // Log action
      const action: ProxyActionSimple = {
        id: `proxy-${Date.now()}`,
        actionType: 'RETURN_TO_STAFF',
        performedBy: 'admin',
        performedAt: new Date().toISOString(),
        entityType: params.entityType,
        entityId: params.entityId,
        reason: params.reason
      }

      this.saveProxyAction(action)

      return {
        success: true,
        message: 'Returned to staff successfully'
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Action failed'
      }
    }
  }

  getProxyActions(): ProxyActionSimple[] {
    if (typeof window === 'undefined') return []
    
    try {
      const data = localStorage.getItem(this.STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  private saveProxyAction(action: ProxyActionSimple): void {
    if (typeof window === 'undefined') return
    
    try {
      const actions = this.getProxyActions()
      actions.push(action)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(actions))
    } catch (error) {
      console.error('Error saving proxy action:', error)
    }
  }
}

export const adminProxyServiceSimple = new AdminProxyServiceSimple()