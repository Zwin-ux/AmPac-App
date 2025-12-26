# Copilot instructions

## Understand the layout
- This is a monorepo with three live apps: `apps/mobile` (Expo/React Native borrower experience), `apps/console` (React + Vite staff dashboard), and `apps/brain` (Python FastAPI LLM service). See `README.md` for the top-level overview.
- Each app has its own runtime and tooling; there are no shared packages, so treat imports as compartmentalized but expect them to hit the same Firestore collections and Firebase project.

## Common setup & dev commands
- **Mobile**: `cd apps/mobile && npm install` once, then use `npx expo start` (or `npm run android`, `npm run ios`, `npm run web`). Environment secrets come through Expo’s `process.env.EXPO_PUBLIC_*` vars consumed by `apps/mobile/firebaseConfig.ts`.
- **Console**: `cd apps/console && npm install` (uses npm lock file). Main developer loop is `npm run dev` (Vite dev server); use `npm run build` and `npm run lint` for validation. Firebase config pulls from `apps/console/.env` via `import.meta.env`.
- **Brain**: `cd apps/brain && pip install -r requirements.txt`, then start `uvicorn app.main:app --reload` (or `python -m app.main`). Config keys come from `apps/brain/.env` loaded by `app/core/config.py`.

## Mobile app architecture reminders
- `apps/mobile/App.tsx` wires navigation: a stack that renders public screens (`Landing`, `SignIn`, `SignUp`) until `userStore` hydrates (`apps/mobile/src/services/userStore.ts`) and keeps `User`’s profile in AsyncStorage.
- Authenticated flow uses `applicationStore` (`apps/mobile/src/services/applicationStore.ts`), which hydrates drafts from `syncService` and AsyncStorage, merges with Firestore data (server wins unless local version > server), and queues writes/debounces saves to Firestore via `syncService` (`apps/mobile/src/services/sync.ts`). Screens like `ApplicationScreen.tsx` subscribe to this store for optimistic updates.
- `cacheService.ts`, `rooms.ts`, `network.ts`, and `pricing.ts` illustrate the offline-first data layer: cached `rooms`, `businesses`, and pricing rules fall back to mock data if Firestore is empty, with TTL (~1h) managed by `cacheService`.
- Booking flow relies on `availability.ts` (conflict detection + holds) and `graphCalendarService` (`microsoftGraph.ts`), which reads `app.json` extras (`graphClientId`, `graphTenantId`, `graphScopes`, `scheme`, `graphUseProxy`) to authorize Microsoft Graph via `expo-auth-session`, caches tokens in AsyncStorage, and gracefully falls back to stub IDs when tokens are absent.
- Document uploads and storage paths live in `upload.ts`/`uploadManager.ts`, but the big-picture rule is “work fast, save later” and keep `applicationStore` sync status badges (see `SyncStatusBadge.tsx`).
- Firebase is initialized in `apps/mobile/firebaseConfig.ts` with `initializeAuth` + `getReactNativePersistence`; all mobile services call `db`, `auth`, or `storage` from this file.
- Data Connect GraphQL helpers live in `apps/mobile/src/dataconnect-generated/*`. Treat these files as generated (`README.md` warns edits will be overwritten) and import the wrapper package `@dataconnect/generated` (or `@dataconnect/generated/react`) when you need queries/mutations.

