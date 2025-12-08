# Implementation Plan

## Phase 1: Foundation & OAuth

- [ ] 1. Set up Microsoft Azure App Registration
  - [ ] 1.1 Create Azure AD app registration with required permissions
    - Permissions: User.Read, Calendars.ReadWrite, OnlineMeetings.ReadWrite, Channel.Create, ChannelMessage.Send
    - Configure redirect URI for mobile app
    - _Requirements: 4.1_
  - [ ] 1.2 Store Azure credentials in Firebase environment config
    - Client ID, Client Secret, Tenant ID
    - _Requirements: 4.1_

- [ ] 2. Implement OAuth Flow
  - [ ] 2.1 Create TeamsService in mobile app
    - `initiateConnection()` - generates OAuth URL with PKCE
    - `handleCallback()` - exchanges code for tokens
    - `disconnect()` - revokes tokens
    - _Requirements: 4.1, 4.4_
  - [ ]* 2.2 Write property test for OAuth URL construction
    - **Property 7: OAuth URL construction**
    - **Validates: Requirements 4.1**
  - [ ] 2.3 Create TeamsConnectionScreen UI
    - Connect/Disconnect buttons
    - Connection status display
    - Error handling with retry
    - _Requirements: 4.1, 4.5_
  - [ ] 2.4 Implement token storage in Firestore
    - Encrypt refresh tokens before storage
    - Store in users/{userId}/integrations/teams
    - _Requirements: 4.2_
  - [ ]* 2.5 Write property test for disconnection cleanup
    - **Property 9: Disconnection cleanup**
    - **Validates: Requirements 4.4**

- [ ] 3. Implement Token Refresh
  - [ ] 3.1 Create Cloud Function for token refresh
    - Auto-refresh when token expires within 5 minutes
    - Handle refresh failures gracefully
    - _Requirements: 4.3_
  - [ ]* 3.2 Write property test for token refresh timing
    - **Property 8: Token refresh before expiry**
    - **Validates: Requirements 4.3**

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 2: Notifications

- [ ] 5. Implement Application Status Notifications
  - [ ] 5.1 Create Firestore trigger for application status changes
    - Listen to applications/{appId} updates
    - Check if user has Teams connected
    - _Requirements: 1.1, 1.2, 1.3_
  - [ ]* 5.2 Write property test for notification delivery based on connection
    - **Property 1: Notification delivery based on connection status**
    - **Validates: Requirements 1.2, 1.5**
  - [ ] 5.3 Implement sendTeamsNotification Cloud Function
    - Format notification based on status type
    - Include next steps for approved/rejected
    - _Requirements: 1.1, 1.2, 1.3_
  - [ ] 5.4 Implement retry with exponential backoff
    - Max 3 retries
    - Delay = 1s * 2^attempt
    - _Requirements: 1.4_
  - [ ]* 5.5 Write property test for retry backoff
    - **Property 2: Retry with exponential backoff**
    - **Validates: Requirements 1.4**
  - [ ] 5.6 Add fallback to in-app notifications
    - When Teams not connected or all retries fail
    - _Requirements: 1.5_

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 3: Consultation Scheduling

- [ ] 7. Implement Calendar Integration
  - [ ] 7.1 Create getAvailableSlots Cloud Function
    - Query advisor's calendar via Graph API
    - Filter to business hours
    - Return available 30-min slots
    - _Requirements: 2.1_
  - [ ] 7.2 Create ConsultationScreen UI
    - Date picker
    - Available slots list
    - Topic input
    - _Requirements: 2.1_

- [ ] 8. Implement Meeting Creation
  - [ ] 8.1 Create createTeamsMeeting Cloud Function
    - Create online meeting via Graph API
    - Send calendar invites to both parties
    - Return meeting URL
    - _Requirements: 2.2_
  - [ ]* 8.2 Write property test for meeting payload
    - **Property 3: Meeting creation produces valid payload**
    - **Validates: Requirements 2.2, 2.3**
  - [ ] 8.3 Store consultation in Firestore
    - Save meeting ID, URL, scheduled time
    - Link to entrepreneur and advisor
    - _Requirements: 2.3_
  - [ ] 8.4 Display meeting link in app
    - Add to consultation details screen
    - Deep link to Teams app
    - _Requirements: 2.3_

