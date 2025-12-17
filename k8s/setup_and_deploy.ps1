# AmPac Kubernetes Setup & Deploy Script

$PROJECT_ID = "ampac-a325f"
$CLUSTER_NAME = "brain-cluster"
$ZONE = "us-central1-a"
$REGION = "us-central1"

Write-Host "🚀 Starting AmPac Kubernetes Setup..." -ForegroundColor Cyan

# 1. Configure Project
Write-Host "1. Configuring Google Cloud Project..."
gcloud config set project $PROJECT_ID

# 2. Check if Cluster Exists
$cluster = gcloud container clusters list --filter="name=$CLUSTER_NAME" --format="value(name)"
if ($cluster) {
    Write-Host "✅ Cluster '$CLUSTER_NAME' already exists." -ForegroundColor Green
} else {
    Write-Host "⚠️ Cluster not found. Creating '$CLUSTER_NAME' (this may take 5-10 minutes)..." -ForegroundColor Yellow
    # Create a small standard cluster (Autopilot is easier but let's stick to standard for control)
    gcloud container clusters create $CLUSTER_NAME `
        --zone $ZONE `
        --num-nodes 1 `
        --machine-type e2-medium `
        --disk-size 50GB `
        --enable-autoscaling --min-nodes 1 --max-nodes 3
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to create cluster."
        exit 1
    }
    Write-Host "✅ Cluster created successfully." -ForegroundColor Green
}

# 3. Get Credentials
Write-Host "3. Getting Cluster Credentials..."
gcloud container clusters get-credentials $CLUSTER_NAME --zone $ZONE

# 4. Create Secrets (if not exist)
Write-Host "4. Configuring Secrets..."
$secrets = kubectl get secret brain-secrets --ignore-not-found
if (-not $secrets) {
    Write-Host "   Creating 'brain-secrets' placeholder. PLEASE UPDATE WITH REAL KEYS!" -ForegroundColor Yellow
    kubectl create secret generic brain-secrets `
        --from-literal=openai-api-key="REPLACE_WITH_REAL_KEY" `
        --from-literal=teams-webhook-url="REPLACE_WITH_REAL_WEBHOOK" `
        --from-literal=firebase-credentials="{}"
} else {
    Write-Host "   'brain-secrets' already exists."
}

# 5. Deploy
Write-Host "5. Deploying Application..."
kubectl apply -f brain-deployment.yaml
kubectl apply -f brain-worker.yaml
kubectl apply -f brain-hpa.yaml
kubectl apply -f brain-pdb.yaml
kubectl apply -f ingress.yaml

Write-Host "🎉 Deployment Complete!" -ForegroundColor Cyan
Write-Host "Monitor status with: kubectl get pods"
Write-Host "Get Ingress IP with: kubectl get ingress"
