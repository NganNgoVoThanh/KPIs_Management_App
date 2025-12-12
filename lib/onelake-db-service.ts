// lib/onelake-db-service.ts
import { Connection, Request, TYPES } from 'tedious';
import type { KpiResource, KpiResourceCategory, KpiResourceStatus, KpiResourceApprovalStatus } from './types';

/**
 * OneLake Database Service
 * Manages KPI Resource metadata in Lakehouse SQL Endpoint
 */
class OneLakeDbService {
  private config: any;

  constructor() {
    this.config = {
      server: process.env.ONELAKE_SERVER || '',
      authentication: {
        type: 'azure-active-directory-service-principal-secret',
        options: {
          clientId: process.env.AZURE_CLIENT_ID || '',
          clientSecret: process.env.AZURE_CLIENT_SECRET || '',
          tenantId: process.env.AZURE_TENANT_ID || ''
        }
      },
      options: {
        database: process.env.ONELAKE_DATABASE || 'KPIs_Management',
        encrypt: true,
        trustServerCertificate: false,
        rowCollectionOnRequestCompletion: true
      }
    };
  }

  /**
   * Create connection to OneLake SQL Endpoint
   */
  private async createConnection(): Promise<any> {
    return new Promise((resolve, reject) => {
      const connection = new Connection(this.config);

      connection.on('connect', (err: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(connection);
        }
      });

      connection.connect();
    });
  }

  /**
   * Execute SQL query
   */
  private async executeQuery(sql: string, parameters: any[] = []): Promise<any[]> {
    const connection = await this.createConnection();

    return new Promise((resolve, reject) => {
      const results: any[] = [];

      const request = new Request(sql, (err: any) => {
        connection.close();
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });

      // Add parameters
      parameters.forEach(param => {
        request.addParameter(param.name, param.type, param.value);
      });

      request.on('row', (columns: any) => {
        const row: any = {};
        columns.forEach((column: any) => {
          row[column.metadata.colName] = column.value;
        });
        results.push(row);
      });

      connection.execSql(request);
    });
  }

  /**
   * Initialize table if not exists
   */
  async initializeTable(): Promise<void> {
    const createTableSQL = `
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'kpi_resources')
      BEGIN
        CREATE TABLE kpi_resources (
          id NVARCHAR(255) PRIMARY KEY,
          title NVARCHAR(500) NOT NULL,
          description NVARCHAR(MAX),
          category NVARCHAR(50) NOT NULL,
          department NVARCHAR(100),
          tags NVARCHAR(MAX),

          fileName NVARCHAR(500) NOT NULL,
          fileType NVARCHAR(50) NOT NULL,
          fileSize BIGINT NOT NULL,
          mimeType NVARCHAR(200) NOT NULL,
          storageProvider NVARCHAR(50) NOT NULL DEFAULT 'ONELAKE',
          storageUrl NVARCHAR(MAX) NOT NULL,
          filePath NVARCHAR(MAX),

          driveId NVARCHAR(255),
          fileId NVARCHAR(255),

          uploadedBy NVARCHAR(255) NOT NULL,
          uploadedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
          updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
          status NVARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
          isPublic BIT NOT NULL DEFAULT 1,
          downloadCount INT NOT NULL DEFAULT 0,
          viewCount INT NOT NULL DEFAULT 0,

          approvalStatus NVARCHAR(50) NOT NULL DEFAULT 'PENDING',
          approvedBy NVARCHAR(255),
          approvedAt DATETIME2,
          rejectionReason NVARCHAR(MAX)
        );

        CREATE INDEX idx_kpi_resources_category ON kpi_resources(category);
        CREATE INDEX idx_kpi_resources_department ON kpi_resources(department);
        CREATE INDEX idx_kpi_resources_status ON kpi_resources(status);
        CREATE INDEX idx_kpi_resources_approval ON kpi_resources(approvalStatus);
      END
    `;

    await this.executeQuery(createTableSQL);
  }

  /**
   * Create new resource
   */
  async createResource(data: {
    id: string;
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
    filePath: string;
    fileId: string;
    uploadedBy: string;
    isPublic?: boolean;
  }): Promise<KpiResource> {
    const sql = `
      INSERT INTO kpi_resources (
        id, title, description, category, department, tags,
        fileName, fileType, fileSize, mimeType, storageProvider, storageUrl, filePath, fileId,
        uploadedBy, uploadedAt, updatedAt, status, isPublic, downloadCount, viewCount, approvalStatus
      ) VALUES (
        @id, @title, @description, @category, @department, @tags,
        @fileName, @fileType, @fileSize, @mimeType, 'ONELAKE', @storageUrl, @filePath, @fileId,
        @uploadedBy, GETDATE(), GETDATE(), 'ACTIVE', @isPublic, 0, 0, 'PENDING'
      )
    `;

    await this.executeQuery(sql, [
      { name: 'id', type: TYPES.NVarChar, value: data.id },
      { name: 'title', type: TYPES.NVarChar, value: data.title },
      { name: 'description', type: TYPES.NVarChar, value: data.description || null },
      { name: 'category', type: TYPES.NVarChar, value: data.category },
      { name: 'department', type: TYPES.NVarChar, value: data.department || null },
      { name: 'tags', type: TYPES.NVarChar, value: data.tags ? JSON.stringify(data.tags) : null },
      { name: 'fileName', type: TYPES.NVarChar, value: data.fileName },
      { name: 'fileType', type: TYPES.NVarChar, value: data.fileType },
      { name: 'fileSize', type: TYPES.BigInt, value: data.fileSize },
      { name: 'mimeType', type: TYPES.NVarChar, value: data.mimeType },
      { name: 'storageUrl', type: TYPES.NVarChar, value: data.storageUrl },
      { name: 'filePath', type: TYPES.NVarChar, value: data.filePath },
      { name: 'fileId', type: TYPES.NVarChar, value: data.fileId },
      { name: 'uploadedBy', type: TYPES.NVarChar, value: data.uploadedBy },
      { name: 'isPublic', type: TYPES.Bit, value: data.isPublic !== false }
    ]);

    return this.getResourceById(data.id) as Promise<KpiResource>;
  }

  /**
   * Get all resources with filters
   */
  async getResources(filters?: {
    category?: KpiResourceCategory;
    department?: string;
    status?: KpiResourceStatus;
    approvalStatus?: KpiResourceApprovalStatus;
    isPublic?: boolean;
    searchQuery?: string;
  }): Promise<KpiResource[]> {
    let sql = 'SELECT * FROM kpi_resources WHERE 1=1';
    const parameters: any[] = [];

    if (filters?.category) {
      sql += ' AND category = @category';
      parameters.push({ name: 'category', type: TYPES.NVarChar, value: filters.category });
    }

    if (filters?.department) {
      sql += ' AND department LIKE @department';
      parameters.push({ name: 'department', type: TYPES.NVarChar, value: `%${filters.department}%` });
    }

    if (filters?.status) {
      sql += ' AND status = @status';
      parameters.push({ name: 'status', type: TYPES.NVarChar, value: filters.status });
    }

    if (filters?.approvalStatus) {
      sql += ' AND approvalStatus = @approvalStatus';
      parameters.push({ name: 'approvalStatus', type: TYPES.NVarChar, value: filters.approvalStatus });
    }

    if (filters?.isPublic !== undefined) {
      sql += ' AND isPublic = @isPublic';
      parameters.push({ name: 'isPublic', type: TYPES.Bit, value: filters.isPublic });
    }

    if (filters?.searchQuery) {
      sql += ' AND (title LIKE @search OR description LIKE @search OR tags LIKE @search)';
      parameters.push({ name: 'search', type: TYPES.NVarChar, value: `%${filters.searchQuery}%` });
    }

    sql += ' ORDER BY uploadedAt DESC';

    const rows = await this.executeQuery(sql, parameters);
    return rows.map(this.mapRowToResource);
  }

  /**
   * Get resource by ID
   */
  async getResourceById(id: string): Promise<KpiResource | null> {
    const sql = 'SELECT * FROM kpi_resources WHERE id = @id';
    const rows = await this.executeQuery(sql, [
      { name: 'id', type: TYPES.NVarChar, value: id }
    ]);

    return rows.length > 0 ? this.mapRowToResource(rows[0]) : null;
  }

  /**
   * Update resource
   */
  async updateResource(id: string, updates: Partial<KpiResource>): Promise<void> {
    const setClauses: string[] = [];
    const parameters: any[] = [{ name: 'id', type: TYPES.NVarChar, value: id }];

    if (updates.title !== undefined) {
      setClauses.push('title = @title');
      parameters.push({ name: 'title', type: TYPES.NVarChar, value: updates.title });
    }

    if (updates.description !== undefined) {
      setClauses.push('description = @description');
      parameters.push({ name: 'description', type: TYPES.NVarChar, value: updates.description });
    }

    if (updates.status !== undefined) {
      setClauses.push('status = @status');
      parameters.push({ name: 'status', type: TYPES.NVarChar, value: updates.status });
    }

    if (updates.approvalStatus !== undefined) {
      setClauses.push('approvalStatus = @approvalStatus');
      parameters.push({ name: 'approvalStatus', type: TYPES.NVarChar, value: updates.approvalStatus });
    }

    if (updates.approvedBy !== undefined) {
      setClauses.push('approvedBy = @approvedBy');
      parameters.push({ name: 'approvedBy', type: TYPES.NVarChar, value: updates.approvedBy });
    }

    if (updates.approvedAt !== undefined) {
      setClauses.push('approvedAt = @approvedAt');
      parameters.push({ name: 'approvedAt', type: TYPES.DateTime2, value: new Date(updates.approvedAt) });
    }

    if (updates.rejectionReason !== undefined) {
      setClauses.push('rejectionReason = @rejectionReason');
      parameters.push({ name: 'rejectionReason', type: TYPES.NVarChar, value: updates.rejectionReason });
    }

    if (updates.downloadCount !== undefined) {
      setClauses.push('downloadCount = @downloadCount');
      parameters.push({ name: 'downloadCount', type: TYPES.Int, value: updates.downloadCount });
    }

    if (updates.viewCount !== undefined) {
      setClauses.push('viewCount = @viewCount');
      parameters.push({ name: 'viewCount', type: TYPES.Int, value: updates.viewCount });
    }

    setClauses.push('updatedAt = GETDATE()');

    const sql = `UPDATE kpi_resources SET ${setClauses.join(', ')} WHERE id = @id`;
    await this.executeQuery(sql, parameters);
  }

  /**
   * Delete resource (soft delete)
   */
  async deleteResource(id: string): Promise<void> {
    const sql = 'UPDATE kpi_resources SET status = @status, updatedAt = GETDATE() WHERE id = @id';
    await this.executeQuery(sql, [
      { name: 'id', type: TYPES.NVarChar, value: id },
      { name: 'status', type: TYPES.NVarChar, value: 'DELETED' }
    ]);
  }

  /**
   * Increment download count
   */
  async incrementDownloadCount(id: string): Promise<void> {
    const sql = 'UPDATE kpi_resources SET downloadCount = downloadCount + 1 WHERE id = @id';
    await this.executeQuery(sql, [
      { name: 'id', type: TYPES.NVarChar, value: id }
    ]);
  }

  /**
   * Increment view count
   */
  async incrementViewCount(id: string): Promise<void> {
    const sql = 'UPDATE kpi_resources SET viewCount = viewCount + 1 WHERE id = @id';
    await this.executeQuery(sql, [
      { name: 'id', type: TYPES.NVarChar, value: id }
    ]);
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<any> {
    const sql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'ARCHIVED' THEN 1 ELSE 0 END) as archived,
        SUM(CASE WHEN approvalStatus = 'PENDING' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN approvalStatus = 'APPROVED' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN approvalStatus = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
        SUM(downloadCount) as totalDownloads,
        SUM(viewCount) as totalViews
      FROM kpi_resources
    `;

    const rows = await this.executeQuery(sql);
    return rows[0] || {};
  }

  /**
   * Map database row to KpiResource object
   */
  private mapRowToResource(row: any): KpiResource {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category as KpiResourceCategory,
      department: row.department,
      tags: row.tags ? JSON.parse(row.tags) : [],
      fileName: row.fileName,
      fileType: row.fileType,
      fileSize: row.fileSize,
      mimeType: row.mimeType,
      storageProvider: row.storageProvider,
      storageUrl: row.storageUrl,
      driveId: row.driveId,
      fileId: row.fileId,
      uploadedBy: row.uploadedBy,
      uploadedAt: row.uploadedAt?.toISOString() || new Date().toISOString(),
      updatedAt: row.updatedAt?.toISOString() || new Date().toISOString(),
      status: row.status as KpiResourceStatus,
      isPublic: !!row.isPublic,
      downloadCount: row.downloadCount || 0,
      viewCount: row.viewCount || 0,
      approvalStatus: row.approvalStatus as KpiResourceApprovalStatus,
      approvedBy: row.approvedBy,
      approvedAt: row.approvedAt?.toISOString(),
      rejectionReason: row.rejectionReason
    };
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const connection = await this.createConnection();
      connection.close();
      return {
        success: true,
        message: 'Successfully connected to OneLake SQL Endpoint'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`
      };
    }
  }
}

export const onelakeDbService = new OneLakeDbService();