## Console staff dashboard details
- `apps/console/src/App.tsx` wraps routes with `RequireAuth`, which listens to Firebase Auth and respects the `localStorage` flag `ampac_dev_bypass` (set through the login page) to skip auth in dev.
- Authenticated users render `DashboardLayout.tsx` (persistent sidebar/mobile menu, logout logic clearing the dev bypass flag) and nested routes for `WorkboardPage`, `ApplicationDetailPage`, `AdminPage`, etc.
- Firestore operations happen in `services`: `loanService.ts` (pipeline fetch, status/flag/assignment updates against the `applications` collection), `documentService.ts` (`document_requests`, `documents`, lifecycle updates), and `taskService.ts` (`tasks` collection). These files expect to run in the shared Firebase project through `apps/console/src/firebaseConfig.ts`.
- Shared data shapes are defined in `apps/console/src/types/index.ts`, which mirror `apps/mobile/src/types.ts` (loan statuses, document types, user roles). Keep these types synchronized when you change the Firestore schema.
- `WorkboardPage.tsx` just fetches `loanService.getPipeline()` and pipes statuses/flags into the UI. `ApplicationDetailPage.tsx` mixes `loanService` with direct Firestore reads (`getDoc(doc(db, 'users', userId))`) plus components under `components/document` and `components/communication` for requested docs/chat threads.

## Brain service context
- `apps/brain/app/main.py` launches FastAPI with CORS enabled and mounts the router defined in `app/api/routers/chat.py`; this is the HTTP entry point for the AmPac Brain.
- Configuration is cached via `app/core/config.py` (`pydantic-settings`), so add new secrets there before trying to access `settings` elsewhere. The default LLM is `gpt-4o`, controlled via `OPENAI_MODEL`/`OPENAI_API_KEY` in `apps/brain/.env`.
- `app/services/llm_service.py` instantiates `langchain_openai.ChatOpenAI` when the API key is present and smooshes errors into a string if the key is missing. All endpoints should call `llm_service.generate_response` and handle the fallback string.
- `requirements.txt` lists FastAPI, Uvicorn, Firebase Admin, LangChain, LangChain OpenAI, and MS Graph SDKs; keep this file in sync with additional packages and rerun `pip install` after editing.

## Cross-cutting data & integration notes
- The mobile and console apps share Firestore (collections: `users`, `applications`, `rooms`, `bookings`, `holds`, `businesses`, `hotlineRequests`, `document_requests`, `documents`, `tasks`, etc.). When you add a field, update both `apps/mobile/src/types.ts` and `apps/console/src/types/index.ts`, and audit each service that reads/writes it (`applicationStore`, `loanService`, `documentService`, etc.).
- `syncService.queueWrite` keeps an AsyncStorage queue keyed by collection/doc to retry writes after failed persistence (see `apps/mobile/src/services/sync.ts`). Drops there should reflect in the Firestore functions that call it: `saveApplication` and `createApplication` already queue on error.
- `applicationStore.syncWithServer` compares versions and rehydrates via `saveApplication`/`getApplication`; the merging strategy is in that file and drives optimistic updates elsewhere (see `ApplicationScreen.tsx`).
- Use `pricingService` and `availabilityService` (and their tests, if added) as reference implementations when adding price estimates or booking logic—these functions are deterministic and rely only on `Timestamp` math in `apps/mobile/src/services/pricing.ts` and `availability.ts`.
- Microsoft Graph hooks (`graphCalendarService`) rely on `graphClientId`/`graphTenantId` in `apps/mobile/app.json` extra and behave differently if the token cache fails, so keep feature toggles two-phase (attempt interactive auth, fall back to stub IDs).

## Editing rules
- Never manually edit files under `apps/mobile/src/dataconnect-generated/*`; treat them as generated code. Instead, update connectors via the Data Connect pipeline and import helper hooks from `@dataconnect/generated` or `@dataconnect/generated/react` as documented in `apps/mobile/src/dataconnect-generated/README.md` and the React README.
- Add UI components near the existing `components/` folder (or `components/ui` for shared widgets) and follow the Tailwind/tailwind-merge styling conventions from the console app, or the theme/colors in `apps/mobile/src/theme.ts` for React Native.
- If you touch Firestore document contracts, update the shared types first, then adjust every service that serializes/deserializes that document to avoid hydration mismatches.
- After changing Firebase logic in either app, run the relevant command (`npx expo start`/`npm run dev`) and rerun `npm run lint` (console) or `npm run build` (console) before reporting readiness.

## Feedback loop
- Let me know which parts of these instructions still feel vague or incomplete so we can iterate—was there anything you needed that’s missing?
