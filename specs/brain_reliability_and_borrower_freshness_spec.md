# Brain Production Readiness & Borrower Freshness Spec

Scope: make Brain reliable in production (GKE) with clear SLOs, alerts, rollout/rollback, and keep borrower-facing status/tasks/meetings accurate and real-time across mobile + console.

## 1) Goals & Success Criteria
- Reliability: Brain API availability ≥ 99.5% monthly; sync freshness P95 < 60s / P99 < 180s; booking success > 99.0%; non-transient sync failures < 0.5%.
- Control: Operators can halt/route around bad deps via circuit breakers and mocks; roll forward/back safely with canary.
- Visibility: `/health/*` and dashboards show queue depth, lag, DLQ, breaker states, and booking success; alerts fire before users are impacted.
- Borrower freshness: mobile + console show the same status/tasks/meetings within 60s P95 of source-of-truth changes.

## 2) In / Out of Scope
- In: Brain FastAPI health surfaces, metrics/logging, feature flags, circuit breakers, k8s probes/HPA/PDB, rollout/rollback plan, runbooks; mobile/console data contracts for status/tasks/meetings.
- Out: Visual redesigns; replatforming Firestore/React; new LOS integrations beyond Ventures/ShareFile/Graph.

## 3) SLOs / SLIs
- Availability (API): 99.5% monthly for `/health`, `/health/deps`, `/health/sync`, `/api/v1/*`. Error budget: 216 min/mo. Burn alerts at 25/50/75%.
- Sync freshness: lag from Ventures/ShareFile change to Firestore update P95 < 60s, P99 < 180s. Alert: P95 > 90s for 10m or P99 > 240s.
- Booking: success > 99.0% monthly; latency P95 < 5s. Alert: success < 98% over 15m.
- Failures: non-transient sync failures < 0.5% of events. Alert at 0.25% and 0.5%.
- DLQ: backlog < 20 items and oldest < 15m. Alert: > 20 or oldest > 15m.
- Infra: readiness failures > 5m or pod restarts > 3 in 15m page.

## 4) Telemetry & Health Surfaces
- Metrics (counters/gauges/histograms): request rate/latency/error; sync queue depth, DLQ depth, oldest item age, retries; integration success/failure per Ventures/Graph/ShareFile; booking success/latency; Firestore listener watermark age; pod restarts/OOM; push delivery if available.
- Logs: structured JSON with `timestamp`, `level`, `requestId`, `correlationId`, `integration`, `eventId`, `status`, `latency_ms`, `error_code`.
- Tracing: OpenTelemetry spans around sync handlers and bookings; 1% base sample, 100% on errors/DLQ.
- Health endpoints:
  - `/health`: process OK.
  - `/health/deps`: Firestore, Graph, Ventures, ShareFile connectivity.
  - `/health/sync`: lag p50/95/99, queue depth, DLQ depth/age, breaker states.
  - `/health/calendar`: Graph auth + probe booking dry-run (skip calendar write).

## 5) Feature Flags & Circuit Breakers
- Flags: `graphEnabled`, `venturesEnabled`, `sharefileEnabled`, `bookingsEnabled`, `consoleDashboardLive`, `syncEventsEnabled`.
- Mocks: `graphMock`, `venturesMock`, `sharefileMock` (emit warning, degrade gracefully).
- Defaults: integrations enabled, mocks off, breakers closed (pass-through). Operators can open breaker; optionally flip mock to keep surfaces green.

## 6) Data Contracts (Borrower Freshness)
- Applications: `status`, `venturesStatus`, `venturesLoanId`, `lastSyncedAt`, `lastBrainWriteAt`, `appVersion`, `updatedBy`, `correlationId`.
- Tasks lifecycle: `open -> awaiting_upload -> pending_review -> completed`; only Brain may set `completed`.
- Meetings: `meetings` collection with `eventId`, `status`, `icsLink`, `attendees`, `start/end`, `createdBy`, `lastBrainWriteAt`.
- Firestore rules: block client writes to Ventures-owned fields (`venturesStatus`, `venturesLoanId`, `lastSyncedAt`); require auth; allow Brain service account; reject stale writes unless `force=true` with `correlationId`.
- Clients: subscribe to Firestore snapshots post-auth; avoid optimistic overwrite of Ventures fields; include `correlationId` on mutations routed through Brain.

