# AmPac Ecosystem: Technical Hand-off & Production Checklist

This document provides necessary context for final deployment and long-term maintenance of the AmPac mobile app, Console, and Brain API.

## Core Architecture
- **Mobile App**: Expo (React Native) with Firebase SDK for Auth/Firestore.
- **Console**: React (Vite) with MSAL (Azure AD) and Firebase SDK (Staff access).
- **Brain API**: FastAPI (Python) - Handles complex sync, AI chat, and Ventures integration.

---

## Production Credential Checklist
Before final deployment, ensure the following are configured in your production environment:

### [Firebase]
- [ ] **Firestore Rules**: Verify `firestore.rules` are deployed to production.
- [ ] **Indexes**: Ensure composite indexes are built (Firestore will provide links in console if missing during query).
- [ ] **Prod Env**: Update `apps/mobile/.env` with production Firebase keys.

### [Brain API (FastAPI)]
- [ ] **ALLOWED_CORS_ORIGINS**: Set this to `["https://your-console-domain.com", "ampac://"]` in your production environment variables.
- [ ] **JWT_SECRET**: Change the default `ampac-secret-key-...` to a strong random string.
- [ ] **BRAIN_API_KEY**: Set a master key for server-to-server communication if using external triggers.
- [ ] **VENTURES_MOCK_MODE**: Set to `False` once production API credentials for Ventures are available.

### [Console (React)]
- [ ] **MSAL Configuration**: Ensure the redirect URIs in Azure Portal match your production domain.
- [ ] **Staff Sync**: Run the `AdminPage` sync once to provision all staff members in Firestore.

---

## Deployment Commands

### Mobile (Expo)
```bash
# Preview build
npx eas build --profile preview --platform android

# Production build
npx eas build --profile production --platform all
```

### Brain API (Docker)
```bash
docker-compose up -d --build
```

### Console (Vite/Vercel)
```bash
npm run build
```

---

## Key Maintenance Tasks
1. **Adding Staff**: Add new staff to `apps/console/src/data/staff.ts` and sync via the Admin Dashboard.
2. **Monitoring**: Check the Brain API logs for any `429` (Rate Limited) errors to adjust thresholds in `middleware.py`.
3. **UGC Moderation**: Monitor the `reports` collection in Firestore for flagged posts or messages.
