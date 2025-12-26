# AmPac Mobile: Production Deployment Runbook (People / App Stores)

This doc is the end-to-end checklist to ship the borrower mobile app to real users via Apple App Store / Google Play using Expo + EAS Build.

It assumes:
- `apps/brain` is deployed behind a stable **HTTPS** domain (not a raw IP) and is operational.
- Firebase (Firestore/Auth/Storage) is configured for **staging** and **prod**.

If you only need a “shareable” demo quickly (no app stores), use `apps/mobile/DEPLOYMENT_OPTIONS.md` (web deploy or internal builds). This doc is for “download in the store”.

## Quick Links
- Expo / EAS build: https://docs.expo.dev/build/introduction/
- EAS submit: https://docs.expo.dev/submit/introduction/
- Expo app config (`app.json`): https://docs.expo.dev/workflow/configuration/
- EAS environment variables: https://docs.expo.dev/build-reference/variables/
- Apple Developer (IDs, certificates): https://developer.apple.com/account/
- App Store Connect (create the app listing): https://appstoreconnect.apple.com/
- Google Play Console: https://play.google.com/console/
- Firebase Console: https://console.firebase.google.com/

---

## 0) Release Decision & Targets

**Target channels**
- **Staging/Beta**: internal testers (TestFlight / Play Internal Testing).
- **Production**: general users (App Store + Play Store).

**Hard requirements for App Store**
- Backend must be HTTPS and stable.
- Privacy policy and support contact must exist (URLs).
- No hardcoded secrets shipped in the client (API keys that grant backend access are not acceptable).

---

## 1) Production Prereqs (Backend + Firebase)

### 1.1 Brain API readiness
- Stable base URL: `https://api.<your-domain>/api/v1` (avoid IPs like `https://35.x.x.x/api/v1`).
- Health endpoints return green:
  - `GET /health`
  - `GET /api/v1/health`
  - `GET /api/v1/health/deps`
  - `GET /api/v1/health/sync`
  - `GET /api/v1/health/calendar`
- Feature flags set appropriately in production:
  - `GRAPH_ENABLED=true`
  - `BOOKINGS_ENABLED=true` (or `false` if you’re not shipping scheduling)
  - `GRAPH_MOCK=false`
  - `VENTURES_MOCK_MODE=false` (unless you’re explicitly shipping a demo-only build)

Reference: `apps/brain/DEPLOYMENT.md`.

#### Getting a real HTTPS domain (provider-agnostic)
Do this once:
1. Pick the production domain: `https://api.<your-domain>/api/v1`
2. Configure DNS for that domain to point at your backend (A/AAAA/CNAME depending on provider)
3. Enable TLS (managed cert is fine) and confirm:
   - `https://api.<your-domain>/health`
   - `https://api.<your-domain>/api/v1/health`
4. Set `EXPO_PUBLIC_API_URL` to `https://api.<your-domain>/api/v1` in the EAS build environment for production

### 1.2 Firebase readiness (prod)
- **Auth**: confirm providers enabled (email/phone/etc) and test sign-in from a real device.
- **Firestore rules**: enforce borrower isolation; block writes to Ventures-owned fields; block unsafe collections.
- **Storage rules**: restrict uploads by borrower identity; enforce file size/type limits.
- **Backups**: enable daily Firestore backup/export (or documented manual process).

---

## 2) Mobile App Configuration (Must Do Before Store Submission)

### 2.1 App identity (name, icons, bundle IDs)
Update `apps/mobile/app.json`:
- `expo.name`: set to a user-facing brand name (e.g., `AmPac Business Capital`).
- `expo.slug`: keep stable once published (changing affects OTA update continuity).
- Add platform identifiers:
  - `expo.ios.bundleIdentifier`: e.g. `com.ampac.businesscapital`
  - `expo.android.package`: e.g. `com.ampac.businesscapital`
- Add app store metadata fields if/when needed (category, privacy policy URL, etc).

#### How to pick the IDs (fast + safe)
1. Decide your “base” reverse-domain string (examples):
   - `com.ampac.businesscapital`
   - `com.ampac.borrower`
2. Check/create iOS bundle ID:
   - Apple Developer → “Identifiers” → “App IDs” → `+` → choose your bundle ID.
3. Use the same string for Android package name:
   - You set this in `app.json`, and the Play Store will lock it in when you first upload an AAB.
4. Don’t change these after shipping v1. They are the long-term identity of the app.

### 2.2 Versioning
Decide versioning rules and stick to them:
- `expo.version` (marketing version): `1.0.0`, `1.0.1`, etc.
- iOS `buildNumber` and Android `versionCode` should monotonically increase.
  - EAS can `autoIncrement` (already enabled for `production` in `apps/mobile/eas.json`).

### 2.3 Environments (staging vs prod)
You need two sets of configuration:
- `EXPO_PUBLIC_API_URL` (Brain base URL)
- Firebase web config vars used by `apps/mobile/firebaseConfig.ts`:
  - `EXPO_PUBLIC_FIREBASE_API_KEY`
  - `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
  - `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `EXPO_PUBLIC_FIREBASE_APP_ID`
  - `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID` (optional)

**Do not ship production builds pointing at staging.**

## 2.4 Decide what ships in v1 (so config/auth matches reality)
You need a clear yes/no for each, because it affects auth + store review risk:
- Stripe payments: **Yes/No**
- Teams notifications: **Yes/No** (strong recommendation: keep this server-side; do not ship a Teams webhook URL in the mobile client)