## 7) Client Reliability Expectations
- Mobile: real-time subscriptions to applications/tasks; schedule card uses `/api/v1/calendar/slots` + `/book`; retries booking once; shows retriable error if Graph down; push on booking confirmation/cancel.
- Console: Application Detail shows live status/tasks/meetings; “Resend invite” uses booking resend; status changes call Brain API with `correlationId`; surface audit trail.
- SLA: borrower-visible freshness P95 < 60s / P99 < 180s for status/tasks/meetings after Ventures/Brain change.

## 8) Rollout / Rollback (GKE)
- Strategy: RollingUpdate `maxSurge: 1`, `maxUnavailable: 0`; HPA CPU 60% / memory 70%; PDB minAvailable 1; non-root user; resource requests/limits set.
- Probes: readiness `/health` fast; liveness `/health` with higher timeout; startup probe for slow boot.
- Traffic: canary 10% for 30–60m → 50% for 30m → 100%.
- Promotion gates: `/health/*` green; sync lag P95 < 60s; DLQ stable/empty; booking probe success > 99%; no restart churn; alerts quiet.
- Ownership: Backend lead drives promotion; SRE/on-call signs off; QA observes mobile/console smoke.
- Rollback: shift traffic to previous backend or `kubectl rollout undo deployment/brain-service`; set breakers/mocks to stabilize; re-run `/health/*`; replay DLQ after fix.

## 9) Alerts (page unless noted)
- Availability < 99% 1h.
- Sync lag P95 > 90s 10m or P99 > 240s.
- DLQ > 20 or oldest > 15m.
- Integration breaker open > 5m (page).
- Booking success < 98% over 15m.
- Readiness failing > 5m.
- Pod restarts > 3 in 15m (warning unless sustained).

## 10) Runbooks (abridged)
- Sync lag high: check `/health/sync`; verify Firestore listener watermark; if Ventures/ShareFile breaker opened, enable mock to drain; scale HPA up; replay DLQ after fix.
- DLQ backlog: inspect `sync_events` dead_letter; replay via admin; if repeating, keep breaker open, file incident.
- Ventures down: open Ventures breaker; optionally `venturesMock` on; queue writes with backoff; console banner; resume when `/health/deps` green; replay backlog.
- Graph down: open Graph breaker; return “temporarily unavailable”; retry bookings once; verify app registration secret; resume, re-run failed bookings.
- ShareFile down: store uploads in temp bucket; queue ShareFile pushes; keep tasks `awaiting_upload/pending_review`; resume then complete.
- Booking failures spike: check `/health/calendar`; breaker open + mock?; inspect Graph error code; rollback last deploy if correlated.
- Pods crashloop: check app logs; confirm env/secrets; rollback or hotfix; ensure startup probe grace.

## 11) Delivery Plan (engineering tasks)
- Add `/health`, `/health/deps`, `/health/sync`, `/health/calendar` handlers with metrics.
- Add metrics/logging/tracing instrumentation for sync, DLQ, bookings, listeners.
- Implement feature flags + circuit breakers + mocks (config/env driven).
- Harden Firestore rules for Ventures-owned fields; enforce stale-write reject unless `force`.
- Update k8s manifests: probes, HPA, PDB, RollingUpdate settings, resource requests/limits.
- Add admin replay endpoint for DLQ; booking resend.
- Dashboards: freshness, booking funnel, integration health; alerts as above.
- Runbooks: publish to ops wiki with exact commands/owners.

## 12) Acceptance Criteria
- SLOs above met in staging burn-in; `/health/*` green.
- Feature flags present and default closed breakers, mocks off.
- Canary rollout exercised with promotion gates; rollback validated.
- Firestore rules block client writes to Ventures fields; stale writes rejected unless `force` with `correlationId`.
- DLQ replay and booking resend tested; alerts fire in synthetic drills.
