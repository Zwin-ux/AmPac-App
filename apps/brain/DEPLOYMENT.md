# Deployment Guide

## Prerequisites
- Docker installed locally or on your build server.
- Access to a container registry (e.g., Docker Hub, Google Container Registry, Azure CR).
- Microsoft Azure Portal access for Graph API credentials.

## Configuration
1. **Environment Variables**:
   Copy `.env.example` to `.env` (for local) or configure these in your cloud provider's secret manager.
   ```bash
   cp .env.example .env
   ```

2. **Microsoft Graph Setup**:
   - Go to [Azure Portal](https://portal.azure.com).
   - Navigate to **Azure Active Directory** > **App registrations**.
   - Create a new registration for "AmPac Brain".
   - Under **Certificates & secrets**, create a new client secret.
   - Copy the `Application (client) ID`, `Directory (tenant) ID`, and the `Client Secret` value.
   - Update your `.env` file:
     ```
     AZURE_TENANT_ID=<your-tenant-id>
     AZURE_CLIENT_ID=<your-client-id>
     AZURE_CLIENT_SECRET=<your-client-secret>
     ```
   - Under **API Permissions**, add `Calendars.ReadWrite` and `User.Read.All` (Application permissions if running as daemon, or Delegated if acting as user). Grant admin consent.

## Deployment

### Using Docker
1. **Build the image**:
   ```bash
   docker build -t ampac-brain .
   ```

2. **Run the container**:
   ```bash
   docker run -p 8000:8000 --env-file .env ampac-brain
   ```

### Google Cloud Run (Serverless)
1.  **Install Google Cloud SDK**:
    *   Download and install from: https://cloud.google.com/sdk/docs/install
    *   Run `gcloud init` to log in and select your project (`ampac-a325f`).

2.  **Enable Services**:
    ```bash
    gcloud services enable artifactregistry.googleapis.com run.googleapis.com
    ```

3.  **Deploy**:
    ```bash
    gcloud run deploy ampac-brain \
      --source . \
      --region us-central1 \
      --allow-unauthenticated \
      --set-env-vars "AZURE_TENANT_ID=...,AZURE_CLIENT_ID=..."
    ```
4. **Mobile picks it up automatically**: The mobile app reads `API_URL` from `apps/mobile/src/config.ts` (currently pointing at the Cloud Run URL). Once this service is redeployed, the next mobile session will use the new Brain endpoints without further changes.

### Manual Deployment (e.g., VM/VPS)
1. Install Python 3.11+.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run with Uvicorn:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
   ```

## Mobile App Configuration
- Ensure the mobile app points to the production URL of this backend.
- Update `apps/mobile/src/services/network.ts` or similar config to use the production domain instead of `localhost`.

## Demo Data (Ventures Mock)
- The Ventures mock now persists its state to `apps/brain/data/ventures_mock_state.json`. Updates you make during a demo (marking conditions received, changing statuses) will survive a restart.
- To reset to the default demo dataset, delete that file and restart the Brain service; it will re-seed loans and conditions automatically.

---

# Production Rollout Plan (Brain + Mobile + Console)

This is the minimal, high-confidence path to take the stack live for consumers.

## 1) Environments & Secrets
- Create two environments: **staging** and **prod** (Cloud Run + Firebase projects).
- Move all secrets to a managed store (GCP Secret Manager). Remove local `.env` reliance in CI.
- Use per-env service accounts with least privilege (Brain runtime, CI deployer, Firebase Admin).

## 2) Brain (Cloud Run)
- Build & deploy:
  ```bash
  gcloud builds submit --tag gcr.io/$PROJECT_ID/ampac-brain
  gcloud run deploy ampac-brain \
    --image gcr.io/$PROJECT_ID/ampac-brain \
    --region us-central1 \
    --allow-unauthenticated \
    --set-secrets AZURE_TENANT_ID=azure-tenant:latest,AZURE_CLIENT_ID=azure-client:latest,AZURE_CLIENT_SECRET=azure-secret:latest \
    --set-secrets OPENAI_API_KEY=openai-key:latest,FIREBASE_CREDENTIALS_PATH=firebase-admin:latest \
    --set-env-vars VENTURES_MOCK_MODE=true,USE_FAKE_SYNC=false
  ```
- Networking: attach custom domain + managed TLS; restrict CORS to mobile/console origins; enable Cloud Armor/WAF.
- Observability: enable Cloud Logging/Monitoring; wire `/health` and `/api/v1/ventures/dashboard` to uptime checks.

## 3) Console (Staff Web)
- Point Firebase config to staging/prod projects.
- Enforce Entra ID SSO only (MSAL configured with prod tenant).
- Build and deploy static assets to Firebase Hosting (or CloudFront):
  ```bash
  npm ci && npm run build
  firebase deploy --only hosting:console
  ```

## 4) Mobile (Borrower App)
- Set `API_URL` via env per channel (staging vs prod) in `apps/mobile/src/config.ts` or EAS env vars.
- Point Firebase to the matching project; verify Firestore/Storage rules are scoped to borrower data.
- Release flows:
  - Staging: EAS internal/beta builds hitting staging Brain.
  - Prod: App Store / Play internal test -> phased rollout.
- Enable crash/error reporting (Sentry/Crashlytics) for both channels.

## 5) Data Contract & Sync
- Shared schema: keep `ApplicationStatus`, `venturesLoanId`, `venturesStatus`, `lastSyncedAt`, and task shapes in lockstep across Brain, mobile, and console.
- Sync loop: ensure prod runs with real Ventures when available; keep mock toggle for demos.
- Seeds: for staging demos, keep `apps/brain/data/ventures_mock_state.json` checked-in or resettable.

## 6) CI/CD Blueprint (GitHub Actions)
- **Brain**: lint/test -> docker build -> push -> Cloud Run deploy to staging -> smoke (`/health`, `/api/v1/ventures/dashboard`) -> manual/auto promote to prod.
- **Console/Mobile**: lint/test -> build -> deploy to staging hosting/internal build -> Playwright smoke (for console) and basic API smoke (for mobile) -> promote.
- Block deploy if tests fail; tag releases and keep changelog.

## 7) Security & Compliance
- Firestore/Storage rules locked to roles; no public writes.
- No PII in logs; mask tokens; redact request bodies in traces.
- Enable daily Firestore backups; document restore steps.
- Minimal IAM: separate deployer and runtime accounts; no broad Editor roles.

## 8) Runbook (what to do during/after deploy)
- Deploy staging; run smoke: create app -> status sync -> task completion -> Ventures dashboard shows stats.
- If green, deploy prod; monitor error rates/latency for first 30-60 minutes.
- Rollback: redeploy previous image tag (Cloud Run revisions) or previous hosting release.

# Staging/Prod Setup & Secrets (Copy/Paste Friendly)

Use these commands as a checklist. Replace placeholder IDs/secrets before running.

## 0) Prereqs
- Install/authorize: `gcloud auth login`, `gcloud auth application-default login`, `firebase login`.
- Set region: `export REGION=us-central1`.

## 1) Create Projects (staging + prod)
```bash
export STAGE_PROJECT=ampac-stage
export PROD_PROJECT=ampac-prod

gcloud projects create $STAGE_PROJECT
gcloud projects create $PROD_PROJECT

gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com firestore.googleapis.com --project $STAGE_PROJECT
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com firestore.googleapis.com --project $PROD_PROJECT
```

## 2) Initialize Firestore (Native mode)
```bash
gcloud firestore databases create --project $STAGE_PROJECT --region=$REGION
gcloud firestore databases create --project $PROD_PROJECT --region=$REGION
```

## 3) Create Secrets (Secret Manager)
Create once per project with real values.
```bash
# Staging
gcloud secrets create azure-tenant --replication-policy=automatic --project $STAGE_PROJECT
printf "<stage-tenant-id>" | gcloud secrets versions add azure-tenant --data-file=- --project $STAGE_PROJECT

gcloud secrets create azure-client --replication-policy=automatic --project $STAGE_PROJECT
printf "<stage-client-id>" | gcloud secrets versions add azure-client --data-file=- --project $STAGE_PROJECT

gcloud secrets create azure-secret --replication-policy=automatic --project $STAGE_PROJECT
printf "<stage-client-secret>" | gcloud secrets versions add azure-secret --data-file=- --project $STAGE_PROJECT

gcloud secrets create openai-key --replication-policy=automatic --project $STAGE_PROJECT
printf "<stage-openai-key>" | gcloud secrets versions add openai-key --data-file=- --project $STAGE_PROJECT

gcloud secrets create firebase-admin --replication-policy=automatic --project $STAGE_PROJECT
gcloud secrets versions add firebase-admin --data-file=serviceAccountKey.json --project $STAGE_PROJECT

# Prod
for name in azure-tenant azure-client azure-secret openai-key; do
  gcloud secrets create $name --replication-policy=automatic --project $PROD_PROJECT
done
printf "<prod-tenant-id>" | gcloud secrets versions add azure-tenant --data-file=- --project $PROD_PROJECT
printf "<prod-client-id>" | gcloud secrets versions add azure-client --data-file=- --project $PROD_PROJECT
printf "<prod-client-secret>" | gcloud secrets versions add azure-secret --data-file=- --project $PROD_PROJECT
printf "<prod-openai-key>" | gcloud secrets versions add openai-key --data-file=- --project $PROD_PROJECT
gcloud secrets create firebase-admin --replication-policy=automatic --project $PROD_PROJECT
gcloud secrets versions add firebase-admin --data-file=serviceAccountKey.json --project $PROD_PROJECT
```

## 4) Artifact Registry (if not using Docker Hub)
```bash
gcloud artifacts repositories create ampac-brain --repository-format=docker --location=$REGION --project $STAGE_PROJECT
gcloud artifacts repositories create ampac-brain --repository-format=docker --location=$REGION --project $PROD_PROJECT
```

## 5) Build & Deploy Cloud Run (staging then prod)
```bash
# Staging
gcloud builds submit --tag $REGION-docker.pkg.dev/$STAGE_PROJECT/ampac-brain/brain --project $STAGE_PROJECT
gcloud run deploy ampac-brain \
  --image $REGION-docker.pkg.dev/$STAGE_PROJECT/ampac-brain/brain \
  --region $REGION \
  --allow-unauthenticated \
  --project $STAGE_PROJECT \
  --set-secrets AZURE_TENANT_ID=azure-tenant:latest,AZURE_CLIENT_ID=azure-client:latest,AZURE_CLIENT_SECRET=azure-secret:latest,OPENAI_API_KEY=openai-key:latest,FIREBASE_CREDENTIALS_PATH=firebase-admin:latest \
  --set-env-vars VENTURES_MOCK_MODE=true,USE_FAKE_SYNC=false

# Prod (after staging is green)
gcloud builds submit --tag $REGION-docker.pkg.dev/$PROD_PROJECT/ampac-brain/brain --project $PROD_PROJECT
gcloud run deploy ampac-brain \
  --image $REGION-docker.pkg.dev/$PROD_PROJECT/ampac-brain/brain \
  --region $REGION \
  --allow-unauthenticated \
  --project $PROD_PROJECT \
  --set-secrets AZURE_TENANT_ID=azure-tenant:latest,AZURE_CLIENT_ID=azure-client:latest,AZURE_CLIENT_SECRET=azure-secret:latest,OPENAI_API_KEY=openai-key:latest,FIREBASE_CREDENTIALS_PATH=firebase-admin:latest \
  --set-env-vars VENTURES_MOCK_MODE=true,USE_FAKE_SYNC=false
```

## 6) CORS & Domains
- Add custom domains for both services; enable managed TLS.
- Lock CORS origins to the console and mobile domains once DNS is set.

## 7) Firebase App Config (mobile/console)
- Create Firebase apps in each project; download web/mobile configs.
- Update mobile/console env to use the correct Firebase project and `API_URL` pointing at the matching Cloud Run base.
