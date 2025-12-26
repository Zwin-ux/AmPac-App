# Bug Fixes & Backend Setup

## Issues Identified

### 1. Firestore Index Required
The applications query uses `orderBy('createdAt', 'desc')` which requires a composite index.

**Fix Applied**: Updated `firestore.indexes.json` with the required index:
```json
{
  "collectionGroup": "applications",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Action Required**: Deploy the index to Firebase:
```bash
cd apps/mobile
firebase deploy --only firestore:indexes
```

### 2. All Services Verified
- ✅ `sync.ts` - Exists and properly implemented
- ✅ `upload.ts` - Exists with document picker and Firebase Storage
- ✅ `userStore.ts` - Fixed unused import
- ✅ `applicationStore.ts` - Working correctly
- ✅ `OfflineBanner.tsx` - NetInfo is installed in package.json

### 3. Firebase Configuration
The following Firebase services are configured:
- ✅ Authentication (with AsyncStorage persistence)
- ✅ Firestore
- ✅ Storage
- ✅ Analytics (optional)

## Runtime Checklist

Before running the app, ensure:

1. **Install dependencies** (if not done):
   ```bash
   cd apps/mobile
   npm install
   ```

2. **Deploy Firestore indexes**:
   ```bash
   firebase deploy --only firestore:indexes
   ```

3. **Clear Metro cache** (if seeing stale errors):
   ```bash
   npx expo start --clear
   ```

4. **Check Firebase Console**:
   - Firestore database exists
   - Storage bucket is enabled
   - Authentication is enabled (even if not using it yet)

## Common Runtime Errors & Solutions

### "Missing or insufficient permissions"
- Check Firestore rules allow read/write
- Current rules expire on 2025-12-25

### "Index not found" or slow queries
- Deploy the firestore.indexes.json
- Wait 1-2 minutes for index to build

### "Network request failed"
- Check internet connection
- OfflineBanner should show when offline
- Data will sync when back online

### "Cannot read property of null"
- Stores use optimistic patterns
- Check that `getCachedUser()` / `getCachedDraft()` handle null gracefully
- UI should show placeholder data when null

## Files Modified

1. `apps/mobile/src/services/userStore.ts` - Removed unused `Auth` import
2. `apps/mobile/firestore.indexes.json` - Added applications index
