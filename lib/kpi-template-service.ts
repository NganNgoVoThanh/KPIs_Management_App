// lib/kpi-template-service.ts - Unified KPI Template Service

import { db } from './db'
import type {
  KpiTemplate,
  TemplateSource,
  TemplateStatus
} from './types'

export interface CreateTemplateInput {
  name: string
  description?: string
  department: string
  jobTitle?: string
  category?: string
  kpiType: string
  unit?: string
  formula?: string
  dataSource?: string
  targetValue?: number
  weight?: number
  tags?: string[]
  ogsmAlignment?: string
  frequency?: string
  priority?: string
  source?: TemplateSource
  uploadId?: string
  clonedFromId?: string
  createdBy: string
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  id: string
}

export interface TemplateFilters {
  department?: string
  category?: string
  status?: TemplateStatus
  source?: TemplateSource
  kpiType?: string
  isActive?: boolean
  search?: string
}

class KpiTemplateService {

  /**
   * Create a new KPI template
   */
  async createTemplate(input: CreateTemplateInput): Promise<KpiTemplate> {
    const template = await db.kpiTemplate.create({
      data: {
        name: input.name,
        description: input.description,
        department: input.department,
        jobTitle: input.jobTitle,
        category: input.category,
        kpiType: input.kpiType,
        unit: input.unit,
        formula: input.formula,
        dataSource: input.dataSource,
        targetValue: input.targetValue,
        weight: input.weight,
        tags: input.tags || [],
        ogsmAlignment: input.ogsmAlignment,
        frequency: input.frequency,
        priority: input.priority,
        source: input.source || 'MANUAL',
        uploadId: input.uploadId,
        clonedFromId: input.clonedFromId,
        status: 'DRAFT',
        version: 1,
        usageCount: 0,
        isActive: true,
        createdBy: input.createdBy
      }
    })

    return this.formatTemplate(template)
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: string): Promise<KpiTemplate | null> {
    const template = await db.kpiTemplate.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!template) return null
    return this.formatTemplate(template)
  }

  /**
   * Get all templates with filters
   */
  async getTemplates(filters: TemplateFilters = {}): Promise<KpiTemplate[]> {
    const where: any = {}

    if (filters.department) {
      where.department = filters.department
    }
    if (filters.category) {
      where.category = filters.category
    }
    if (filters.status) {
      where.status = filters.status
    }
    if (filters.source) {
      where.source = filters.source
    }
    if (filters.kpiType) {
      where.kpiType = filters.kpiType
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } },
        { department: { contains: filters.search } }
      ]
    }

    const templates = await db.kpiTemplate.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { status: 'asc' },  // APPROVED first
        { usageCount: 'desc' },  // Most used first
        { createdAt: 'desc' }
      ]
    })

    return templates.map(t => this.formatTemplate(t))
  }

  /**
   * Update template
   */
  async updateTemplate(input: UpdateTemplateInput): Promise<KpiTemplate> {
    const { id, ...data } = input

    const template = await db.kpiTemplate.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    })

    return this.formatTemplate(template)
  }

  /**
   * Submit template for review
   */
  async submitForReview(id: string, submittedBy: string): Promise<KpiTemplate> {
    const template = await db.kpiTemplate.update({
      where: { id },
      data: {
        status: 'PENDING',
        submittedBy,
        submittedAt: new Date()
      }
    })

    return this.formatTemplate(template)
  }

  /**
   * Approve template
   */
  async approveTemplate(
    id: string,
    reviewedBy: string,
    reviewComment?: string
  ): Promise<KpiTemplate> {
    const template = await db.kpiTemplate.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy,
        reviewedAt: new Date(),
        reviewComment,
        isActive: true
      }
    })

    return this.formatTemplate(template)
  }

  /**
   * Reject template
   */
  async rejectTemplate(
    id: string,
    reviewedBy: string,
    rejectionReason: string
  ): Promise<KpiTemplate> {
    const template = await db.kpiTemplate.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy,
        reviewedAt: new Date(),
        rejectionReason
      }
    })

    return this.formatTemplate(template)
  }

  /**
   * Clone template
   */
  async cloneTemplate(
    id: string,
    createdBy: string,
    overrides?: Partial<CreateTemplateInput>
  ): Promise<KpiTemplate> {
    const original = await this.getTemplateById(id)
    if (!original) {
      throw new Error('Template not found')
    }

    const cloned = await this.createTemplate({
      ...original,
      name: `${original.name} (Copy)`,
      ...overrides,
      source: 'CLONED',
      clonedFromId: id,
      createdBy
    })

    return cloned
  }

  /**
   * Increment usage count when template is used
   */
  async incrementUsage(id: string): Promise<void> {
    await db.kpiTemplate.update({
      where: { id },
      data: {
        usageCount: {
          increment: 1
        },
        lastUsedAt: new Date()
      }
    })
  }

  /**
   * Archive template
   */
  async archiveTemplate(id: string): Promise<KpiTemplate> {
    const template = await db.kpiTemplate.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        isActive: false
      }
    })

    return this.formatTemplate(template)
  }

  /**
   * Delete template (soft delete by archiving)
   */
  async deleteTemplate(id: string): Promise<void> {
    await this.archiveTemplate(id)
  }

  /**
   * Get template statistics
   */
  async getStatistics() {
    const [
      total,
      draft,
      pending,
      approved,
      rejected,
      byDepartment,
      byCategory,
      mostUsed
    ] = await Promise.all([
      db.kpiTemplate.count(),
      db.kpiTemplate.count({ where: { status: 'DRAFT' } }),
      db.kpiTemplate.count({ where: { status: 'PENDING' } }),
      db.kpiTemplate.count({ where: { status: 'APPROVED', isActive: true } }),
      db.kpiTemplate.count({ where: { status: 'REJECTED' } }),

      // Group by department
      db.kpiTemplate.groupBy({
        by: ['department'],
        _count: true,
        where: { isActive: true }
      }),

      // Group by category
      db.kpiTemplate.groupBy({
        by: ['category'],
        _count: true,
        where: { isActive: true, category: { not: null } }
      }),

      // Most used templates
      db.kpiTemplate.findMany({
        where: { isActive: true, status: 'APPROVED' },
        orderBy: { usageCount: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          department: true,
          usageCount: true
        }
      })
    ])

    return {
      total,
      draft,
      pending,
      approved,
      rejected,
      byDepartment: byDepartment.map(d => ({
        department: d.department,
        count: d._count
      })),
      byCategory: byCategory.map(c => ({
        category: c.category,
        count: c._count
      })),
      mostUsed
    }
  }

  /**
   * Format template for API response
   */
  private formatTemplate(template: any): KpiTemplate {
    return {
      ...template,
      tags: template.tags || [],
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt?.toISOString(),
      submittedAt: template.submittedAt?.toISOString(),
      reviewedAt: template.reviewedAt?.toISOString(),
      lastUsedAt: template.lastUsedAt?.toISOString()
    }
  }
}

export const kpiTemplateService = new KpiTemplateService()
