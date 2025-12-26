# AmPac Deployment Walkthrough (Lean v1)

This doc is the fastest path to demo + ship the stack without Kubernetes. It uses placeholders where you should substitute your real production values.

## 1) Targets (what “live” means)
- **Brain API**: `https://api.<your-domain>/api/v1` (stable HTTPS domain)
- **Firebase**: separate projects for `staging` and `prod`
- **Mobile**: EAS builds with `EXPO_PUBLIC_API_URL=https://api.<your-domain>/api/v1`

## 2) Demo Script (for stakeholders)

### A) Verify Brain health
```powershell
curl https://api.<your-domain>/health
curl https://api.<your-domain>/api/v1/openapi.json
```
Success criteria: both return `200` (JSON responses).

### B) Mobile app demo (local)
```powershell
cd apps/mobile
npx expo start -c
```
Suggested walkthrough:
- Landing -> Sign In -> “Demo Mode (Bypass)”
- Tools & Services -> Support (resources open) -> Marketplace
- Apply -> “Start Pre-Check” -> eligible result

## 3) Deploy Brain (Cloud Run example)
Cloud Run is the recommended “lean” hosting option because it gives you HTTPS + revisions + traffic splitting without managing infrastructure.

Docs:
- Cloud Run: https://cloud.google.com/run/docs
- Custom domains: https://cloud.google.com/run/docs/mapping-custom-domains

```powershell
cd apps/brain
gcloud builds submit --tag gcr.io/$env:GOOGLE_CLOUD_PROJECT/ampac-brain
gcloud run deploy ampac-brain `
  --image gcr.io/$env:GOOGLE_CLOUD_PROJECT/ampac-brain `
  --region us-central1 `
  --allow-unauthenticated
```

## 4) Next Steps (checklist)
- Pick the final production domain and set up DNS + HTTPS.
- Confirm store identities (App Store name, iOS bundle ID, Android package name).
- Run beta builds (TestFlight / Play Internal Testing) with staging env vars before production submission.
