# Firestore Permission Error - Troubleshooting Guide

## Current Issue

You're seeing: `FirebaseError: [code=permission-denied]: Missing or insufficient permissions`

Even though you've published the correct security rules.

## Why This Is Happening

### Possible Causes

1. **Rules Haven't Propagated Yet** (Most Likely)
   - Firestore rules can take 1-2 minutes to propagate globally
   - Your rules are correct, just need to wait

2. **User Not Authenticated Properly**
   - The error shows `userId: "dev-user"`
   - This might be a test/development user that's not properly authenticated

3. **Specific Collection Missing**
   - Some collection might not be covered by the rules

## Quick Fix Steps

### Option 1: Wait for Rules to Propagate (Recommended)

1. **Wait 2-3 minutes** after publishing rules
2. **Hard refresh** the app:

   ```bash
   # Stop the server (Ctrl+C)
   # Clear Metro bundler cache
   npm start -- --reset-cache
   ```

### Option 2: Verify Authentication

Check if you're properly signed in:

1. Look at the console log: `userId: "dev-user"`
2. This should be a real Firebase UID (like `IPfmqh2rxGUrXqHuwPCNNGlzB1F2`)
3. If it says "dev-user", you might not be authenticated

**To fix**:

- Sign out and sign back in
- Check if `auth.currentUser` is properly set

### Option 3: Temporarily Allow All (Testing Only)

**⚠️ ONLY FOR TESTING - DO NOT USE IN PRODUCTION**

Temporarily update Firestore rules to allow all reads:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

This will:

- ✅ Let you test if it's a rules issue
- ✅ Identify which collection is problematic
- ❌ **Must be replaced with proper rules before launch**

### Option 4: Check Specific Collection

The error is in a snapshot listener. Check which collection:

1. Look at the stack trace in your console
2. Find which service is calling `onSnapshot`
3. Verify that collection has rules

## Most Likely Solution

Based on your setup, the issue is **rules propagation delay**.

**Do this**:

1. Wait 2 minutes
2. Stop the app (Ctrl+C)
3. Restart with cache clear:

   ```bash
   npm start -- --reset-cache
   ```

4. Test again

## If Still Not Working

Check Firebase Console:

1. Go to **Firestore Database** → **Rules**
2. Verify rules show as "Published" with recent timestamp
3. Check **Usage** tab for any error patterns

## Debug: Check Which Collection Is Failing

Add this to your code temporarily to see which collection:

```typescript
// In any service with onSnapshot
return onSnapshot(q, (snapshot) => {
  console.log('✅ Snapshot success for collection:', 'COLLECTION_NAME');
  // ... rest of code
}, (error) => {
  console.error('❌ Snapshot error for collection:', 'COLLECTION_NAME', error);
});
```

This will tell you exactly which collection is causing the issue.

## Expected Timeline

- **Rules published**: ✅ Done
- **Rules propagated**: ⏳ 1-2 minutes
- **App restarted**: ⏳ Pending
- **Errors resolved**: ⏳ After restart

**Try restarting with `--reset-cache` now!**
