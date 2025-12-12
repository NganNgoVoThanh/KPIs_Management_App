# Azure Function Proxy for OneLake

This Azure Function acts as a proxy between your KPI Management App and Microsoft Fabric OneLake SQL Endpoint, using Managed Identity for authentication.

## 🎯 Why This Solution?

- **Bypasses Service Principal limitations** with OneLake SQL endpoints
- **Cost-effective**: ~$5-10/month vs $380/month for direct OneLake access
- **Better security**: No credentials in app code
- **Scalable**: Auto-scales with Azure Functions

## 📋 Architecture

```
App (Next.js) → Azure Function (Managed Identity) → OneLake SQL Endpoint
```

## 🚀 Quick Deploy

### Prerequisites

1. Azure CLI installed
2. Node.js 18+ installed
3. Azure Functions Core Tools installed:
   ```bash
   npm install -g azure-functions-core-tools@4
   ```

### Deployment Steps

1. **Navigate to azure-function directory:**
   ```bash
   cd azure-function
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run deployment script:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh [resource-group] [function-name] [location]
   ```

   Example:
   ```bash
   ./deploy.sh kpi-rg kpi-onelake-proxy eastus
   ```

4. **Follow prompts** to enter OneLake configuration

5. **Copy the output** and add to your app's `.env` file:
   ```env
   DB_TYPE="azure-function"
   AZURE_FUNCTION_URL="https://your-function.azurewebsites.net"
   AZURE_FUNCTION_KEY="your-function-key"
   ```

### Grant Fabric Access

After deployment, you need to grant the Managed Identity access to Fabric:

1. Copy the **Principal ID** from deployment output

2. Go to https://app.fabric.microsoft.com/

3. Navigate to your workspace

4. Click **Manage access**

5. Click **Add people or groups**

6. Paste the Principal ID

7. Set role to **Member** or **Admin**

8. Click **Add**

## 🧪 Testing

### Test locally (optional):

1. Install Azurite (Azure Storage Emulator):
   ```bash
   npm install -g azurite
   ```

2. Start Azurite:
   ```bash
   azurite
   ```

3. Update `local.settings.json` with your OneLake config

4. Start function locally:
   ```bash
   npm run start
   ```

5. Test endpoints:
   ```bash
   # Health check
   curl http://localhost:7071/api/health

   # Query
   curl -X POST http://localhost:7071/api/query \
     -H "Content-Type: application/json" \
     -d '{"query":"SELECT 1 AS test"}'
   ```

### Test deployed function:

```bash
# Health check
curl https://your-function.azurewebsites.net/api/health

# Query with function key
curl -X POST https://your-function.azurewebsites.net/api/query \
  -H "Content-Type: application/json" \
  -H "x-functions-key: your-function-key" \
  -d '{"query":"SELECT * FROM users WHERE email = @email","params":{"email":"test@example.com"}}'
```

## 📊 Available Endpoints

### GET /api/health
Health check endpoint (anonymous access)

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T...",
  "connection": {
    "isConnected": true,
    "server": "...",
    "database": "...",
    "poolSize": 2
  }
}
```

### POST /api/query
Execute SELECT queries

**Request:**
```json
{
  "query": "SELECT * FROM users WHERE email = @email",
  "params": {
    "email": "user@example.com"
  },
  "timeout": 30000
}
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "rowCount": 1,
  "executionTime": 125
}
```

### POST /api/execute
Execute INSERT/UPDATE/DELETE commands

**Request:**
```json
{
  "query": "UPDATE users SET status = @status WHERE id = @id",
  "params": {
    "id": "user-123",
    "status": "ACTIVE"
  }
}
```

**Response:**
```json
{
  "success": true,
  "rowsAffected": 1,
  "executionTime": 89
}
```

## 🔧 Configuration

### Environment Variables

Set in Azure Portal → Function App → Configuration:

| Variable | Description | Required |
|----------|-------------|----------|
| ONELAKE_SERVER | SQL endpoint server | ✅ |
| ONELAKE_DATABASE | Database name | ✅ |
| ONELAKE_WORKSPACE_ID | Fabric workspace ID | ✅ |
| ONELAKE_LAKEHOUSE_ID | Lakehouse ID | ✅ |

### Connection Pooling

Configured in `src/lib/connection.ts`:
- Min connections: 2
- Max connections: 10
- Idle timeout: 30 seconds

## 📈 Monitoring

### View logs:

```bash
# Stream logs
az webapp log tail \
  --name kpi-onelake-proxy \
  --resource-group kpi-rg
```

### In Azure Portal:

1. Go to Function App
2. Click **Monitor** → **Logs**
3. View real-time execution logs

## 💰 Cost Estimation

### Consumption Plan:
- First 1M executions: FREE
- After: $0.20 per million executions
- Memory: $0.000016/GB-s

### Example for small app:
- 10,000 requests/month
- Avg 200ms execution
- Avg 128MB memory
- **Cost: ~$0.50/month** (practically free)

### Premium Plan (optional for production):
- EP1: ~$148/month
- Better performance
- VNet integration
- Longer timeout

## 🔒 Security

### Function Keys:
- Never commit function keys to git
- Store in Azure Key Vault for production
- Rotate keys regularly

### Managed Identity:
- No credentials to manage
- Automatic token rotation
- Scoped permissions

### Network Security:
- Can add IP restrictions
- VNet integration (Premium plan)
- API Management in front

## 🐛 Troubleshooting

### Connection fails:
1. Check Managed Identity is added to Fabric workspace
2. Verify OneLake configuration in app settings
3. Check function logs for errors

### Timeout errors:
1. Increase timeout in function call
2. Optimize query
3. Consider Premium plan for longer timeout

### Authentication errors:
1. Verify Managed Identity is enabled
2. Check Fabric permissions
3. Try re-assigning identity

## 📝 Update/Redeploy

```bash
# Make changes to code
# ...

# Build
npm run build

# Deploy
func azure functionapp publish kpi-onelake-proxy
```

## 🗑️ Cleanup

To delete all resources:

```bash
az group delete --name kpi-rg --yes --no-wait
```

## 📚 Further Reading

- [Azure Functions Documentation](https://docs.microsoft.com/azure/azure-functions/)
- [Managed Identity Documentation](https://docs.microsoft.com/azure/active-directory/managed-identities-azure-resources/)
- [Microsoft Fabric Documentation](https://docs.microsoft.com/fabric/)

## 🆘 Support

If you encounter issues:

1. Check function logs
2. Test health endpoint
3. Verify Managed Identity permissions
4. Review deployment output

---

**Generated by Claude Code**
