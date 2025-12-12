// Fabric SQL Analytics Endpoint client using REST API
// This works with Service Principal authentication
import { ClientSecretCredential } from '@azure/identity'

interface FabricSQLClientConfig {
  workspaceId: string
  datasetId?: string // SQL endpoint dataset ID
  tenantId: string
  clientId: string
  clientSecret: string
}

export class FabricSQLClient {
  private credential: ClientSecretCredential
  private workspaceId: string
  private datasetId?: string
  private accessToken?: string
  private tokenExpiry?: number

  constructor(config: FabricSQLClientConfig) {
    this.credential = new ClientSecretCredential(
      config.tenantId,
      config.clientId,
      config.clientSecret
    )
    this.workspaceId = config.workspaceId
    this.datasetId = config.datasetId
  }

  private async getAccessToken(): Promise<string> {
    // Reuse token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry - 60000) {
      return this.accessToken
    }

    const tokenResponse = await this.credential.getToken([
      'https://analysis.windows.net/powerbi/api/.default'
    ])

    this.accessToken = tokenResponse.token
    this.tokenExpiry = tokenResponse.expiresOnTimestamp

    return this.accessToken
  }

  async executeQuery(query: string): Promise<any> {
    const token = await this.getAccessToken()

    if (!this.datasetId) {
      throw new Error('Dataset ID is required for query execution')
    }

    // Use Power BI REST API to execute DAX/SQL query
    const response = await fetch(
      `https://api.powerbi.com/v1.0/myorg/groups/${this.workspaceId}/datasets/${this.datasetId}/executeQueries`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          queries: [{
            query: query
          }],
          serializerSettings: {
            includeNulls: true
          }
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Query execution failed: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    return result
  }

  async listTables(): Promise<string[]> {
    const token = await this.getAccessToken()

    // Get lakehouse items
    const response = await fetch(
      `https://api.fabric.microsoft.com/v1/workspaces/${this.workspaceId}/items?type=SQLEndpoint`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`List items failed: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    return result.value || []
  }

  async testConnection(): Promise<boolean> {
    try {
      const token = await this.getAccessToken()

      // Test workspace access
      const response = await fetch(
        `https://api.fabric.microsoft.com/v1/workspaces/${this.workspaceId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      return response.ok
    } catch (error) {
      return false
    }
  }
}

// Factory function for easy creation
export function createFabricSQLClient(
  workspaceId: string,
  tenantId: string,
  clientId: string,
  clientSecret: string,
  datasetId?: string
): FabricSQLClient {
  return new FabricSQLClient({
    workspaceId,
    datasetId,
    tenantId,
    clientId,
    clientSecret
  })
}
