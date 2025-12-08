# Implementation Tasks

## Phase 1: Application Store Foundation

### Task 1.1: Create ApplicationStore Service ✅ DONE
Create `src/services/applicationStore.ts` with synchronous memory cache and async persistence layer.

**File**: `apps/mobile/src/services/applicationStore.ts`

**Implementation**:
- In-memory draft state with sync getters
- `getCachedDraft()` - returns memory cache instantly
- `hydrateFromStorage()` - loads from AsyncStorage
- `syncWithServer()` - fetches from Firestore, merges with local
- `updateField()` - sync memory update + queued async save
- `subscribe()` - for reactive UI updates
- Version tracking for conflict detection

**Acceptance**: Store can be read synchronously, writes queue in background

---

### Task 1.2: Add Quick Apply Types ✅ DONE
Extend Application type to support quick apply status.

**File**: `apps/mobile/src/types.ts`

**Changes**:
- Add `'quick_draft'` to `ApplicationStatus` type
- Add `QuickApplyData` interface for minimal fields
- Add `isQuickApply?: boolean` flag to Application
- Add `SyncStatus` type for optimistic UI

**Acceptance**: Types compile, existing code unaffected

---

## Phase 2: Optimistic UI Refactor

### Task 2.1: Remove Blocking Load State ✅ DONE
Refactor ApplicationScreen to render immediately without waiting for data.

**File**: `apps/mobile/src/screens/ApplicationScreen.tsx`

**Changes**:
- Remove initial `loading` state that blocks render
- Initialize with `applicationStore.getCachedDraft()` 
- Show form immediately, hydrate fields as data arrives
- Background hydration with `isHydrating` indicator

**Acceptance**: Apply tab shows form within 500ms, no full-screen spinner

---

### Task 2.2: Convert Handlers to Optimistic Updates ✅ DONE
Make all form interactions instant with background persistence.

**File**: `apps/mobile/src/screens/ApplicationScreen.tsx`

**Changes**:
- `handleNextStep()` - remove await, transition instantly
- `handlePrevStep()` - remove await, transition instantly  
- `handleUpdateField()` - sync state update, queue save
- `handleStartNew()` - create local draft instantly, sync in background

**Acceptance**: Step transitions under 100ms, save indicator shows async status

---

### Task 2.3: Create SyncStatusBadge Component ✅ DONE
Visual indicator for save/sync state that doesn't block interaction.

**File**: `apps/mobile/src/components/SyncStatusBadge.tsx`

**Implementation**:
- Shows: "Saved locally" | "Syncing..." | "Synced ✓" | "Offline"
- Compact design, fits in header or footer
- Subscribes to applicationStore sync status

**Acceptance**: Badge updates reactively, no user action required

---

## Phase 3: Quick Apply Flow

### Task 3.1: Create QuickApplySheet Component ✅ DONE
Bottom sheet for 30-second application submission.

**File**: `apps/mobile/src/components/QuickApplySheet.tsx`

**Implementation**:
- Modal bottom sheet (use React Native Modal or similar)
- Fields: Loan type toggle, amount input, business name, phone
- Pre-fill from user profile where available
- "Submit" creates application with status 'quick_draft'
- "Complete full application" link to full wizard

**Acceptance**: Quick apply submits in under 30 seconds

---

### Task 3.2: Add Quick Apply Entry Point ✅ DONE
Add Quick Apply option to product selection step.

**File**: `apps/mobile/src/screens/ApplicationScreen.tsx`

**Changes**:
- Add "Quick Apply" button above/below loan type cards
- Opens QuickApplySheet on press
- After quick submit, navigate to Home with success toast

**Acceptance**: Users can choose quick or full application path

---

### Task 3.3: Update Application Service for Quick Apply ✅ DONE
Handle quick_draft status in application service.

**File**: `apps/mobile/src/services/applicationStore.ts`

**Changes**:
- `createQuickDraft()` - creates minimal application with quick_draft status
- Quick applications stored with isQuickApply flag
- Upgrade path available through normal form flow

**Acceptance**: Quick applications persist and can be completed later

---

## Phase 4: Background Upload Manager

### Task 4.1: Create UploadManager Service ✅ DONE
Manage document uploads independently of form lifecycle.

**File**: `apps/mobile/src/services/uploadManager.ts`

**Implementation**:
- Upload job queue with status tracking
- `enqueue(job)` - add upload to queue
- `subscribe(callback)` - reactive status updates
- Auto-retry failed uploads (3 attempts, exponential backoff)
- Persist queue to AsyncStorage for app restart recovery

**Acceptance**: Uploads continue when navigating away from Documents step

---

### Task 4.2: Integrate UploadManager with ApplicationScreen
Connect upload manager to document upload UI.

**File**: `apps/mobile/src/screens/ApplicationScreen.tsx`

**Changes**:
- Replace direct upload calls with `uploadManager.enqueue()`
- Subscribe to upload status for document list UI
- Show upload progress even on Review step

