# Admin Console (Optix Parity) – Lean Spec

Goal: replace Optix with an internal admin console that gives staff end-to-end control of locations, spaces, bookings, members, billing, and support with a single source of truth.

## Roles
- **Org Admin**: full control; manages locations, plans, billing, staff access.
- **Community/Front Desk**: manage bookings, check-ins, visitor passes, support tickets.
- **Finance**: invoices, payouts, refunds, reconciliations, exports.
- **IT/Operator**: feature flags, system health, integrations (Graph, Stripe, calendar, messaging).

## Core Modules (parity targets)
1) **Locations & Resources**
   - Locations, floors, rooms/spaces, capacity, amenities, availability rules, images.
   - Resource states: available, blocked, maintenance.
2) **Bookings & Calendar**
   - Create/modify/cancel bookings; approvals/holds; recurring events.
   - Check-in flow, no-show rules, overstay handling; ICS/email notifications.
   - Blackout windows and buffer times; per-space pricing overrides.
3) **Members & Companies**
   - People and companies; roles (member/admin/guest); invites; access windows.
   - Visitor passes; badge/door integration (future).
4) **Plans, Products, Billing (Stripe)**
   - Membership plans, credits, add-ons; promo codes; tax settings.
   - One-off invoices, refunds, payouts; payment methods on file; dunning/retry rules.
   - Reporting: MRR/ARR, invoice aging, usage vs. credits.
5) **Support & Communications**
   - Tickets/requests; SLA timers; assignment/ownership; canned replies.
   - Broadcasts/announcements (email/push/in-app); per-location targeting.
6) **Content & Links (replacing Optix “More” screen)**
   - Curated links/cards to resources, marketplace, events; reorder per location.
7) **Analytics & Exports**
   - Dashboards: occupancy, utilization by space/time, booking revenue, top users.
   - CSV exports (bookings, invoices, members) with date/location filters.
8) **System & Integrations**
   - Feature flags/breakers (Graph, Ventures, ShareFile, payments, messaging).
   - Health/smoke: `/health/*`, booking probe, sync lag/DLQ.
   - Audit log of admin actions.

## Non-Functional
- Auth: SSO (Entra/Okta) only; no local passwords. MFA enforced via IdP.
- RBAC: least privilege per role; location scoping.
- Observability: request logs with correlation IDs; error tracking; uptime checks.
- Privacy/PII: mask sensitive fields in logs; role-gated access to financial data.

## Out of Scope (for lean v1)
- Door/badge hardware integration.
- Complex resource scheduling optimization.
- Marketplace checkout (links only for now).
- Kubernetes manifests (deferred); target managed hosting.

## Delivery Order (suggested)
1) Auth + RBAC scaffold; health dashboard.
2) Locations/spaces + bookings calendar + basic support queue.
3) Members/companies + plans/credits + Stripe billing basics.
4) Announcements/resources (links), exports, audit log.
5) Hardening: alerts, dunning rules, refunds, SLA timers, role review.
