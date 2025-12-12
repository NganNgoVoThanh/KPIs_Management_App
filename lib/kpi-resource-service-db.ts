// lib/kpi-resource-service-db.ts - Enhanced KPI Resource Service with DB & BI Support

import { db } from './db'
import type {
  KpiResource,
  KpiResourceCategory,
  KpiResourceType,
  BiDashboardType,
  KpiResourceUploadRequest
} from './types'

export interface CreateResourceInput {
  title: string
  description?: string
  category: KpiResourceCategory
  department?: string
  tags?: string[]
  resourceType: KpiResourceType
  uploadedBy: string

  // For FILE type
  fileName?: string
  fileType?: string
  fileSize?: number
  mimeType?: string
  storageProvider?: string
  storageUrl?: string
  driveId?: string
  fileId?: string

  // For BI_DASHBOARD type
  dashboardUrl?: string
  dashboardType?: BiDashboardType
  embedUrl?: string
  workspaceId?: string
  reportId?: string
  datasetId?: string
  requiresAuth?: boolean
  authConfig?: any

  // For LINK type
  externalUrl?: string

  isPublic?: boolean
  isFeatured?: boolean
}

export interface ResourceFilters {
  category?: KpiResourceCategory
  resourceType?: KpiResourceType
  department?: string
  status?: string
  approvalStatus?: string
  isPublic?: boolean
  isFeatured?: boolean
  dashboardType?: BiDashboardType
  search?: string
}

class KpiResourceServiceDb {

  /**
   * Create new resource
   */
  async createResource(input: CreateResourceInput): Promise<KpiResource> {
    const resource = await db.kpiResource.create({
      data: {
        title: input.title,
        description: input.description,
        category: input.category,
        department: input.department,
        tags: input.tags || [],
        resourceType: input.resourceType,

        // File fields
        fileName: input.fileName,
        fileType: input.fileType,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        storageProvider: input.storageProvider,
        storageUrl: input.storageUrl,
        driveId: input.driveId,
        fileId: input.fileId,

        // BI Dashboard fields
        dashboardUrl: input.dashboardUrl,
        dashboardType: input.dashboardType,
        embedUrl: input.embedUrl,
        workspaceId: input.workspaceId,
        reportId: input.reportId,
        datasetId: input.datasetId,
        requiresAuth: input.requiresAuth || false,
        authConfig: input.authConfig,

        // Link fields
        externalUrl: input.externalUrl,

        // Metadata
        uploadedBy: input.uploadedBy,
        status: 'ACTIVE',
        isPublic: input.isPublic ?? true,
        isFeatured: input.isFeatured ?? false,
        downloadCount: 0,
        viewCount: 0,
        approvalStatus: 'PENDING',
        version: 1
      }
    })

    return this.formatResource(resource)
  }

  /**
   * Get resource by ID
   */
  async getResourceById(id: string): Promise<KpiResource | null> {
    const resource = await db.kpiResource.findUnique({
      where: { id },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!resource) return null

    // Increment view count
    await this.incrementViewCount(id)

    return this.formatResource(resource)
  }

  /**
   * Get all resources with filters
   */
  async getResources(filters: ResourceFilters = {}): Promise<KpiResource[]> {
    const where: any = {}

    if (filters.category) {
      where.category = filters.category
    }
    if (filters.resourceType) {
      where.resourceType = filters.resourceType
    }
    if (filters.department) {
      where.department = filters.department
    }
    if (filters.status) {
      where.status = filters.status
    }
    if (filters.approvalStatus) {
      where.approvalStatus = filters.approvalStatus
    }
    if (filters.isPublic !== undefined) {
      where.isPublic = filters.isPublic
    }
    if (filters.isFeatured !== undefined) {
      where.isFeatured = filters.isFeatured
    }
    if (filters.dashboardType) {
      where.dashboardType = filters.dashboardType
    }
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
        { department: { contains: filters.search } }
      ]
    }

