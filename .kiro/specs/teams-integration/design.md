# Microsoft Teams Integration - Technical Design

## Overview

This design integrates Microsoft Teams with the AmPac mobile application using Microsoft Graph API. The integration enables bidirectional communication between entrepreneurs and AmPac staff through notifications, meetings, and messaging channels.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AmPac Mobile App                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │ TeamsService│  │ConsultScreen│  │SettingsScreen│                │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │
│         │                │                │                         │
└─────────┼────────────────┼────────────────┼─────────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Firebase Cloud Functions                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ teamsWebhook│  │createMeeting│  │ sendNotify  │  │  teamsBot  │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘ │
└─────────┼────────────────┼────────────────┼───────────────┼─────────┘
          │                │                │               │
          ▼                ▼                ▼               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Microsoft Graph API                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │  Channels   │  │  Calendar   │  │    Chat     │  │    Bot     │ │
    │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │
    └─────────────────────────────────────────────────────────────────────┘
    ```

    ## Components and Interfaces

    ### 1. TeamsService (Mobile)

Client-side service for Teams-related operations.

```typescript
// apps/mobile/src/services/teamsService.ts

interface TeamsConnection {
  userId: string;
  microsoftId: string;
  email: string;
  displayName: string;
  accessToken: string;  // Short-lived
  refreshToken: string; // Stored in Firebase
  expiresAt: number;
  connectedAt: Timestamp;
}

interface TeamsServiceInterface {
  // OAuth
  initiateConnection(): Promise<string>; // Returns OAuth URL
  handleCallback(code: string): Promise<TeamsConnection>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // Meetings
  getAvailableSlots(advisorId: string, date: Date): Promise<TimeSlot[]>;
  scheduleMeeting(slot: TimeSlot, topic: string): Promise<Meeting>;
  cancelMeeting(meetingId: string): Promise<void>;
  
  // Notifications
  getNotificationPreferences(): Promise<NotificationPrefs>;
  updateNotificationPreferences(prefs: NotificationPrefs): Promise<void>;
}
```

### 2. Cloud Functions (Backend)

Firebase Cloud Functions for server-side Teams operations.

```typescript
// apps/mobile/functions/src/teams/

// Webhook handler for Teams events
export const teamsWebhook = functions.https.onRequest(async (req, res) => {
  // Handle incoming Teams messages, meeting events, etc.
});

// Create Teams meeting
export const createTeamsMeeting = functions.https.onCall(async (data, context) => {
  // Create meeting via Graph API
});

// Send notification to Teams
export const sendTeamsNotification = functions.firestore
  .document('applications/{appId}')
  .onUpdate(async (change, context) => {
    // Send notification on status change
  });

// Teams bot message handler
export const teamsBot = functions.https.onRequest(async (req, res) => {
  // Handle bot commands
});
```

### 3. Microsoft Graph API Integration

```typescript
// apps/mobile/functions/src/teams/graphClient.ts

interface GraphClientConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri: string;
}

class GraphClient {
  // Authentication
  getAuthUrl(state: string): string;
  exchangeCodeForTokens(code: string): Promise<TokenResponse>;
  refreshAccessToken(refreshToken: string): Promise<TokenResponse>;
  
  // Calendar
  getFreeBusy(userId: string, start: Date, end: Date): Promise<FreeBusySlot[]>;
  createOnlineMeeting(params: MeetingParams): Promise<OnlineMeeting>;
  cancelMeeting(meetingId: string): Promise<void>;
  
  // Channels
  createChannel(teamId: string, name: string): Promise<Channel>;
  postMessage(channelId: string, message: string): Promise<void>;
  archiveChannel(channelId: string): Promise<void>;
  
