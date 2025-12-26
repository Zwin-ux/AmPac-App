# Firestore Index Creation - Quick Start Guide

## Step-by-Step Instructions

### Option 1: Create Indexes via Firebase Console (Recommended)

1. **Open Firebase Console**: <https://console.firebase.google.com/>
2. **Select your AmPac project**
3. **Navigate to Firestore Database** (left sidebar)
4. **Click "Indexes" tab** (top of page)
5. **Click "Create Index"** button

### Create These 3 Critical Indexes

#### Index 1: Comments by Post

```
Collection ID: comments
Fields to index:
  - postId: Ascending
  - parentCommentId: Ascending
  - createdAt: Descending
Query scope: Collection
```

#### Index 2: Comment Replies

```
Collection ID: comments
Fields to index:
  - parentCommentId: Ascending
  - createdAt: Ascending
Query scope: Collection
```

#### Index 3: Notifications

```
Collection ID: notifications
Fields to index:
  - userId: Ascending
  - read: Ascending
  - createdAt: Descending
Query scope: Collection
```

---

### Option 2: Auto-Create via Error Links (Easiest!)

1. **Run the app** and try to view comments on a post
2. **Firestore will show an error** with a direct link
3. **Click the link** - it auto-creates the index!
4. **Repeat** for each missing index

This is the fastest method! 🚀

---

### Option 3: Firebase CLI (For Developers)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Navigate to your project
cd apps/mobile

# Create firestore.indexes.json file (see FIRESTORE_INDEXES.md)

# Deploy indexes
firebase deploy --only firestore:indexes
```

---

## Testing Checklist

Once indexes are created:

- [ ] Open AmPac mobile app
- [ ] Navigate to Feed
- [ ] Create a test post
- [ ] Click comment icon
- [ ] Add a comment
- [ ] ✅ Verify comment appears instantly
- [ ] Reply to the comment
- [ ] ✅ Verify reply is nested
- [ ] Like the post
- [ ] ✅ Verify heart turns red
- [ ] Check notifications
- [ ] ✅ Verify comment notification received

---

## Expected Build Time

- **Small dataset** (< 1K docs): 1-2 minutes
- **Medium dataset** (1K-10K docs): 5-15 minutes
- **Large dataset** (> 10K docs): 30-60 minutes

You can monitor progress in Firebase Console → Indexes tab.

---

## Need Help?

If you see "Missing index" errors:

1. Click the error link to auto-create
2. Or manually create using specs above
3. Wait for index to build (check status in Console)

The comment system will work perfectly once indexes are ready! 🎉
