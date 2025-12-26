# Deploy Brain Service to Google Cloud Run
# Usage: .\deploy_brain.ps1

$ErrorActionPreference = "Stop"

Write-Host "🧠 AmPac Brain Deployment Helper" -ForegroundColor Cyan
Write-Host "--------------------------------"

# 1. Check for Google Cloud SDK
if (-not (Get-Command "gcloud" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Google Cloud SDK (gcloud) is not installed or not in your PATH." -ForegroundColor Red
    Write-Host "To deploy manually, you MUST install the Google Cloud CLI." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "I am opening the download page for you..." -ForegroundColor Green
    Start-Process "https://cloud.google.com/sdk/docs/install"
    
    Write-Host ""
    Write-Host "ACTION REQUIRED:" -ForegroundColor Yellow
    Write-Host "1. Download and install the SDK."
    Write-Host "2. Check the box 'Add to System Path' during installation."
    Write-Host "3. Restart your terminal (close VS Code and reopen)."
    Write-Host "4. Run 'gcloud init' to log in."
    Write-Host "5. Run this script again."
    exit 1
}

# 2. Configuration
$PROJECT_ID = "ampac-a325f" # Change this if your project ID is different
$REGION = "us-central1"
$SERVICE_NAME = "ampac-brain"

Write-Host "✅ gcloud found. Proceeding with deployment..." -ForegroundColor Green
Write-Host "Target Project: $PROJECT_ID"
Write-Host "Target Region: $REGION"

# 3. Enable Services (Idempotent)
Write-Host "Enabling required Google Cloud services..."
gcloud services enable artifactregistry.googleapis.com run.googleapis.com --project $PROJECT_ID

# 4. Deploy
Write-Host "Deploying to Cloud Run..."
# Note: We use --source . to build from source (requires Cloud Build API enabled)
gcloud run deploy $SERVICE_NAME `
    --source . `
    --region $REGION `
    --project $PROJECT_ID `
    --allow-unauthenticated `
    --set-env-vars "VENTURES_MOCK_MODE=True"

Write-Host "🚀 Deployment Complete!" -ForegroundColor Green
