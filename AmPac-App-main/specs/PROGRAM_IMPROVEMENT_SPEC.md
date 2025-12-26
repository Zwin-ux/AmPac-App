# Program Improvement Specification

Scope: harden the AmPac OS (mobile + console + Brain) so borrower status, tasks, and scheduling stay accurate, observable, and secure in production.

## Goals
- Make data flow reliable and auditable between Firestore, Ventures, ShareFile, and Graph; target borrower-visible status/task consistency within 60s P95 (180s P99) even during maintenance windows.
- Give borrowers real-time clarity (status, tasks, meetings) in the mobile app.
- Give staff actionable visibility and controls in the console without relying on mocks.
- Ship behind feature flags with measurable SLOs (Brain sync/calendar availability 99.5% monthly) and rollback levers via circuit breakers per integration.

## Non-goals
- No replatforming of React Native/React/Firestore.
- No visual redesign; focus on correctness, latency, and operational safety.

## Current gaps (observed)
- Sync loop in `apps/brain/app/services/sync_service.py` is an in-memory poller (10s) with ad-hoc stats and no persistence, acking, or back-pressure.
- Ventures endpoints in `apps/brain/app/api/routers/ventures.py` are partially mocked; dashboard data falls back to fake counts.
- Mobile draft flow (`apps/mobile/src/services/applicationStore.ts`) optimistically merges but does not subscribe to Firestore once authenticated; conflicts can silently overwrite.
- Console status changes (`apps/console/src/pages/ApplicationDetailPage.tsx`) rely on manual updates without LOS validation or audit.
- Secrets (service accounts) are checked into the repo; no rotation or environment scoping.
- Limited observability: no structured logging, tracing, alerting, or health signals exposed to operators.

## Proposed solution

### 1) Reliable sync engine (Brain)
- Split upstream (Firestore -> Ventures/ShareFile) and downstream (Ventures/ShareFile -> Firestore) workers with idempotent handlers.
- Persist work items in a `sync_events` collection (type, source, targetIds, payload hash, retries, status, lastError, nextAttemptAt) to avoid memory loss and enable replay.
- Replace tight polling with change streams:
  - Firestore listener for `applications` and `tasks` mutations writes sync events.
  - Timer-based downstream sweep remains but reads last-seen watermark per integration (`lastVenturesCheckpoint`).
- Add exponential backoff, circuit breaker per integration, and dead-letter queue for repeated failures.
- Emit structured logs (JSON) and counters (synced, lag_ms, failures) exposed via `/api/v1/health/sync`.

### 2) Single source of truth and schema hardening
- Normalize status enums in shared types (mobile/console) to match `ApplicationStatus` mapping and include `rejected/withdrawn`.
- Add versioning fields: `appVersion`, `lastBrainWriteAt`, `lastVenturesSyncAt`, plus audit fields `updatedBy`, `correlationId`; Brain rejects stale writes unless `force=true`.
- Enforce Firestore rules so only Brain can write Ventures-controlled fields (`venturesStatus`, `venturesLoanId`, `lastSyncedAt`); apps can only request changes via API.

### 3) Document and task loop you can trust
- Task lifecycle: `open -> awaiting_upload -> pending_review -> completed`; only Brain can mark `completed` after Ventures confirms.
- Upload path: Mobile writes file to Storage; Brain webhook (`POST /api/v1/documents/ingest`) attaches Storage path, uploads to ShareFile, updates Ventures condition, then sets task to `pending_review`/`completed`.
- Add SLA timers on tasks (e.g., 24h to acknowledge upload); surface breaches in console My Work panel and sync stats.

### 4) Scheduling and communication
- Calendar endpoints: `GET /api/v1/calendar/slots?staffId=&duration=` and `POST /api/v1/calendar/book` call Graph and persist meetings to Firestore (`meetings` collection) with status and ICS link.
- Console: show next three slots and booked meetings on Application Detail; allow "Resend invite".
- Mobile: "Schedule" card that pulls slots and posts booking; push notification on confirmation/cancellation.
- Message channel: adopt `applications/{id}/messages` with role flags; add delivery receipts and optional relay to Teams via Graph webhook.

### 5) Observability and ops
- Health surface: `/health` (process), `/health/deps` (Firestore, Graph, Ventures, ShareFile), `/health/sync` (lag, queue depth, error rate).
- Structured logging with request IDs; ship to centralized sink (e.g., Application Insights or Cloud Logging).
- Feature flags per integration (Graph, Ventures, ShareFile) and per endpoint; default to mock when flag off but emit warning log.
- Admin console tile pulling real stats (no mocks) with recent errors and replay buttons for failed sync events.

### 6) Security and compliance
- Remove committed service accounts; load creds from env/Secret Manager; rotate quarterly.
- Encrypt stored third-party creds in `TokenStorage` with KMS; add per-user scoping and audit trail of who configured/used them.
- Harden Firestore rules for `tasks`, `applications`, `messages`, and Storage uploads (type/size checks).
- Add OIDC-protected Brain endpoints; require signed requests from console/mobile via Firebase Auth or MSAL token introspection.

## Delivery plan (4 weeks, can be parallelized)
- Week 1: Land structured logging, health endpoints, feature flags; migrate secrets to env; add Firestore rule updates.
- Week 2: Build `sync_events` model, upstream/downstream workers, and dead-letter handling; wire change streams; add metrics.
- Week 3: Implement document/task lifecycle and ShareFile/Ventures confirmation path; update mobile task flow and console task review to use new states.
- Week 4: Implement calendar slots/booking, messages with receipts, and console/mobile surfaces; hook admin dashboard to real stats; bake in alerting.

## Acceptance criteria
- Sync lag P95 < 60s, P99 < 180s between Ventures status change and Firestore update; non-transient error rate < 0.5% of events; DLQ backlog < 20 items older than 15m.
- Brain sync and calendar endpoints uphold 99.5% monthly availability; circuit breakers prevent one integration failure from blocking others.
- Console dashboard shows live stats from Brain (no mocks), lists last 20 sync errors with replay control, and uses the same counters exposed by `/health/sync`.
- Mobile shows real-time status and tasks sourced from Firestore; booking returns Graph event id, ICS link, and stored meeting record; failed bookings retry once and surface a console-visible error.
- Firestore rules block direct writes to Ventures-owned fields from clients; Brain writes include `updatedBy` and `correlationId` for audit; rejected stale writes unless `force=true`.
- All secrets removed from repo; credentials come from env/Secret Manager with KMS; rotation policy documented; health endpoints green in staging with feature flags toggled on/off.

## Stakeholder sign-off checklist
- Confirm SLAs: lag (60s/180s), availability (99.5%), DLQ tolerance (20 items < 15m).
- Approve task escalation policy (e.g., breach alerts after 24h) and booking ownership model (per-staff vs. by role).
- Validate data residency/compliance constraints for ShareFile/Graph and audit requirements for `TokenStorage`.
- Align feature-flag strategy (env-level vs. per-tenant) and rollback levers.
- Acknowledge removal of committed secrets and acceptance of KMS-backed storage for third-party creds. 