  // Notifications
  sendActivityNotification(userId: string, notification: Notification): Promise<void>;
}
```

## Data Models

### TeamsConnection (Firestore)

```typescript
// Collection: users/{userId}/integrations/teams
interface TeamsConnectionDoc {
  microsoftId: string;
  email: string;
  displayName: string;
  refreshToken: string; // Encrypted
  tokenExpiresAt: Timestamp;
  connectedAt: Timestamp;
  notificationPrefs: {
    applicationUpdates: boolean;
    consultationReminders: boolean;
    messages: boolean;
  };
}
```

### Consultation (Firestore)

```typescript
// Collection: consultations/{consultationId}
interface ConsultationDoc {
  id: string;
  entrepreneurId: string;
  advisorId: string;
  scheduledAt: Timestamp;
  duration: number; // minutes
  topic: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  teamsMeetingId: string;
  teamsMeetingUrl: string;
  recordingUrl?: string;
  transcriptUrl?: string;
  createdAt: Timestamp;
}
```

### TeamsChannel (Firestore)

```typescript
// Collection: teamsChannels/{channelId}
interface TeamsChannelDoc {
  applicationId: string;
  teamId: string;
  channelId: string;
  entrepreneurId: string;
  loanOfficerId: string;
  status: 'active' | 'archived';
  createdAt: Timestamp;
  archivedAt?: Timestamp;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Notification delivery based on connection status
*For any* application status change and user, if the user has a valid Teams connection, a Teams notification payload should be generated; if not connected, no Teams API call should be made.
**Validates: Requirements 1.2, 1.5**

### Property 2: Retry with exponential backoff
*For any* failed notification attempt, the retry delay should follow exponential backoff pattern (delay = baseDelay * 2^attemptNumber) up to 3 attempts.
**Validates: Requirements 1.4**

### Property 3: Meeting creation produces valid payload
*For any* valid time slot and topic, the created meeting request should contain the correct attendees, time, and join URL format.
**Validates: Requirements 2.2, 2.3**

### Property 4: Reminder timing accuracy
*For any* scheduled consultation, a reminder notification should be triggered when the current time is within 15 minutes of the scheduled time and no reminder has been sent yet.
**Validates: Requirements 2.4**

### Property 5: Channel creation on assignment
*For any* application assigned to a loan officer, a Teams channel should be created with a name containing the application ID and both parties should have access.
**Validates: Requirements 3.1**

### Property 6: Message routing bidirectionality
*For any* message sent from Teams to app or app to Teams, the message content should be preserved and delivered to the correct recipient.
**Validates: Requirements 3.2, 3.3**

### Property 7: OAuth URL construction
*For any* OAuth initiation request, the generated URL should contain valid client_id, redirect_uri, scope, and state parameters.
**Validates: Requirements 4.1**

### Property 8: Token refresh before expiry
*For any* access token within 5 minutes of expiry, a refresh should be triggered automatically before the next API call.
**Validates: Requirements 4.3**

### Property 9: Disconnection cleanup
*For any* Teams disconnection, all stored tokens should be removed and the notification preferences should be reset.
**Validates: Requirements 4.4**

### Property 10: Bot command parsing
*For any* bot message, if it matches a known command pattern, the correct handler should be invoked; otherwise, help should be returned.
**Validates: Requirements 5.2, 5.3, 5.4**

### Property 11: Recording storage path
*For any* consultation recording, the storage path should include the user ID and consultation ID for proper access control.
**Validates: Requirements 6.2**

## Error Handling

### OAuth Errors
- Invalid/expired authorization code → Show "Connection failed, please try again"
- User denied consent → Show "Permission required to connect Teams"
- Network error → Show "Network error, please check connection"

### API Errors
- Rate limiting (429) → Implement exponential backoff, queue requests
- Token expired (401) → Auto-refresh token, retry request
- Not found (404) → Log error, show user-friendly message
- Server error (5xx) → Retry with backoff, fall back to in-app only

### Webhook Errors
- Invalid signature → Reject request, log security event
- Malformed payload → Log error, return 400
- Processing error → Return 500, trigger retry from Teams

## Testing Strategy

### Unit Tests
- OAuth URL construction
- Token refresh logic
- Message formatting
- Notification payload generation
- Bot command parsing

### Property-Based Tests
Using fast-check for TypeScript:

- **Property 1**: Generate random users (connected/not connected) and status changes, verify notification behavior
- **Property 2**: Generate failed attempts, verify retry delays follow exponential pattern
- **Property 3**: Generate random time slots and topics, verify meeting payload structure
- **Property 7**: Generate random state values, verify OAuth URL contains all required params
- **Property 10**: Generate random bot messages, verify command routing

### Integration Tests
- OAuth flow end-to-end (with mock Microsoft endpoints)
- Meeting creation and cancellation
- Webhook message handling
- Bot command responses

### Manual Testing
- Real Teams account connection
- Meeting scheduling with actual calendar
- Message delivery between app and Teams
