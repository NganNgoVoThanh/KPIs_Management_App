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
   * Test database connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      const connection = new Connection(this.config);

      connection.on('connect', (err) => {
        if (err) {
          resolve({ success: false, message: err.message });
        } else {
          resolve({ success: true, message: 'Connected to OneLake SQL endpoint' });
          connection.close();
        }
      });

      connection.on('error', (err) => {
        resolve({ success: false, message: err.message });
      });

      connection.connect();
    });
  }

  /**
   * Initialize the kpi_resources table
   */
  async initializeTable(): Promise<void> {
    const sql = `
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'kpi_resources')
      BEGIN
        CREATE TABLE kpi_resources (
          id NVARCHAR(50) PRIMARY KEY,
          title NVARCHAR(500) NOT NULL,
          description NVARCHAR(MAX),
          category NVARCHAR(50) NOT NULL,
          subcategory NVARCHAR(100),
          department NVARCHAR(100),
          file_path NVARCHAR(1000),
          file_name NVARCHAR(500),
          file_type NVARCHAR(50),
          file_size BIGINT,
          external_url NVARCHAR(2000),
          thumbnail_path NVARCHAR(1000),
          tags NVARCHAR(MAX),
          status NVARCHAR(20) DEFAULT 'ACTIVE',
          approval_status NVARCHAR(20) DEFAULT 'PENDING',
          is_public BIT DEFAULT 0,
          version INT DEFAULT 1,
          download_count INT DEFAULT 0,
          view_count INT DEFAULT 0,
          uploaded_by NVARCHAR(50),
          approved_by NVARCHAR(50),
          approved_at DATETIME2,
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE()
        )
      END
    `;

    await this.executeQuery(sql);
  }

  /**
   * Execute a SQL query
   */
  private executeQuery(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const connection = new Connection(this.config);
      const results: any[] = [];

      connection.on('connect', (err) => {
        if (err) {
          reject(err);
          return;
        }

        const request = new Request(sql, (err, rowCount, rows) => {
          connection.close();
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        });

        request.on('row', (columns: any[]) => {
          const row: any = {};
          columns.forEach((column: any) => {
            row[column.metadata.colName] = column.value;
          });
          results.push(row);
        });

        connection.execSql(request);
      });

      connection.on('error', (err) => {
        reject(err);
      });

      connection.connect();
    });
  }

  /**
   * Get all KPI resources with optional filters
   */
  async getResources(filters?: {
    category?: string;
    department?: string;
    status?: string;
    approvalStatus?: string;
    isPublic?: boolean;
  }): Promise<KpiResource[]> {
    let sql = 'SELECT * FROM kpi_resources WHERE 1=1';

    if (filters?.category) {
      sql += ` AND category = '${filters.category}'`;
    }
    if (filters?.department) {
      sql += ` AND department = '${filters.department}'`;
    }
    if (filters?.status) {
      sql += ` AND status = '${filters.status}'`;
    }
    if (filters?.approvalStatus) {
      sql += ` AND approval_status = '${filters.approvalStatus}'`;
    }
    if (filters?.isPublic !== undefined) {
      sql += ` AND is_public = ${filters.isPublic ? 1 : 0}`;
    }

    sql += ' ORDER BY created_at DESC';

    const rows = await this.executeQuery(sql);
    return rows.map(this.mapRowToResource);
  }

  /**
   * Get a single resource by ID
   */
  async getResourceById(id: string): Promise<KpiResource | null> {
    const sql = `SELECT * FROM kpi_resources WHERE id = '${id}'`;
    const rows = await this.executeQuery(sql);
    return rows.length > 0 ? this.mapRowToResource(rows[0]) : null;
  }

  /**
   * Create a new resource
   */
  async createResource(resource: Partial<KpiResource>): Promise<KpiResource> {
    const id = resource.id || `res_${Date.now()}`;
    const sql = `
      INSERT INTO kpi_resources (
        id, title, description, category, subcategory, department,
        file_path, file_name, file_type, file_size, external_url,
        tags, status, approval_status, is_public, uploaded_by
      ) VALUES (
        '${id}',
        '${resource.title || ''}',
        '${resource.description || ''}',
        '${resource.category || 'OTHER'}',
        '${resource.subcategory || ''}',
        '${resource.department || ''}',
        '${resource.filePath || ''}',
        '${resource.fileName || ''}',
        '${resource.fileType || ''}',
        ${resource.fileSize || 0},
        '${resource.externalUrl || ''}',
        '${JSON.stringify(resource.tags || [])}',
        '${resource.status || 'ACTIVE'}',
        '${resource.approvalStatus || 'PENDING'}',
        ${resource.isPublic ? 1 : 0},
        '${resource.uploadedBy || ''}'
      )
    `;

    await this.executeQuery(sql);
    return this.getResourceById(id) as Promise<KpiResource>;
  }

  /**
   * Update a resource
   */
  async updateResource(id: string, updates: Partial<KpiResource>): Promise<KpiResource | null> {
    const setParts: string[] = [];

    if (updates.title) setParts.push(`title = '${updates.title}'`);
    if (updates.description) setParts.push(`description = '${updates.description}'`);
    if (updates.category) setParts.push(`category = '${updates.category}'`);
    if (updates.status) setParts.push(`status = '${updates.status}'`);
    if (updates.approvalStatus) setParts.push(`approval_status = '${updates.approvalStatus}'`);
    if (updates.isPublic !== undefined) setParts.push(`is_public = ${updates.isPublic ? 1 : 0}`);

    setParts.push('updated_at = GETDATE()');

    const sql = `UPDATE kpi_resources SET ${setParts.join(', ')} WHERE id = '${id}'`;
    await this.executeQuery(sql);

    return this.getResourceById(id);
  }

  /**
   * Delete a resource
   */
  async deleteResource(id: string): Promise<boolean> {
    const sql = `DELETE FROM kpi_resources WHERE id = '${id}'`;
    await this.executeQuery(sql);
    return true;
  }

  /**
   * Map database row to KpiResource type
   */
  private mapRowToResource(row: any): KpiResource {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category as KpiResourceCategory,
      subcategory: row.subcategory,
      department: row.department,
      filePath: row.file_path,
      fileName: row.file_name,
      fileType: row.file_type,
      fileSize: row.file_size,
      externalUrl: row.external_url,
      thumbnailPath: row.thumbnail_path,
      tags: row.tags ? JSON.parse(row.tags) : [],
      status: row.status as KpiResourceStatus,
      approvalStatus: row.approval_status as KpiResourceApprovalStatus,
      isPublic: row.is_public === 1,
      version: row.version,
      downloadCount: row.download_count,
      viewCount: row.view_count,
      uploadedBy: row.uploaded_by,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at ? new Date(row.approved_at).toISOString() : undefined,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString()
    };
  }
}

export const onelakeDbService = new OneLakeDbService();
