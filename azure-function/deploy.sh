#!/bin/bash
# Deploy Azure Function for OneLake Proxy
# Usage: ./deploy.sh [resource-group] [function-name] [location]

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Azure Function Deployment Script${NC}\n"

# Parameters
RESOURCE_GROUP=${1:-"kpi-rg"}
FUNCTION_NAME=${2:-"kpi-onelake-proxy"}
LOCATION=${3:-"eastus"}
STORAGE_NAME="${FUNCTION_NAME}storage"

echo -e "${BLUE}📋 Configuration:${NC}"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Function Name: $FUNCTION_NAME"
echo "  Location: $LOCATION"
echo "  Storage Account: $STORAGE_NAME"
echo ""

# Check if logged in to Azure
echo -e "${BLUE}🔐 Checking Azure login...${NC}"
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Azure. Running az login...${NC}"
    az login
fi

SUBSCRIPTION=$(az account show --query name -o tsv)
echo -e "${GREEN}✅ Logged in to: $SUBSCRIPTION${NC}\n"

# Create resource group
echo -e "${BLUE}📦 Creating resource group...${NC}"
az group create \
    --name $RESOURCE_GROUP \
    --location $LOCATION \
    --output none

echo -e "${GREEN}✅ Resource group created${NC}\n"

# Create storage account
echo -e "${BLUE}💾 Creating storage account...${NC}"
az storage account create \
    --name $STORAGE_NAME \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --sku Standard_LRS \
    --output none

echo -e "${GREEN}✅ Storage account created${NC}\n"

# Create Function App
echo -e "${BLUE}⚡ Creating Function App...${NC}"
az functionapp create \
    --name $FUNCTION_NAME \
    --resource-group $RESOURCE_GROUP \
    --consumption-plan-location $LOCATION \
    --runtime node \
    --runtime-version 18 \
    --functions-version 4 \
    --storage-account $STORAGE_NAME \
    --output none

echo -e "${GREEN}✅ Function App created${NC}\n"

# Enable Managed Identity
echo -e "${BLUE}🔑 Enabling Managed Identity...${NC}"
IDENTITY_RESULT=$(az functionapp identity assign \
    --name $FUNCTION_NAME \
    --resource-group $RESOURCE_GROUP)

PRINCIPAL_ID=$(echo $IDENTITY_RESULT | jq -r .principalId)
echo -e "${GREEN}✅ Managed Identity enabled${NC}"
echo -e "${YELLOW}📝 Principal ID: $PRINCIPAL_ID${NC}\n"

# Configure App Settings
echo -e "${BLUE}⚙️  Configuring app settings...${NC}"

# Prompt for OneLake configuration
read -p "Enter ONELAKE_SERVER: " ONELAKE_SERVER
read -p "Enter ONELAKE_DATABASE: " ONELAKE_DATABASE
read -p "Enter ONELAKE_WORKSPACE_ID: " ONELAKE_WORKSPACE_ID
read -p "Enter ONELAKE_LAKEHOUSE_ID: " ONELAKE_LAKEHOUSE_ID

az functionapp config appsettings set \
    --name $FUNCTION_NAME \
    --resource-group $RESOURCE_GROUP \
    --settings \
        "ONELAKE_SERVER=$ONELAKE_SERVER" \
        "ONELAKE_DATABASE=$ONELAKE_DATABASE" \
        "ONELAKE_WORKSPACE_ID=$ONELAKE_WORKSPACE_ID" \
        "ONELAKE_LAKEHOUSE_ID=$ONELAKE_LAKEHOUSE_ID" \
    --output none

echo -e "${GREEN}✅ App settings configured${NC}\n"

# Build and deploy
echo -e "${BLUE}📦 Building function...${NC}"
npm install
npm run build

echo -e "${GREEN}✅ Build completed${NC}\n"

echo -e "${BLUE}🚀 Deploying to Azure...${NC}"
func azure functionapp publish $FUNCTION_NAME

echo -e "${GREEN}✅ Deployment completed!${NC}\n"

# Get function URL and key
echo -e "${BLUE}🔑 Getting function keys...${NC}"
FUNCTION_KEY=$(az functionapp keys list \
    --name $FUNCTION_NAME \
    --resource-group $RESOURCE_GROUP \
    --query "functionKeys.default" -o tsv)

FUNCTION_URL="https://${FUNCTION_NAME}.azurewebsites.net"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Deployment Successful!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📋 Configuration for your app .env file:${NC}"
echo ""
echo -e "${YELLOW}AZURE_FUNCTION_URL=\"$FUNCTION_URL\"${NC}"
echo -e "${YELLOW}AZURE_FUNCTION_KEY=\"$FUNCTION_KEY\"${NC}"
echo -e "${YELLOW}DB_TYPE=\"azure-function\"${NC}"
echo ""
echo -e "${BLUE}📋 Managed Identity Principal ID:${NC}"
echo -e "${YELLOW}$PRINCIPAL_ID${NC}"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo "1. Add the Principal ID to your Fabric Workspace with 'Member' role"
echo "2. Add the environment variables above to your app's .env file"
echo "3. Restart your app"
echo "4. Test connection: npm run dev"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