    const resources = await db.kpiResource.findMany({
      where,
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { isFeatured: 'desc' },
        { downloadCount: 'desc' },
        { uploadedAt: 'desc' }
      ]
    })

    return resources.map(r => this.formatResource(r))
  }

  /**
   * Update resource
   */
  async updateResource(
    id: string,
    updates: Partial<CreateResourceInput>
  ): Promise<KpiResource> {
    const resource = await db.kpiResource.update({
      where: { id },
      data: {
        ...updates,
        tags: updates.tags,
        authConfig: updates.authConfig,
        updatedAt: new Date()
      }
    })

    return this.formatResource(resource)
  }

  /**
   * Approve resource
   */
  async approveResource(
    id: string,
    approvedBy: string,
    comment?: string
  ): Promise<KpiResource> {
    const resource = await db.kpiResource.update({
      where: { id },
      data: {
        approvalStatus: 'APPROVED',
        approvedBy,
        approvedAt: new Date()
      }
    })

    return this.formatResource(resource)
  }

  /**
   * Reject resource
   */
  async rejectResource(
    id: string,
    approvedBy: string,
    rejectionReason: string
  ): Promise<KpiResource> {
    const resource = await db.kpiResource.update({
      where: { id },
      data: {
        approvalStatus: 'REJECTED',
        approvedBy,
        approvedAt: new Date(),
        rejectionReason
      }
    })

    return this.formatResource(resource)
  }

  /**
   * Increment download count
   */
  async incrementDownloadCount(id: string): Promise<void> {
    await db.kpiResource.update({
      where: { id },
      data: {
        downloadCount: {
          increment: 1
        }
      }
    })
  }

  /**
   * Increment view count
   */
  async incrementViewCount(id: string): Promise<void> {
    await db.kpiResource.update({
      where: { id },
      data: {
        viewCount: {
          increment: 1
        }
      }
    })
  }

  /**
   * Archive resource
   */
  async archiveResource(id: string): Promise<KpiResource> {
    const resource = await db.kpiResource.update({
      where: { id },
      data: {
        status: 'ARCHIVED'
      }
    })

    return this.formatResource(resource)
  }

  /**
   * Delete resource (soft delete)
   */
  async deleteResource(id: string): Promise<void> {
    await db.kpiResource.update({
      where: { id },
      data: {
        status: 'DELETED'
      }
    })
  }

  /**
   * Get statistics
   */
  async getStatistics() {
    const [
      total,
      active,
      archived,
      pending,
      approved,
      rejected,
      byCategory,
      byResourceType,
      byDashboardType,
      featured,
      totalDownloads,
      totalViews
    ] = await Promise.all([
      db.kpiResource.count(),
      db.kpiResource.count({ where: { status: 'ACTIVE' } }),
      db.kpiResource.count({ where: { status: 'ARCHIVED' } }),
      db.kpiResource.count({ where: { approvalStatus: 'PENDING' } }),
      db.kpiResource.count({ where: { approvalStatus: 'APPROVED' } }),
      db.kpiResource.count({ where: { approvalStatus: 'REJECTED' } }),

      // Group by category
      db.kpiResource.groupBy({
        by: ['category'],
        _count: true,
        where: { status: 'ACTIVE' }
      }),

      // Group by resource type
      db.kpiResource.groupBy({
        by: ['resourceType'],
        _count: true,
        where: { status: 'ACTIVE' }
      }),

      // Group by dashboard type
      db.kpiResource.groupBy({
        by: ['dashboardType'],
        _count: true,
        where: {
          status: 'ACTIVE',
          resourceType: 'BI_DASHBOARD',
          dashboardType: { not: null }
        }
      }),

      db.kpiResource.count({ where: { isFeatured: true, status: 'ACTIVE' } }),

      // Sum download count
      db.kpiResource.aggregate({
        _sum: {
          downloadCount: true
        }
      }),

      // Sum view count
      db.kpiResource.aggregate({
        _sum: {
          viewCount: true
        }
      })
    ])

    return {
      total,
      active,
      archived,
      pending,
      approved,
      rejected,
      featured,
      byCategory: byCategory.map(c => ({
        category: c.category,
        count: c._count
      })),
      byResourceType: byResourceType.map(t => ({
        type: t.resourceType,
        count: t._count
      })),
      byDashboardType: byDashboardType.map(d => ({
        type: d.dashboardType,
        count: d._count
      })),
      totalDownloads: totalDownloads._sum.downloadCount || 0,
      totalViews: totalViews._sum.viewCount || 0
    }
  }

  /**
   * Get popular resources (most downloaded)
   */
  async getPopularResources(limit: number = 10): Promise<KpiResource[]> {
    const resources = await db.kpiResource.findMany({
      where: {
        status: 'ACTIVE',
        approvalStatus: 'APPROVED'
      },
      orderBy: {
        downloadCount: 'desc'
      },
      take: limit
    })

    return resources.map(r => this.formatResource(r))
  }

  /**
   * Get featured resources
   */
  async getFeaturedResources(): Promise<KpiResource[]> {
    const resources = await db.kpiResource.findMany({
      where: {
        status: 'ACTIVE',
        approvalStatus: 'APPROVED',
        isFeatured: true
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    })

    return resources.map(r => this.formatResource(r))
  }

  /**
   * Get BI Dashboards
   */
  async getBIDashboards(filters?: {
    dashboardType?: BiDashboardType
    department?: string
  }): Promise<KpiResource[]> {
    const where: any = {
      resourceType: 'BI_DASHBOARD',
      status: 'ACTIVE',
      approvalStatus: 'APPROVED'
    }

    if (filters?.dashboardType) {
      where.dashboardType = filters.dashboardType
    }
    if (filters?.department) {
      where.department = filters.department
    }

    const dashboards = await db.kpiResource.findMany({
      where,
      orderBy: {
        uploadedAt: 'desc'
      }
    })

    return dashboards.map(d => this.formatResource(d))
  }

  /**
   * Sync BI Dashboard data (update lastSyncedAt)
   */
  async syncBIDashboard(id: string): Promise<KpiResource> {
    const resource = await db.kpiResource.update({
      where: { id },
      data: {
        lastSyncedAt: new Date()
      }
    })

    return this.formatResource(resource)
  }

  /**
   * Get supported file types
   */
  getSupportedFileTypes(): { [key: string]: string[] } {
    return {
      documents: ['pdf', 'doc', 'docx', 'txt', 'rtf'],
      spreadsheets: ['xlsx', 'xls', 'csv'],
      presentations: ['ppt', 'pptx'],
      images: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'],
      archives: ['zip', 'rar', '7z'],
      data: ['json', 'xml', 'sql']
    }
  }

  /**
   * Validate file type
   */
  isFileTypeSupported(fileType: string): boolean {
    const supported = this.getSupportedFileTypes()
    return Object.values(supported).some(types =>
      types.includes(fileType.toLowerCase())
    )
  }

  /**
   * Format resource for API response
   */
  private formatResource(resource: any): KpiResource {
    return {
      ...resource,
      tags: resource.tags || [],
      uploadedAt: resource.uploadedAt.toISOString(),
      updatedAt: resource.updatedAt.toISOString(),
      approvedAt: resource.approvedAt?.toISOString(),
      lastSyncedAt: resource.lastSyncedAt?.toISOString()
    }
  }
}

export const kpiResourceServiceDb = new KpiResourceServiceDb()
