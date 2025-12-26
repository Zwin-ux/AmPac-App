# Firestore Indexes for AmPac Social Features

## Required Composite Indexes

To enable the comment system and social features, you need to create the following composite indexes in Firebase Console.

### How to Create Indexes

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your AmPac project
3. Navigate to **Firestore Database** → **Indexes** tab
4. Click **Create Index** for each index below

---

## Comment System Indexes

### Index 1: Comments by Post (Top-Level)

**Purpose**: Fetch top-level comments for a post, ordered by creation time

- **Collection ID**: `comments`
- **Fields**:
  - `postId` - Ascending
  - `parentCommentId` - Ascending  
  - `createdAt` - Descending
- **Query scope**: Collection

**Why needed**: Used by `commentService.subscribeToComments()` to get real-time comment updates

---

### Index 2: Replies to Comments

**Purpose**: Fetch replies to a specific comment

- **Collection ID**: `comments`
- **Fields**:
  - `parentCommentId` - Ascending
  - `createdAt` - Ascending
- **Query scope**: Collection

**Why needed**: Used by `commentService.getReplies()` to load nested replies

---

## Notification System Indexes

### Index 3: Unread Notifications by User

**Purpose**: Fetch unread notifications for a user, sorted by recency

- **Collection ID**: `notifications`
- **Fields**:
  - `userId` - Ascending
  - `read` - Ascending
  - `createdAt` - Descending
- **Query scope**: Collection

**Why needed**: Used by `notificationService.subscribeToNotifications()` for real-time notification updates

---

## Feed Algorithm Indexes

### Index 4: Posts by Engagement Score

**Purpose**: Fetch posts sorted by engagement for algorithmic feed

- **Collection ID**: `posts`
- **Fields**:
  - `engagementScore` - Descending
  - `createdAt` - Descending
- **Query scope**: Collection

**Why needed**: Will be used by advanced feed algorithm for personalized content

---

### Index 5: Posts by Organization

**Purpose**: Fetch posts from a specific organization/community

- **Collection ID**: `posts`
- **Fields**:
  - `orgId` - Ascending
  - `createdAt` - Descending
- **Query scope**: Collection

**Why needed**: Used to filter posts by business or community

---

## Business/Network Indexes

### Index 6: Events by Organizer

**Purpose**: Fetch events created by a specific business owner

- **Collection ID**: `events`
- **Fields**:
  - `organizerId` - Ascending
  - `date` - Ascending
- **Query scope**: Collection

**Why needed**: Used in `BusinessAdminScreen` to calculate engagement stats

---

### Index 7: Businesses by Industry and City

**Purpose**: Filter businesses by industry and location

- **Collection ID**: `businesses`
- **Fields**:
  - `industry` - Ascending
  - `city` - Ascending
  - `isVerified` - Ascending
- **Query scope**: Collection

**Why needed**: For advanced business directory filtering (future feature)

---

## Quick Setup Commands

If you prefer using Firebase CLI:

\`\`\`bash

# Install Firebase CLI if not already installed

npm install -g firebase-tools

# Login to Firebase

firebase login

# Initialize Firestore in your project directory

cd apps/mobile
firebase init firestore

# Deploy indexes

firebase deploy --only firestore:indexes
\`\`\`

Then create a `firestore.indexes.json` file:

\`\`\`json
{
  "indexes": [
    {
      "collectionGroup": "comments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "postId", "order": "ASCENDING" },
        { "fieldPath": "parentCommentId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "comments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "parentCommentId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "read", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "posts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "engagementScore", "order": "DESCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "posts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "orgId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "organizerId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" }
      ]
    }
  ]
}
\`\`\`

---

## Testing Indexes

After creating indexes, test them:

1. **Open the app** and navigate to a post
2. **Click the comment button** - should load comments instantly
3. **Add a comment** - should appear in real-time
4. **Reply to a comment** - should nest properly
5. **Check notifications** - should receive comment/reply notifications

If you see errors like "The query requires an index", Firebase will provide a direct link to create the missing index.

---

## Index Build Time

- **Small datasets** (< 1000 docs): ~1-2 minutes
- **Medium datasets** (1K-10K docs): ~5-15 minutes  
- **Large datasets** (> 10K docs): ~30-60 minutes

You can monitor index build progress in the Firebase Console under **Firestore** → **Indexes**.

---

## Cost Considerations

- **Index storage**: ~$0.18/GB/month
- **Index writes**: Included in document write costs
- **Index reads**: No additional cost

For a typical entrepreneur community with 1,000 active users:

- **Estimated index storage**: ~50MB = **$0.01/month**
- **Very affordable** for the functionality gained!

---

## Troubleshooting

### "Missing index" error

- Click the link in the error message to auto-create the index
- Or manually create it using the specs above

### Slow query performance

- Check if the index is still building
- Verify you're using the indexed fields in your query

### Index not working

- Ensure field names match exactly (case-sensitive)
- Check query scope (Collection vs Collection Group)
- Verify sort order (Ascending vs Descending)

---

## Next Steps

After creating indexes:

1. ✅ Test comment functionality
2. ✅ Verify notifications work
3. ✅ Monitor Firestore usage in Console
4. 📊 Set up usage alerts (recommended: alert at 80% of free tier)
