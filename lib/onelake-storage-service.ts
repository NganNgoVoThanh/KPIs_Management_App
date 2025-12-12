// lib/onelake-storage-service.ts
import { ClientSecretCredential } from '@azure/identity';
import axios from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables before creating singleton instance
dotenv.config();

/**
 * OneLake Storage Service
 * Handles file upload/download to Microsoft Fabric Lakehouse
 */
class OneLakeStorageService {
  private workspaceId: string;
  private lakehouseId: string;
  private credential: ClientSecretCredential | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.workspaceId = process.env.ONELAKE_WORKSPACE_ID || '';
    this.lakehouseId = process.env.ONELAKE_LAKEHOUSE_ID || '';

    if (process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET && process.env.AZURE_TENANT_ID) {
      this.credential = new ClientSecretCredential(
        process.env.AZURE_TENANT_ID,
        process.env.AZURE_CLIENT_ID,
        process.env.AZURE_CLIENT_SECRET
      );
    }
  }

  /**
   * Get access token for OneLake API
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.credential) {
      throw new Error('Azure credentials not configured');
    }

    try {
      // Get token for OneLake/Fabric API
      const tokenResponse = await this.credential.getToken(
        'https://storage.azure.com/.default'
      );

      this.accessToken = tokenResponse.token;
      // Set expiry 5 minutes before actual expiry
      this.tokenExpiry = tokenResponse.expiresOnTimestamp - (5 * 60 * 1000);

      return this.accessToken;
    } catch (error: any) {
      console.error('Failed to get access token:', error);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Upload file to OneLake Lakehouse
   * @param file File buffer
   * @param fileName Original file name
   * @param folder Folder path in lakehouse (e.g., 'kpi-resources')
   * @returns File path and download URL
   */
  async uploadFile(
    file: Buffer,
    fileName: string,
    folder: string = 'kpi-resources'
  ): Promise<{
    filePath: string;
    downloadUrl: string;
    fileId: string;
  }> {
    try {
      const token = await this.getAccessToken();

      // Generate unique file name with timestamp
      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueFileName = `${timestamp}_${sanitizedFileName}`;
      const filePath = `${folder}/${uniqueFileName}`;

      // OneLake API endpoint for file upload
      // Using OneLake REST API: https://learn.microsoft.com/en-us/fabric/onelake/onelake-access-api
      const uploadUrl = `https://onelake.dfs.fabric.microsoft.com/${this.workspaceId}/${this.lakehouseId}/Files/${filePath}`;

      // Upload file using PUT request
      const response = await axios.put(uploadUrl, file, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-ms-blob-type': 'BlockBlob',
          'Content-Type': 'application/octet-stream',
          'Content-Length': file.length.toString()
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });

      if (response.status !== 201 && response.status !== 200) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      // Generate download URL
      const downloadUrl = `https://onelake.dfs.fabric.microsoft.com/${this.workspaceId}/${this.lakehouseId}/Files/${filePath}`;

      return {
        filePath,
        downloadUrl,
        fileId: uniqueFileName
      };

    } catch (error: any) {
      console.error('OneLake upload error:', error.response?.data || error.message);
      throw new Error(`Failed to upload file to OneLake: ${error.message}`);
    }
  }

  /**
   * Download file from OneLake
   * @param filePath File path in lakehouse
   * @returns File buffer
   */
  async downloadFile(filePath: string): Promise<Buffer> {
    try {
      const token = await this.getAccessToken();

      const downloadUrl = `https://onelake.dfs.fabric.microsoft.com/${this.workspaceId}/${this.lakehouseId}/Files/${filePath}`;

      const response = await axios.get(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'arraybuffer'
      });

      return Buffer.from(response.data);

    } catch (error: any) {
      console.error('OneLake download error:', error.response?.data || error.message);
      throw new Error(`Failed to download file from OneLake: ${error.message}`);
    }
  }

  /**
   * Delete file from OneLake
   * @param filePath File path in lakehouse
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      const token = await this.getAccessToken();

      const deleteUrl = `https://onelake.dfs.fabric.microsoft.com/${this.workspaceId}/${this.lakehouseId}/Files/${filePath}`;

      await axios.delete(deleteUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

    } catch (error: any) {
      console.error('OneLake delete error:', error.response?.data || error.message);
      throw new Error(`Failed to delete file from OneLake: ${error.message}`);
    }
  }

  /**
   * Get file metadata
   * @param filePath File path in lakehouse
   */
  async getFileMetadata(filePath: string): Promise<{
    size: number;
    lastModified: Date;
    contentType: string;
  }> {
    try {
      const token = await this.getAccessToken();

      const url = `https://onelake.dfs.fabric.microsoft.com/${this.workspaceId}/${this.lakehouseId}/Files/${filePath}`;

      const response = await axios.head(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return {
        size: parseInt(response.headers['content-length'] || '0'),
        lastModified: new Date(response.headers['last-modified'] || Date.now()),
        contentType: response.headers['content-type'] || 'application/octet-stream'
      };

    } catch (error: any) {
      console.error('OneLake metadata error:', error.response?.data || error.message);
      throw new Error(`Failed to get file metadata from OneLake: ${error.message}`);
    }
  }

  /**
   * Generate signed download URL (valid for limited time)
   * For sharing files with users without auth
   */
  async generateDownloadUrl(filePath: string, expiryMinutes: number = 60): Promise<string> {
    // For OneLake, we'll generate a token-based URL
    // In production, you might want to use SAS tokens or custom signed URLs
    const token = await this.getAccessToken();

    // This is a simplified version - in production, implement proper SAS token generation
    const downloadUrl = `https://onelake.dfs.fabric.microsoft.com/${this.workspaceId}/${this.lakehouseId}/Files/${filePath}`;

    return downloadUrl;
  }

  /**
   * List files in a folder
   */
  async listFiles(folder: string = 'kpi-resources'): Promise<Array<{
    name: string;
    path: string;
    size: number;
    lastModified: Date;
  }>> {
    try {
      const token = await this.getAccessToken();

      const listUrl = `https://onelake.dfs.fabric.microsoft.com/${this.workspaceId}/${this.lakehouseId}/Files/${folder}?resource=directory`;

      const response = await axios.get(listUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Parse directory listing response
      // Note: This is a simplified version - actual OneLake API response format may vary
      const files = [];

      // You may need to adjust this based on actual OneLake API response format
      if (response.data && Array.isArray(response.data.paths)) {
        for (const item of response.data.paths) {
          if (!item.isDirectory) {
            files.push({
              name: item.name,
              path: `${folder}/${item.name}`,
              size: item.contentLength || 0,
              lastModified: new Date(item.lastModified || Date.now())
            });
          }
        }
      }

      return files;

    } catch (error: any) {
      console.error('OneLake list files error:', error.response?.data || error.message);
      // Return empty array if folder doesn't exist
      return [];
    }
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!(
      this.workspaceId &&
      this.lakehouseId &&
      this.credential &&
      process.env.AZURE_CLIENT_ID &&
      process.env.AZURE_CLIENT_SECRET &&
      process.env.AZURE_TENANT_ID
    );
  }

  /**
   * Test connection to OneLake
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          message: 'OneLake credentials not configured'
        };
      }

      // Try to get access token
      await this.getAccessToken();

      return {
        success: true,
        message: 'Successfully connected to OneLake'
      };

    } catch (error: any) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`
      };
    }
  }
}

export const onelakeStorageService = new OneLakeStorageService();
