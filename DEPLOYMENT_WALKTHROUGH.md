# AmPac Deployment Walkthrough & Status Report

**Date:** December 15, 2025
**Status:** ✅ Operational
**Backend URL:** `http://35.241.35.252` (Temporary IP)
**Target Domain:** `ampac.business` (HTTPS Pending)

---

## 1. Executive Summary

The AmPac "Brain" service has been successfully containerized and deployed to a production-grade Google Kubernetes Engine (GKE) cluster. The Mobile App has been updated to connect to this live backend and now features the requested "Sales Team" directory.

### Key Achievements
- **Scalability**: Deployed on Kubernetes with 2 replicas for high availability.
- **Security**: 
  - Containers run as a non-root user (`appuser`).
  - Secrets (API Keys) are managed via Kubernetes Secrets, not hardcoded.
- **Reliability**: Liveness and Readiness probes configured to auto-restart failing services.
- **Mobile Integration**: The app is fully integrated with the live backend.

---

## 2. System Architecture

- **Frontend**: React Native (Expo) Mobile App.
- **Backend**: FastAPI (Python) service handling AI, Documents, and Data.
- **Infrastructure**: 
  - **GKE Cluster**: `brain-cluster` (us-central1)
  - **Load Balancer**: Google Cloud Global Load Balancer (IP: `35.241.35.252`)
  - **Storage**: Google Container Registry (GCR) for Docker images.

---

## 3. Demonstration Script

Use this script to demonstrate the system to stakeholders.

### A. Verify Backend Health
Run this command to confirm the backend is responding to public traffic:
```powershell
curl http://35.241.35.252/api/v1/openapi.json
```
*Success Criteria*: Returns a JSON response describing the API.

### B. Mobile App Demo
1. **Start the App**:
   ```powershell
   cd apps/mobile
   npx expo start -c
   ```
2. **Show "Network" Tab**:
   - Navigate to the **Network** tab.
   - Verify the **"AmPac Team"** list is visible (Hilda, Ed, Jaime, etc.).
   - Demonstrate the **Call** button functionality.
   - Use the search bar to filter by title (e.g., "SBA").

---

## 4. Deployment Commands (Reference)

These commands were used to build and deploy the current state.

### Build & Push Docker Image
```powershell
cd apps/brain
docker build -t gcr.io/ampac-a325f/brain-service:latest .
docker push gcr.io/ampac-a325f/brain-service:latest
```

### Deploy to Kubernetes
```powershell
# Apply configurations
kubectl apply -f k8s/brain-deployment.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/certificate.yaml

# Restart pods to pick up new image
kubectl delete pods -l app=brain-service
```

### Check Status
```powershell
kubectl get pods
kubectl get ingress
```

---

## 5. Next Steps: Enabling HTTPS

To secure the app with SSL/HTTPS (required for Apple App Store):

1. **DNS Update**: 
   - Log in to the domain registrar for `ampac.business`.
   - Create an **A Record** for `@` (root) pointing to `35.241.35.252`.
   
2. **Verification**:
   - Google-managed certificates will automatically provision SSL once the DNS propagates (approx. 15-60 mins).
   - Update `apps/mobile/.env` to use `https://ampac.business/api/v1`.
