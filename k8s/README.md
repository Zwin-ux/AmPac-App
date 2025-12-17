# AmPac Kubernetes Deployment

This directory contains the Kubernetes manifests for deploying the AmPac Brain service and Website Builder hosting.

## Prerequisites

1.  **Kubernetes Cluster**: Ensure you have a running K8s cluster (GKE, EKS, or Minikube).
2.  **kubectl**: Installed and configured to talk to your cluster.
3.  **Secrets**: You need to create a secret named `brain-secrets` with your API keys.

## Setup

### 1. Create Secrets

```bash
kubectl create secret generic brain-secrets \
  --from-literal=openai-api-key=YOUR_OPENAI_KEY \
  --from-literal=teams-webhook-url=YOUR_TEAMS_INCOMING_WEBHOOK_URL \
  --from-literal=firebase-credentials='{...json...}'
```

### 2. Build and Push Image

```bash
cd ../apps/brain
docker build -t gcr.io/ampac-a325f/brain-service:latest .
docker push gcr.io/ampac-a325f/brain-service:latest
```

### 3. Deploy

```bash
kubectl apply -f brain-deployment.yaml
kubectl apply -f brain-worker.yaml
kubectl apply -f brain-hpa.yaml
kubectl apply -f brain-pdb.yaml
kubectl apply -f ingress.yaml
```

## Architecture

-   **Brain API** (`brain-service`): Runs the FastAPI backend and is safe to autoscale (HPA).
-   **Brain Worker** (`brain-worker`): Single replica that runs the sync loop (no ingress/service).
-   **Website Hosting**: The Brain service now exposes a `GET /sites/{slug}` endpoint.
-   **Ingress**: Routes traffic from `ampac.business/sites/*` to the Brain service, allowing published websites to be viewed publicly.

## Verification

Once deployed, you can access a published site at:
`https://ampac.business/sites/my-business-slug`
