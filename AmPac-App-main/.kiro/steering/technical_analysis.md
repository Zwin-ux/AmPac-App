# Technical Analysis — Zwin-ux/AmPac-App

_Auto-generated from auditing analysis._

## Repository Structure Overview

### Top-level tree

- **apps/brain/**: Python FastAPI LLM service.
  - `app/main.py`: FastAPI app startup.
  - `app/services/llm_service.py`: LLM abstraction.
- **apps/console/**: React + Vite staff dashboard.
  - `src/App.tsx`: Route wrapper & Auth.
  - `src/services/*`: Loan, Document, Task services.
- **apps/mobile/**: Expo/React Native borrower app.
  - `src/services/store.ts`: Local state & sync.
  - `src/services/microsoftGraph.ts`: Graph integration.
- **apps/m365-addin/**: Office integration project.

## Feature Inventory & Status

| Feature               | Status          | Notes                                                                     |
| :-------------------- | :-------------- | :------------------------------------------------------------------------ |
| **Core Auth**         | **Partial**     | Firebase Auth implemented. Missing RBAC enforcement & Session validation. |
| **Mobile Onboarding** | **Implemented** | Landing, SignIn, SignUp flows functional.                                 |
| **Offline Sync**      | **Implemented** | Optimistic UI with server-wins resolution.                                |
| **Doc Uploads**       | **Implemented** | Basic upload flow. Missing virus scan/signed URLs.                        |
| **Booking**           | **Partial**     | Conflict detection works. Graph writeback fragile.                        |
| **Staff Console**     | **Implemented** | Workboard & Detail views functional.                                      |
| **Brain (AI)**        | **Partial**     | FastAPI setup. Missing API Auth/Gating.                                   |
| **CRM Integration**   | **Missing**     | No sync pipeline to external CRM.                                         |

## Frontend Analysis

### A. Mobile (`apps/mobile`)

- **Architecture**: Offline-first using `userStore` & `applicationStore` (AsyncStorage).
- **Navigation**: Root switch (Auth vs Main) -> Tab Navigator.
- **Gaps**: Token storage in AsyncStorage (insecure), fragile Graph token refresh.

### B. Console (`apps/console`)

- **Architecture**: Vite + React, guarded by `RequireAuth`.
- **Dev Bypass**: usage of `ampac_dev_bypass` is a security risk.
- **Services**: Direct Firestore usage via services layer.

## Backend / API Analysis

- **Brain API**: FastAPI service. Currently unguarded (needs API Key/JWT).
- **Firestore**: Primary data store. Client-heavy logic.
- **Missing**: Server-side validation endpoints, CRM sync webhooks.

## Data Models (Firestore)

- `users`: Profiles & Roles.
- `applications`: Loan data, status, flags.
- `documents`: Metadata & storage paths.
- `document_requests`: Requirements tracking.
- `tasks`: Workflow items.

## Authentication Risks

1. **Mobile**: Graph tokens stored insecurely in AsyncStorage.
2. **Console**: Dev bypass flag availability.
3. **Brain**: No auth gating on LLM endpoints.
4. **General**: Firestore rules not visible/verified.

## Azure & M365 Integration State

- **Current**: Client-side Graph calls via `expo-auth-session`. Use of "Stub IDs" implies incomplete production flow.
- **Goal**: Full Entra ID SSO, Azure Container Apps (Brain), Static Web Apps (Console).

## Critical Missing Features (Launch Blockers)

1. **CRM Sync**: Server-side synchronization pipeline.
2. **Security Rules**: Robust Firestore security rules.
3. **Brain Auth**: API Key/JWT gating for AI service.
4. **Secrets Management**: Move keys to Key Vault/Secret Manager.

## Recommended Architecture Improvements

1. **Enforce Server-Side Validation**: Don't rely solely on client SDKs.
2. **Secure Brain Service**: Add auth middleware.
3. **Azure Migration**: Deploy Brain to ACA, Console to SWA.
4. **Types**: Centralize shared types (Mobile/Console) to avoid drift.
