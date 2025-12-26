# Azure Deployment Script for AmPac Brain Service
# Deploys apps/brain to Azure Container Apps

$RG_NAME = "rg-ampac-prod"
$LOCATION = "eastus2"
$ACR_NAME = "acrampacprod" + (Get-Random -Minimum 1000 -Maximum 9999) # Unique name
$ACA_ENV = "env-ampac-prod"
$API_APP_NAME = "app-brain-api"

# 1. Login Check
Write-Host "Checking Azure Login..." -ForegroundColor Cyan
$account = az account show 2>$null
if (-not $account) {
    Write-Error "Please run 'az login' first."
    exit 1
}

# 2. Resource Group
Write-Host "Creating Resource Group '$RG_NAME'..." -ForegroundColor Cyan
az group create --name $RG_NAME --location $LOCATION -o table

# 3. Container Registry
# Check if we have a saved ACR name from previous runs, otherwise create new
# For simplicity in this script, we'll try to find an existing one in the RG or create one
$existingAcr = az acr list --resource-group $RG_NAME --query "[0].name" -o tsv
if ($existingAcr) {
    $ACR_NAME = $existingAcr
    Write-Host "Using existing ACR: $ACR_NAME" -ForegroundColor Green
}
else {
    Write-Host "Creating Container Registry '$ACR_NAME'..." -ForegroundColor Cyan
    az acr create --resource-group $RG_NAME --name $ACR_NAME --sku Basic --admin-enabled true -o table
}

# 4. Build & Push Image (Local Docker)
Write-Host "Building and Pushing Docker Image (Local)..." -ForegroundColor Cyan
$IMAGE_TAG = "$ACR_NAME.azurecr.io/brain-service:latest"

# Login to ACR
az acr login --name $ACR_NAME

# Navigate to project root context
Push-Location "$PSScriptRoot/.."
# Build
docker build -t $IMAGE_TAG ./apps/brain
# Push
docker push $IMAGE_TAG
Pop-Location

# 5. Container Apps Environment
Write-Host "Creating Container Apps Environment..." -ForegroundColor Cyan
az containerapp env create --name $ACA_ENV --resource-group $RG_NAME --location $LOCATION -o table

# 6. Deploy Container App
Write-Host "Deploying Container App..." -ForegroundColor Cyan
# Get ACR Credentials
$acrPass = az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv

az containerapp create `
    --name $API_APP_NAME `
    --resource-group $RG_NAME `
    --environment $ACA_ENV `
    --image $IMAGE_TAG `
    --target-port 8000 `
    --ingress external `
    --registry-server "$ACR_NAME.azurecr.io" `
    --registry-username $ACR_NAME `
    --registry-password $acrPass `
    --query properties.configuration.ingress.fqdn `
    -o tsv

Write-Host "Deployment Complete!" -ForegroundColor Green
$url = az containerapp show --name $API_APP_NAME --resource-group $RG_NAME --query properties.configuration.ingress.fqdn -o tsv
Write-Host "API URL: https://$url" -ForegroundColor Yellow
Write-Host "Please update your apps/mobile/src/config.ts with this URL."
