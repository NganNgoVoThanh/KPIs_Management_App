// lib/onelake-storage-service.ts
import { ClientSecretCredential } from '@azure/identity';

/**
 * OneLake Storage Service
 * Manages file storage in Microsoft Fabric OneLake
 */
class OneLakeStorageService {
  private credential: ClientSecretCredential | null = null;
  private workspaceId: string;
  private lakehouseId: string;
  private baseUrl: string;

  constructor() {
    this.workspaceId = process.env.ONELAKE_WORKSPACE_ID || '';
    this.lakehouseId = process.env.ONELAKE_LAKEHOUSE_ID || '';
    this.baseUrl = `https://onelake.dfs.fabric.microsoft.com/${this.workspaceId}/${this.lakehouseId}`;

    if (this.isConfigured()) {
      this.credential = new ClientSecretCredential(
        process.env.AZURE_TENANT_ID || '',
        process.env.AZURE_CLIENT_ID || '',
        process.env.AZURE_CLIENT_SECRET || ''
      );
    }
  }

  /**
   * Check if OneLake is configured
   */
  isConfigured(): boolean {
    return !!(
      process.env.ONELAKE_WORKSPACE_ID &&
      process.env.ONELAKE_LAKEHOUSE_ID &&
      process.env.AZURE_TENANT_ID &&
      process.env.AZURE_CLIENT_ID &&
      process.env.AZURE_CLIENT_SECRET
    );
  }

  /**
   * Get access token for OneLake
   */
  private async getAccessToken(): Promise<string> {
    if (!this.credential) {
      throw new Error('OneLake not configured');
    }

    const token = await this.credential.getToken('https://storage.azure.com/.default');
    return token.token;
  }

  /**
   * Test connection to OneLake
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured()) {
      return { success: false, message: 'OneLake is not configured' };
    }

    try {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/Files?resource=filesystem`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-ms-version': '2021-06-08'
        }
      });

      if (response.ok) {
        return { success: true, message: 'Connected to OneLake storage' };
      } else {
        const error = await response.text();
        return { success: false, message: `Connection failed: ${error}` };
      }
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Upload a file to OneLake
   */
  async uploadFile(
    filePath: string,
    fileBuffer: Buffer,
    contentType: string
  ): Promise<{ success: boolean; path?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'OneLake is not configured' };
    }

    try {
      const token = await this.getAccessToken();
      const fullPath = `${this.baseUrl}/Files/${filePath}`;

      // Create file
      const createResponse = await fetch(`${fullPath}?resource=file`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-ms-version': '2021-06-08',
          'Content-Length': '0'
        }
      });

      if (!createResponse.ok) {
        const error = await createResponse.text();
        return { success: false, error: `Failed to create file: ${error}` };
      }

      // Upload content
      const uploadResponse = await fetch(`${fullPath}?action=append&position=0`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-ms-version': '2021-06-08',
          'Content-Type': contentType,
          'Content-Length': fileBuffer.length.toString()
        },
        body: fileBuffer
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.text();
        return { success: false, error: `Failed to upload content: ${error}` };
      }

      // Flush (finalize) the file
      const flushResponse = await fetch(`${fullPath}?action=flush&position=${fileBuffer.length}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-ms-version': '2021-06-08'
        }
      });

      if (!flushResponse.ok) {
        const error = await flushResponse.text();
        return { success: false, error: `Failed to flush file: ${error}` };
      }

      return { success: true, path: filePath };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Download a file from OneLake
   */
  async downloadFile(filePath: string): Promise<{ success: boolean; data?: Buffer; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'OneLake is not configured' };
    }

    try {
      const token = await this.getAccessToken();
      const fullPath = `${this.baseUrl}/Files/${filePath}`;

      const response = await fetch(fullPath, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-ms-version': '2021-06-08'
        }
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Failed to download file: ${error}` };
      }

      const arrayBuffer = await response.arrayBuffer();
      return { success: true, data: Buffer.from(arrayBuffer) };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a file from OneLake
   */
  async deleteFile(filePath: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'OneLake is not configured' };
    }

    try {
      const token = await this.getAccessToken();
      const fullPath = `${this.baseUrl}/Files/${filePath}`;

      const response = await fetch(fullPath, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-ms-version': '2021-06-08'
        }
      });

      if (!response.ok && response.status !== 404) {
        const error = await response.text();
        return { success: false, error: `Failed to delete file: ${error}` };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(directory: string = ''): Promise<{ success: boolean; files?: string[]; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'OneLake is not configured' };
    }

    try {
      const token = await this.getAccessToken();
      const path = directory ? `/Files/${directory}` : '/Files';
      const url = `${this.baseUrl}${path}?resource=filesystem&recursive=false`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-ms-version': '2021-06-08'
        }
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Failed to list files: ${error}` };
      }

      const data = await response.json();
      const files = data.paths?.map((p: any) => p.name) || [];
      return { success: true, files };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate a pre-signed URL for file access
   */
  getFileUrl(filePath: string): string {
    return `${this.baseUrl}/Files/${filePath}`;
  }
}

export const onelakeStorageService = new OneLakeStorageService();
