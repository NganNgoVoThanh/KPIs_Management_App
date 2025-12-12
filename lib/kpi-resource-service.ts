// lib/kpi-resource-service.ts
import type {
  KpiResource,
  KpiResourceCategory,
  KpiResourceStatus,
  KpiResourceApprovalStatus
} from './types';

/**
 * KPI Resource Service
 * Manages document/file resources in KPI Library
 */
class KpiResourceService {
  private readonly STORAGE_KEY = 'kpi_resources';

  // Helper to check if localStorage is available
  private isClient(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  // Safe localStorage getter
  private getFromStorage(): KpiResource[] {
    if (!this.isClient()) return [];
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  // Safe localStorage setter
  private setToStorage(resources: KpiResource[]): void {
    if (this.isClient()) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(resources));
    }
  }

  /**
   * Get all resources with optional filters
   */
  getResources(filters?: {
    category?: KpiResourceCategory;
    department?: string;
    status?: KpiResourceStatus;
    approvalStatus?: KpiResourceApprovalStatus;
    isPublic?: boolean;
    searchQuery?: string;
  }): KpiResource[] {
    let resources = this.getFromStorage();

    if (filters) {
      if (filters.category) {
        resources = resources.filter(r => r.category === filters.category);
      }
      if (filters.department) {
        resources = resources.filter(r =>
          r.department?.toLowerCase().includes(filters.department!.toLowerCase())
        );
      }
      if (filters.status) {
        resources = resources.filter(r => r.status === filters.status);
      }
      if (filters.approvalStatus) {
        resources = resources.filter(r => r.approvalStatus === filters.approvalStatus);
      }
      if (filters.isPublic !== undefined) {
        resources = resources.filter(r => r.isPublic === filters.isPublic);
      }
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        resources = resources.filter(r =>
          r.title.toLowerCase().includes(query) ||
          r.description?.toLowerCase().includes(query) ||
          r.fileName.toLowerCase().includes(query) ||
          r.tags?.some(tag => tag.toLowerCase().includes(query))
        );
      }
    }

