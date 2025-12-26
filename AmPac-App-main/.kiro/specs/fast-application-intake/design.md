# Fast Application Intake - Technical Design

## Overview

Transform the application intake from a blocking, sequential process to an instant, optimistic, offline-first experience.

## Architecture Changes

### 1. Lazy Initialization Pattern

**Current**: Block render until `getApplication()` resolves or times out (6s)
**New**: Render immediately with empty/default state, hydrate in background

```typescript
// New pattern in ApplicationScreen
const [application, setApplication] = useState<Application | null>(() => {
  // Sync read from memory cache (instant)
  return applicationStore.getCachedDraft();
});

useEffect(() => {
  // Async hydration - doesn't block render
  applicationStore.hydrateFromStorage().then(setApplication);
}, []);
```

### 2. Application Store (New Service)

Create `src/services/applicationStore.ts` - a synchronous-first store with async persistence.

```
┌─────────────────────────────────────────────────────┐
│                  ApplicationStore                    │
├─────────────────────────────────────────────────────┤
│  Memory Cache (sync)                                │
│    └─ currentDraft: Application | null              │
│    └─ syncStatus: 'idle' | 'syncing' | 'synced'    │
├─────────────────────────────────────────────────────┤
│  AsyncStorage (async, offline)                      │
│    └─ Persisted draft                               │
├─────────────────────────────────────────────────────┤
│  Firestore (async, online)                          │
│    └─ Source of truth                               │
└─────────────────────────────────────────────────────┘
```

**Key Methods:**
- `getCachedDraft()` - Sync, returns memory cache
- `hydrateFromStorage()` - Async, loads from AsyncStorage
- `syncWithServer()` - Async, fetches/merges from Firestore
- `updateField(field, value)` - Sync update + async persist
- `getQuickApplyDefaults()` - Returns prefilled data from user profile

### 3. Optimistic Step Navigation

Remove `await` from step transitions. Save operations queue in background.

```typescript
// Current (blocking)
const handleNextStep = async () => {
  await flushSave(updatedApp);  // BLOCKS
  setCurrentStep(nextStep);
};

// New (optimistic)
const handleNextStep = () => {
  setCurrentStep(nextStep);  // INSTANT
  applicationStore.queueSave(updatedApp);  // BACKGROUND
};
```

### 4. Quick Apply Flow

New streamlined component that bypasses the full wizard:

```
┌────────────────────────────────────────┐
│         Quick Apply (1 screen)         │
├────────────────────────────────────────┤
│  Loan Type:    [504] [7a]              │
│  Amount:       [$___________]          │
│  Business:     [___________]           │
│  Phone:        [___________]           │
│                                        │
│  [Submit Quick Application]            │
│                                        │
│  "Complete full application later"     │
└────────────────────────────────────────┘
```

### 5. Background Document Upload Manager

New `src/services/uploadManager.ts` - manages uploads independently of form state.

```typescript
interface UploadJob {
  id: string;
  docId: string;
  uri: string;
  status: 'queued' | 'uploading' | 'completed' | 'failed';
  progress: number;
  retryCount: number;
}

// Uploads continue even when user navigates away
uploadManager.enqueue({ docId: 'tax_returns', uri: fileUri });
uploadManager.subscribe((jobs) => setDocuments(mergeUploadStatus(jobs)));
```

## Component Changes

### ApplicationScreen.tsx Refactor

1. Remove `loading` state blocking initial render
2. Replace `useEffect` data fetch with lazy hydration
3. Convert all `async` handlers to sync + background queue
4. Add Quick Apply entry point
5. Show sync status badge instead of blocking spinners

### New Components

| Component | Purpose |
|-----------|---------|
| `QuickApplySheet.tsx` | Bottom sheet for fast 30-second application |
| `SyncStatusBadge.tsx` | Shows save/sync state without blocking |
| `BackgroundUploadIndicator.tsx` | Floating indicator for ongoing uploads |

## Data Flow

```
User Action → Sync State Update → Render → Async Persist → Sync Indicator Update
     │                                           │
     └───────────────────────────────────────────┘
                    (non-blocking)
```

## Migration Strategy

1. **Phase 1**: Add applicationStore alongside existing services (no breaking changes)
2. **Phase 2**: Refactor ApplicationScreen to use new store
3. **Phase 3**: Add Quick Apply flow
4. **Phase 4**: Add background upload manager
5. **Phase 5**: Remove old blocking patterns

## Correctness Properties

### CP-1: Data Consistency
- Application version number increments on every change
- Server merge uses last-write-wins with version check
- Conflicts surface to user only if data loss would occur

### CP-2: Offline Integrity
- All form data persists to AsyncStorage before any network call
- App restart recovers exact form state
- Queued writes replay in order on reconnection

### CP-3: Upload Reliability
- Failed uploads auto-retry 3 times with exponential backoff
- Upload state persists across app restarts
- Partial uploads resume from last chunk (if supported)

### CP-4: Quick Apply Completeness
- Quick Apply creates valid Application document
- Status set to 'quick_draft' until full details added
- Loan officers can process quick applications with follow-up

## Performance Targets

| Metric | Current | Target |
|--------|---------|--------|
| Time to Interactive | 2-6s | <500ms |
| Step Transition | 500-2000ms | <100ms |
| Save Feedback | Blocking | Async indicator |
| Offline Support | Partial | Full |