---

## 3) Security & Compliance Gates (Blockers to Resolve)

### 3.1 Remove “shared secret” API keys from the client
For production, all borrower-facing Brain calls must authenticate using **Firebase Auth ID tokens** and Brain must validate them server-side.
- Mobile: attach `Authorization: Bearer <firebaseIdToken>`.
- Brain: verify the Firebase ID token and enforce borrower isolation.

**Ship criteria:** no backend-wide credential present in app binary.

### 3.2 Eliminate hardcoded dev URLs
Audit mobile code for localhost/IP constants and remove them:
- Example: ensure all calls derive from `apps/mobile/src/config.ts` (`EXPO_PUBLIC_API_URL`).

**Ship criteria:** all network calls derive from `EXPO_PUBLIC_API_URL`.

### 3.3 Privacy policy and data disclosure
Before store submission, publish:
- A privacy policy URL (hosted site page is fine).
- A support URL and contact email.

You’ll need these for:
- Apple “App Privacy” labels
- Google Play “Data safety” form

---

## 4) EAS Build & Signing Setup

### 4.1 Accounts
- Create/confirm:
  - Expo account (EAS access)
  - Apple Developer Program account
  - Google Play Developer account

### 4.2 EAS project setup
From `apps/mobile`:
```bash
npm install
npx eas login
npx eas build:configure
```

### 4.3 Environment variables in EAS
Do **not** rely on committed `.env` for production builds.

Set EAS environment variables for each profile:
- `production` → prod Firebase + prod API URL
- `preview` → staging Firebase + staging API URL

You can set vars via EAS dashboards or CLI (method varies by EAS version). The goal: `process.env.EXPO_PUBLIC_*` resolves correctly at build time.

---

## 5) Build & Distribute

### 5.0 Local quality gates (run before EAS builds)
From `apps/mobile`:
```bash
npm install
npm run typecheck
npm run export:ios
npm run export:android
npm run test:e2e
```
This is the fastest way to catch “will the app actually build” failures before you burn time on EAS.

What it covers:
- TypeScript compile (hard fail on missing/incorrect types)
- Expo bundling for iOS + Android (catches missing native modules/import paths)
- Web smoke tests via Playwright (landing/auth/demo navigation + Apply pre-check)

### 5.1 Staging/Beta builds (first)
**Android (Internal distribution):**
```bash
npx eas build -p android --profile preview
```

**iOS (TestFlight):**
```bash
npx eas build -p ios --profile preview
```

Smoke test on real devices:
- Sign-in / sign-out
- Create/continue application
- Status/tasks display
- Document upload (if shipped)
- Calendar slots + booking (if shipped)
- Payments flow (if shipped)

#### Device QA checklist (iOS + Android)
Run this on at least 1 real iPhone + 1 real Android before any “Production” build:
- Auth: sign up, sign in, sign out, session restore after app restart
- Core tabs: Home/Apply/Spaces/Social/Support all render without crashing
- Spaces: rooms list loads; booking UI loads; back navigation works
- Apply: pre-check can reach Eligible and open external portal link
- Support: form validates + submits (and you see a success toast/alert)
- Offline: turn on airplane mode and confirm offline messaging is sane (no infinite spinners)
- Performance: cold start feels acceptable; no obvious UI jank scrolling Home/Social

### 5.2 Production builds
```bash
npx eas build -p android --profile production
npx eas build -p ios --profile production
```

### 5.3 Store submission
Android (Google Play):
```bash
npx eas submit -p android --profile production
```
iOS (App Store Connect):
```bash
npx eas submit -p ios --profile production
```

---

## 6) Store Listing Requirements (Minimum Set)

### 6.1 Apple App Store
- App name, subtitle, description
- Keywords
- Screenshots for required device sizes
- Privacy policy URL
- Support URL
- Review notes + demo account (if auth-gated)
- Export compliance (encryption)

### 6.2 Google Play
- App name, short/long descriptions
- Screenshots + feature graphic
- Content rating questionnaire
- Data safety form
- App access instructions (test account if needed)

---

## 7) Launch Plan (Safe Rollout)

### 7.1 Enable production feature flags progressively
Ship with conservative defaults and only enable higher-risk integrations after monitoring:
- Graph bookings can be turned off via `BOOKINGS_ENABLED=false` if Graph is unstable.
- Ventures sync can be disabled to protect borrower UX (show last-known state) during incidents.

### 7.2 Phased release
- Start with a small percentage rollout (where supported) or staged availability:
  - 10% → 25% → 50% → 100%
- Monitor:
  - crash-free sessions
  - Brain health endpoints + error rates
  - sync lag + DLQ growth

---

## 8) Go/No-Go Checklist (Copy/Paste)

- [ ] `EXPO_PUBLIC_API_URL` points to prod HTTPS domain.
- [ ] No hardcoded localhost/IP URLs in app.
- [ ] No shared secrets (e.g., backend API keys) shipped in the client.
- [ ] Brain `/health` and `/api/v1/health/*` green.
- [ ] Firestore + Storage rules reviewed and deployed for prod.
- [ ] App identity set (name, icons, bundle ID/package).
- [ ] iOS/Android builds install on real devices.
- [ ] Privacy policy + support URL published.
- [ ] TestFlight / Play Internal test completed with real flows.
- [ ] Monitoring + rollback plan documented (Brain breakers/flags + store rollout controls).
