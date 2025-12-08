# Fast Application Intake

## Problem Statement

The current SBA loan application intake process in the Apply section is painfully slow. Users experience long loading times, blocking UI states, and a frustrating multi-step process that feels like it takes "decades" to complete.

### Current Pain Points

1. **Initial Load Blocking**: 6-second timeout waiting for existing application data before users can start
2. **Sequential Network Calls**: Each step waits for Firestore round-trips before proceeding
3. **No Optimistic UI**: Users see loading spinners instead of immediate feedback
4. **Heavy Form Steps**: All 4 steps must be completed sequentially with no shortcuts
5. **Document Upload Friction**: File uploads block the entire flow
6. **Cache Miss Penalty**: First-time users hit cold cache and wait for full DB query

## Requirements

### Functional Requirements

#### FR-1: Instant Application Start
The application form must be immediately usable without waiting for network calls. Users should see the eligibility form within 500ms of tapping "Apply".

#### FR-2: Background Data Sync
Loading existing application data must happen in the background while the user can already interact with the form. If an existing draft is found, merge it non-destructively.

#### FR-3: Optimistic Step Navigation
Step transitions must be instant (<100ms). All saves happen asynchronously in the background with visual sync indicators.

#### FR-4: Smart Form Prefill
Pre-populate known fields from user profile data (business name, years in business) to reduce data entry.

#### FR-5: Parallel Document Upload
Document uploads must not block form progression. Users can continue to the next step while uploads complete in the background.

#### FR-6: Quick Apply Mode
Provide a streamlined "Quick Apply" path that collects only essential fields (loan type, amount, business name) for initial submission, with full details collected later.

### Non-Functional Requirements

#### NFR-1: Time to Interactive
The Apply screen must be interactive within 500ms of navigation, regardless of network conditions.

#### NFR-2: Offline-First
Users must be able to complete the entire application flow offline. Data syncs when connectivity returns.

#### NFR-3: Perceived Performance
Use skeleton loaders, optimistic updates, and progressive disclosure to eliminate perceived wait times.

#### NFR-4: Data Integrity
Despite async operations, application data must remain consistent. Use versioning to handle conflicts.

## Acceptance Criteria

### AC-1: Instant Start
- [ ] User taps Apply tab and sees eligibility form within 500ms
- [ ] No blocking loading spinner on initial render
- [ ] Background fetch of existing draft does not block UI

### AC-2: Seamless Draft Recovery
- [ ] If user has existing draft, form fields populate without page reload
- [ ] User sees "Draft recovered" toast notification
- [ ] No data loss when merging recovered draft with any local changes

### AC-3: Fast Step Navigation
- [ ] Tapping "Next Step" transitions immediately
- [ ] Save indicator shows "Saving..." then "Saved" without blocking
- [ ] User can navigate back/forward freely while saves complete

### AC-4: Non-Blocking Uploads
- [ ] User can proceed to Review step while documents upload
- [ ] Upload progress shown in Documents step even when on different step
- [ ] Failed uploads can be retried without losing form progress

### AC-5: Quick Apply Path
- [ ] "Quick Apply" option visible on product selection
- [ ] Quick Apply collects: loan type, amount, business name, contact
- [ ] Quick Apply submits in under 30 seconds total
- [ ] Full application details can be added later from dashboard

### AC-6: Offline Capability
- [ ] Full form completion works with airplane mode enabled
- [ ] "Offline - will sync when connected" indicator shown
- [ ] Data persists across app restarts while offline