- [ ] 9. Implement Consultation Management
  - [ ] 9.1 Create reminder notification scheduler
    - Cloud Scheduler to check upcoming consultations
    - Send reminder 15 minutes before
    - _Requirements: 2.4_
  - [ ]* 9.2 Write property test for reminder timing
    - **Property 4: Reminder timing accuracy**
    - **Validates: Requirements 2.4**
  - [ ] 9.3 Implement consultation cancellation
    - Cancel Teams meeting via Graph API
    - Notify advisor
    - Update Firestore status
    - _Requirements: 2.5_

- [ ] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 4: Teams Channels for Loan Support

- [ ] 11. Implement Channel Creation
  - [ ] 11.1 Create channel on loan officer assignment
    - Firestore trigger on application assignment
    - Create private channel in AmPac team
    - Add entrepreneur and loan officer
    - _Requirements: 3.1_
  - [ ]* 11.2 Write property test for channel creation
    - **Property 5: Channel creation on assignment**
    - **Validates: Requirements 3.1**
  - [ ] 11.3 Store channel reference in Firestore
    - teamsChannels collection
    - Link to application
    - _Requirements: 3.1_

- [ ] 12. Implement Message Routing
  - [ ] 12.1 Create Teams webhook handler
    - Receive messages from Teams channel
    - Route to entrepreneur's app
    - _Requirements: 3.2_
  - [ ] 12.2 Create app-to-Teams message posting
    - Post entrepreneur replies to channel
    - Format with sender info
    - _Requirements: 3.3_
  - [ ]* 12.3 Write property test for message routing
    - **Property 6: Message routing bidirectionality**
    - **Validates: Requirements 3.2, 3.3**
  - [ ] 12.4 Implement document request parsing
    - Detect document request keywords in Teams messages
    - Create document request in app
    - _Requirements: 3.4_

- [ ] 13. Implement Channel Archival
  - [ ] 13.1 Create scheduled function for channel archival
    - Check for closed applications older than 30 days
    - Archive Teams channel
    - Update Firestore status
    - _Requirements: 3.5_

- [ ] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 5: Teams Bot for Staff

- [ ] 15. Implement Teams Bot
  - [ ] 15.1 Register bot in Azure Bot Service
    - Configure messaging endpoint
    - Set up bot credentials
    - _Requirements: 5.1_
  - [ ] 15.2 Create bot webhook handler
    - Parse incoming messages
    - Route to command handlers
    - _Requirements: 5.2, 5.3, 5.4_
  - [ ]* 15.3 Write property test for bot command parsing
    - **Property 10: Bot command parsing**
    - **Validates: Requirements 5.2, 5.3, 5.4**

- [ ] 16. Implement Bot Commands
  - [ ] 16.1 Implement new application notification
    - Post summary card on new submissions
    - Include applicant name, loan type, amount
    - _Requirements: 5.1_
  - [ ] 16.2 Implement application query command
    - `/app {applicationId}` returns details
    - Show status, documents, timeline
    - _Requirements: 5.2_
  - [ ] 16.3 Implement pending tasks command
    - `/tasks` lists applications awaiting action
    - Filter by assigned loan officer
    - _Requirements: 5.3_
  - [ ] 16.4 Implement help command
    - Return available commands on unrecognized input
    - _Requirements: 5.4_
  - [ ] 16.5 Implement error handling
    - Log errors
    - Return user-friendly messages
    - _Requirements: 5.5_

- [ ] 17. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 6: Meeting Recordings (Optional)

- [ ] 18. Implement Recording Retrieval
  - [ ] 18.1 Create webhook for meeting end events
    - Listen for meeting ended events
    - Check if recording is available
    - _Requirements: 6.1_
  - [ ] 18.2 Download and store recording
    - Retrieve recording from Teams
    - Upload to Firebase Storage
    - _Requirements: 6.2_
  - [ ]* 18.3 Write property test for recording storage path
    - **Property 11: Recording storage path**
    - **Validates: Requirements 6.2**
  - [ ] 18.4 Store transcript in Firestore
    - Parse transcript from Teams
    - Store as text document
    - _Requirements: 6.3_

- [ ] 19. Implement Recording UI
  - [ ] 19.1 Create past consultations screen
    - List completed consultations
    - Show recording and transcript links
    - _Requirements: 6.4_
  - [ ] 19.2 Implement retention policy
    - Scheduled function to check recording age
    - Notify user before deletion
    - _Requirements: 6.5_

- [ ] 20. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