    return resources.sort((a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }

  /**
   * Get single resource by ID
   */
  getResourceById(id: string): KpiResource | undefined {
    const resources = this.getFromStorage();
    return resources.find(r => r.id === id);
  }

  /**
   * Create new resource
   */
  createResource(data: {
    title: string;
    description?: string;
    category: KpiResourceCategory;
    department?: string;
    tags?: string[];
    fileName: string;
    fileType: string;
    fileSize: number;
    mimeType: string;
    storageUrl: string;
    driveId?: string;
    fileId?: string;
    uploadedBy: string;
    isPublic?: boolean;
  }): KpiResource {
    const resources = this.getFromStorage();

    const newResource: KpiResource = {
      id: this.generateId(),
      title: data.title,
      description: data.description,
      category: data.category,
      department: data.department,
      tags: data.tags,
      fileName: data.fileName,
      fileType: data.fileType,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      storageProvider: 'M365',
      storageUrl: data.storageUrl,
      driveId: data.driveId,
      fileId: data.fileId,
      uploadedBy: data.uploadedBy,
      uploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'ACTIVE',
      isPublic: data.isPublic ?? true,
      downloadCount: 0,
      viewCount: 0,
      approvalStatus: 'PENDING'
    };

    resources.push(newResource);
    this.setToStorage(resources);

    return newResource;
  }

  /**
   * Update resource
   */
  updateResource(id: string, updates: Partial<KpiResource>): KpiResource {
    const resources = this.getFromStorage();
    const index = resources.findIndex(r => r.id === id);

    if (index === -1) {
      throw new Error('Resource not found');
    }

    resources[index] = {
      ...resources[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.setToStorage(resources);
    return resources[index];
  }

  /**
   * Delete resource (soft delete)
   */
  deleteResource(id: string): void {
    this.updateResource(id, { status: 'DELETED' });
  }

  /**
   * Archive resource
   */
  archiveResource(id: string): void {
    this.updateResource(id, { status: 'ARCHIVED' });
  }

  /**
   * Approve resource
   */
  approveResource(id: string, approvedBy: string, comment?: string): KpiResource {
    return this.updateResource(id, {
      approvalStatus: 'APPROVED',
      approvedBy,
      approvedAt: new Date().toISOString()
    });
  }

  /**
   * Reject resource
   */
  rejectResource(id: string, approvedBy: string, reason: string): KpiResource {
    return this.updateResource(id, {
      approvalStatus: 'REJECTED',
      approvedBy,
      approvedAt: new Date().toISOString(),
      rejectionReason: reason
    });
  }

  /**
   * Increment download count
   */
  incrementDownloadCount(id: string): void {
    const resource = this.getResourceById(id);
    if (resource) {
      this.updateResource(id, {
        downloadCount: resource.downloadCount + 1
      });
    }
  }

  /**
   * Increment view count
   */
  incrementViewCount(id: string): void {
    const resource = this.getResourceById(id);
    if (resource) {
      this.updateResource(id, {
        viewCount: resource.viewCount + 1
      });
    }
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const resources = this.getFromStorage();

    return {
      total: resources.length,
      active: resources.filter(r => r.status === 'ACTIVE').length,
      archived: resources.filter(r => r.status === 'ARCHIVED').length,
      pending: resources.filter(r => r.approvalStatus === 'PENDING').length,
      approved: resources.filter(r => r.approvalStatus === 'APPROVED').length,
      rejected: resources.filter(r => r.approvalStatus === 'REJECTED').length,
      byCategory: this.groupByCategory(resources),
      byDepartment: this.groupByDepartment(resources),
      totalDownloads: resources.reduce((sum, r) => sum + r.downloadCount, 0),
      totalViews: resources.reduce((sum, r) => sum + r.viewCount, 0)
    };
  }

  /**
   * Get resources by category
   */
  private groupByCategory(resources: KpiResource[]): Record<string, number> {
    const result: Record<string, number> = {};
    resources.forEach(resource => {
      result[resource.category] = (result[resource.category] || 0) + 1;
    });
    return result;
  }

  /**
   * Get resources by department
   */
  private groupByDepartment(resources: KpiResource[]): Record<string, number> {
    const result: Record<string, number> = {};
    resources.forEach(resource => {
      if (resource.department) {
        result[resource.department] = (result[resource.department] || 0) + 1;
      }
    });
    return result;
  }

  /**
   * Search resources
   */
  searchResources(query: string): KpiResource[] {
    return this.getResources({ searchQuery: query });
  }

  /**
   * Get popular resources (most downloaded)
   */
  getPopularResources(limit: number = 10): KpiResource[] {
    const resources = this.getResources({
      status: 'ACTIVE',
      approvalStatus: 'APPROVED'
    });

    return resources
      .sort((a, b) => b.downloadCount - a.downloadCount)
      .slice(0, limit);
  }

  /**
   * Get recent resources
   */
  getRecentResources(limit: number = 10): KpiResource[] {
    const resources = this.getResources({
      status: 'ACTIVE',
      approvalStatus: 'APPROVED'
    });

    return resources
      .sort((a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      )
      .slice(0, limit);
  }

  /**
   * Get supported file types
   */
  getSupportedFileTypes(): { [key: string]: string[] } {
    return {
      documents: ['pdf', 'doc', 'docx', 'txt'],
      spreadsheets: ['xlsx', 'xls', 'csv'],
      presentations: ['ppt', 'pptx'],
      images: ['jpg', 'jpeg', 'png', 'gif', 'bmp'],
      archives: ['zip', 'rar']
    };
  }

  /**
   * Validate file type
   */
  isFileTypeSupported(fileType: string): boolean {
    const supported = this.getSupportedFileTypes();
    return Object.values(supported).some(types =>
      types.includes(fileType.toLowerCase())
    );
  }

  /**
   * Get file category from type
   */
  getFileCategoryFromType(fileType: string): string {
    const supported = this.getSupportedFileTypes();
    for (const [category, types] of Object.entries(supported)) {
      if (types.includes(fileType.toLowerCase())) {
        return category;
      }
    }
    return 'other';
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `kpi-res-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const kpiResourceService = new KpiResourceService();