**Status**: Ready for integration - uploadManager service complete

---

### Task 4.3: Create BackgroundUploadIndicator Component ✅ DONE
Floating indicator showing ongoing upload status.

**File**: `apps/mobile/src/components/BackgroundUploadIndicator.tsx`

**Implementation**:
- Small floating badge/pill when uploads in progress
- Shows count: "Uploading 2/3 documents"
- Tappable to expand details with retry option
- Auto-dismisses when all complete

**Acceptance**: Users aware of upload progress without blocking flow

---

## Phase 5: Polish & Cleanup

### Task 5.1: Add Smart Form Prefill ✅ DONE
Pre-populate fields from user profile.

**Files**: 
- `apps/mobile/src/services/applicationStore.ts`
- `apps/mobile/src/services/userStore.ts`

**Changes**:
- Created userStore for cached user profile access
- `getPrefillData()` returns businessName, phone from user
- `createDraftWithPrefill()` auto-populates known fields

**Acceptance**: Returning users see known data pre-filled

---

### Task 5.2: Add Offline Mode Indicator ✅ DONE
Show clear offline state to users.

**File**: `apps/mobile/src/components/OfflineBanner.tsx`

**Implementation**:
- Detect network state with NetInfo
- Animated slide-in banner when offline
- Shows: "You're offline - changes will sync when connected"
- Integrated into HomeScreen

**Acceptance**: Users know they're offline and data is safe

---

### Task 5.3: Remove Legacy Blocking Code ✅ DONE
Clean up old patterns after new system is stable.

**Files**: Multiple screens and services

**Changes**:
- Removed 6-second timeout logic from ApplicationScreen
- Removed blocking `await` patterns from step handlers
- Removed full-screen loading spinners
- HomeScreen now uses userStore (no blocking load)
- SpacesScreen uses skeleton loaders instead of spinner

**Acceptance**: No regression in functionality, cleaner codebase

---

## Bonus: Project-Wide Optimizations

### Task 6.1: Create UserStore Service ✅ DONE
Global user profile store for instant access across screens.

**File**: `apps/mobile/src/services/userStore.ts`

**Implementation**:
- Sync memory cache with async persistence
- Background server sync
- Subscribe pattern for reactive updates

### Task 6.2: Optimize HomeScreen ✅ DONE
Remove blocking load, use userStore.

**File**: `apps/mobile/src/screens/HomeScreen.tsx`

**Changes**:
- No loading spinner
- Instant render with cached/placeholder data
- Background hydration
- Added OfflineBanner

### Task 6.3: Optimize SpacesScreen ✅ DONE
Replace loading spinner with skeleton loaders.

**File**: `apps/mobile/src/screens/SpacesScreen.tsx`

**Changes**:
- Skeleton loaders during hydration
- Instant layout render
- Cache-first data fetching


---

## Phase 6: Bug Fixes & Backend Setup

### Task 6.4: Deploy Firestore Index ⚠️ MANUAL
Deploy the composite index required for applications query.

**File**: `apps/mobile/firestore.indexes.json`

**Action Required**:
```bash
cd apps/mobile
firebase deploy --only firestore:indexes
```

**Why**: The query `where('userId', '==', userId), orderBy('createdAt', 'desc')` requires a composite index.

**Acceptance**: No "index not found" errors in console

---

### Task 6.5: Fix UserStore Import ✅ DONE
Remove unused `Auth` import from userStore.

**File**: `apps/mobile/src/services/userStore.ts`

**Changes**:
- Removed unused `Auth` type import
- Only importing `getAuth` function

**Acceptance**: No TypeScript warnings

---

### Task 6.6: Verify All Services Compile ✅ DONE
Run diagnostics on all new/modified services.

**Files Verified**:
- `apps/mobile/src/services/userStore.ts` ✅
- `apps/mobile/src/services/applicationStore.ts` ✅
- `apps/mobile/src/services/applications.ts` ✅
- `apps/mobile/src/services/sync.ts` ✅
- `apps/mobile/src/services/upload.ts` ✅
- `apps/mobile/src/services/uploadManager.ts` ✅
- `apps/mobile/src/components/OfflineBanner.tsx` ✅
- `apps/mobile/src/components/SyncStatusBadge.tsx` ✅
- `apps/mobile/src/components/QuickApplySheet.tsx` ✅
- `apps/mobile/src/components/BackgroundUploadIndicator.tsx` ✅

**Acceptance**: All files compile without errors

---

## Running the App

### Prerequisites
1. Install dependencies: `cd apps/mobile && npm install`
2. Deploy Firestore indexes: `firebase deploy --only firestore:indexes`
3. Clear cache if needed: `npx expo start --clear`

### Start Development Server
```bash
cd apps/mobile
npx expo start --tunnel
```

### Troubleshooting
- See `bugfixes.md` for common errors and solutions
