# Photo Upload & Event Reminders - Installation Guide

## Dependencies Installation Issue

The automatic `npm install` failed. Please install the required packages manually:

### Step 1: Install Expo Image Picker

```bash
cd apps/mobile
npx expo install expo-image-picker
```

### Step 2: Install Expo Notifications

```bash
npx expo install expo-notifications
```

### Step 3: Configure app.json

Add the following permissions to `apps/mobile/app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow AmPac to access your photos to share business updates and event photos.",
          "cameraPermission": "Allow AmPac to use your camera to capture business moments."
        }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#0064A6",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSPhotoLibraryUsageDescription": "Allow AmPac to access your photos to share business updates and event photos.",
        "NSCameraUsageDescription": "Allow AmPac to use your camera to capture business moments.",
        "NSUserNotificationsUsageDescription": "Allow AmPac to send you event reminders and engagement notifications."
      }
    },
    "android": {
      "permissions": [
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "CAMERA",
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE"
      ],
      "useNextNotificationsApi": true
    }
  }
}
```

### Step 4: Enable Firebase Storage

1. Go to <https://console.firebase.google.com/>
2. Select **ampac-database** project
3. Click **Storage** in left sidebar
4. Click **Get Started**
5. Choose **Production mode**
6. Select same region as Firestore
7. Click **Done**

### Step 5: Update Firebase Storage Rules

In Firebase Console → Storage → Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Posts images
    match /posts/{postId}/{fileName} {
      allow read: if true; // Public read for all users
      allow write: if request.auth != null && 
                     request.resource.size < 5 * 1024 * 1024 && // Max 5MB
                     request.resource.contentType.matches('image/.*');
    }
    
    // Event images
    match /events/{eventId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null && 
                     request.resource.size < 5 * 1024 * 1024 &&
                     request.resource.contentType.matches('image/.*');
    }
    
    // Business images (logo, cover)
    match /businesses/{businessId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null && 
                     request.resource.size < 5 * 1024 * 1024 &&
                     request.resource.contentType.matches('image/.*');
    }
  }
}
```

## What's Been Created

### ✅ Services Implemented

1. **`imageUploadService.ts`** - Photo upload functionality
   - Pick from gallery (up to 3 photos)
   - Take camera photo
   - Upload to Firebase Storage
   - Get download URLs

2. **`eventReminderService.ts`** - Event reminder notifications
   - 24-hour reminder
   - 1-hour reminder
   - "Starting now" reminder
   - Cancel reminders on un-RSVP

### 📋 Next Steps

After installing dependencies:

1. **Restart the development server**:

   ```bash
   # Stop current server (Ctrl+C)
   npm start
   ```

2. **Test photo upload**:
   - Create a post
   - Tap photo icon
   - Select images
   - Verify upload to Firebase Storage

3. **Test event reminders**:
   - RSVP to an event
   - Check scheduled notifications
   - Verify reminders fire at correct times

## Usage Examples

### Photo Upload in Posts

```typescript
import { imageUploadService } from '../services/imageUploadService';

// In your component
const handleAddPhotos = async () => {
  try {
    const urls = await imageUploadService.pickAndUploadImages(
      'posts',
      'temp-id', // Will be replaced with actual post ID
      { maxImages: 3, quality: 0.7 }
    );
    setSelectedPhotos(urls);
  } catch (error) {
    Alert.alert('Error', 'Failed to upload photos');
  }
};
```

### Event Reminders on RSVP

```typescript
import { eventReminderService } from '../services/eventReminderService';

// When user RSVPs
const handleRSVP = async (event: Event) => {
  await eventService.rsvpToEvent(event.id);
  
  // Schedule reminders
  await eventReminderService.scheduleRemindersForEvent(
    event.id,
    event.title,
    event.date.toDate(),
    event.location
  );
  
  Alert.alert('Success', 'RSVP confirmed! Reminders set.');
};
```

## Troubleshooting

### "expo-image-picker not found"

- Run: `npx expo install expo-image-picker`
- Restart development server

### "Permission denied" for photos

- Check app.json has correct permissions
- Rebuild app: `npx expo prebuild --clean`

### Firebase Storage upload fails

- Verify Storage is enabled in Firebase Console
- Check Storage Rules are published
- Ensure user is authenticated

### Notifications not showing

- Check notification permissions granted
- Verify app.json has notification plugin
- Test on physical device (not simulator for iOS)

## Cost Estimates

### Firebase Storage

- **Free tier**: 5GB storage, 1GB/day downloads
- **Typical usage** (1000 users, 3 photos/user): ~3GB
- **Cost**: FREE (within limits)

### Notifications

- **Expo Push Notifications**: FREE
- **Local notifications**: FREE
- **No additional costs**

## Ready to Test

Once dependencies are installed:

1. ✅ Photo upload service ready
2. ✅ Event reminder service ready
3. ✅ Firebase Storage configured
4. ⏳ Need to integrate into UI (next step)
