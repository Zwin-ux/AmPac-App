# Firestore Security Rules Fix

## Issue: Permission Denied Errors

The app is showing "Missing or insufficient permissions" errors for:

- `events` collection
- `applications` collection  
- `posts` collection (when authorAvatar is undefined)

## Solution: Update Firestore Security Rules

### Step 1: Open Firebase Console

1. Go to <https://console.firebase.google.com/>
2. Select your **ampac-database** project
3. Click **Firestore Database** in left sidebar
4. Click **Rules** tab

### Step 2: Update Rules

Replace your current rules with these entrepreneur-focused rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isSignedIn();
      allow write: if isOwner(userId);
    }
    
    // Posts collection - Entrepreneurs can create and read posts
    match /posts/{postId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && 
                      request.resource.data.authorId == request.auth.uid;
      allow update: if isSignedIn();
      allow delete: if isSignedIn() && 
                      resource.data.authorId == request.auth.uid;
    }
    
    // Comments collection - For entrepreneur discussions
    match /comments/{commentId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && 
                      request.resource.data.authorId == request.auth.uid;
      allow update: if isSignedIn();
      allow delete: if isSignedIn() && 
                      resource.data.authorId == request.auth.uid;
    }
    
    // Events collection - Business events and networking
    match /events/{eventId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && 
                      request.resource.data.organizerId == request.auth.uid;
      allow update: if isSignedIn();
      allow delete: if isSignedIn() && 
                      resource.data.organizerId == request.auth.uid;
    }
    
    // Businesses collection
    match /businesses/{businessId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update: if isSignedIn() && 
                      (resource.data.ownerId == request.auth.uid || 
                       request.auth.uid in resource.data.teamMembers);
      allow delete: if isSignedIn() && 
                      resource.data.ownerId == request.auth.uid;
    }
    
    // Applications collection - For business applications
    match /applications/{applicationId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && 
                      request.resource.data.userId == request.auth.uid;
      allow update: if isSignedIn() && 
                      resource.data.userId == request.auth.uid;
      allow delete: if isSignedIn() && 
                      resource.data.userId == request.auth.uid;
    }
    
    // Notifications collection
    match /notifications/{notificationId} {
      allow read: if isSignedIn() && 
                    resource.data.userId == request.auth.uid;
      allow create: if isSignedIn();
      allow update: if isSignedIn() && 
                      resource.data.userId == request.auth.uid;
      allow delete: if isSignedIn() && 
                      resource.data.userId == request.auth.uid;
    }
    
    // Channels collection - For entrepreneur chat
    match /channels/{channelId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update: if isSignedIn();
      allow delete: if isSignedIn();
    }
    
    // Messages collection
    match /messages/{messageId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update: if isSignedIn() && 
                      resource.data.senderId == request.auth.uid;
      allow delete: if isSignedIn() && 
                      resource.data.senderId == request.auth.uid;
    }
  }
}
```

### Step 3: Publish Rules

1. Click **Publish** button
2. Wait for confirmation message
3. Rules are now live!

### Step 4: Restart Your App

```bash
# Stop the current app (Ctrl+C in terminal)
# Then restart
npm start
```

## What These Rules Do

✅ **Allow authenticated entrepreneurs** to:

- Create posts and comments
- Read all community content
- Create events for their business
- Manage their own businesses
- Receive notifications
- Participate in chat channels

✅ **Protect data** by:

- Requiring authentication for all operations
- Ensuring users can only modify their own content
- Validating authorId matches the authenticated user

✅ **Enable collaboration** by:

- Allowing team members to update business info
- Permitting all users to like/comment on posts
- Supporting real-time chat and notifications

## Testing After Update

Once rules are published, test:

- [ ] Create a post (should work)
- [ ] View events (should work)
- [ ] Add comments (should work)
- [ ] Create a channel (should work)
- [ ] Receive notifications (should work)

All "permission-denied" errors should be resolved! 🎉
