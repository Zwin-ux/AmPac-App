# Requirements Document

## Introduction

This specification defines the requirements for making the AmPac Capital mobile app feature-complete and ready for deployment to the Apple App Store and Google Play Store. The focus is on ensuring all core features work reliably, the app meets store guidelines, and provides a polished user experience for the initial release.

## Glossary

- **Mobile_App**: The AmPac Capital React Native (Expo) mobile application for entrepreneurs
- **Brain_API**: The Python FastAPI backend service providing AI and business logic
- **App_Store**: Apple App Store and Google Play Store collectively
- **Pre_Qualification**: The loan eligibility check flow in the application screen
- **Social_Hub**: The community features including feed, channels, and direct messaging
- **Push_Notification_Service**: The system for sending and receiving push notifications
- **Offline_Mode**: App functionality when network connectivity is unavailable

## Requirements

### Requirement 1: Core Authentication Flow

**User Story:** As a new user, I want to sign up and sign in reliably, so that I can access the app's features securely.

#### Acceptance Criteria

1. WHEN a user opens the app for the first time THEN the Mobile_App SHALL display the splash screen followed by the landing page
2. WHEN a user taps "Sign Up" THEN the Mobile_App SHALL present a registration form with email, password, and name fields
3. WHEN a user submits valid registration credentials THEN the Mobile_App SHALL create their account and navigate to the home screen
4. WHEN a user submits invalid credentials THEN the Mobile_App SHALL display a clear error message without crashing
5. WHEN a user taps "Sign In" THEN the Mobile_App SHALL authenticate against Firebase and navigate to home on success
6. WHEN authentication fails THEN the Mobile_App SHALL display the specific error reason to the user

### Requirement 2: Loan Application Pre-Qualification

**User Story:** As a small business owner, I want to check my loan eligibility quickly, so that I can understand my funding options before completing a full application.

#### Acceptance Criteria

1. WHEN a user navigates to the Apply tab THEN the Mobile_App SHALL display the pre-qualification intro screen
2. WHEN a user starts the pre-check THEN the Mobile_App SHALL present questions about business ownership, loan amount, and years in business
3. WHEN a user enters a loan amount between $5,000 and $49,999 THEN the Mobile_App SHALL route them to micro-loan alternatives instead of rejecting
4. WHEN a user enters a loan amount of $50,000 or more THEN the Mobile_App SHALL continue with standard SBA loan eligibility
5. WHEN a user enters a loan amount below $5,000 THEN the Mobile_App SHALL suggest alternative funding resources
6. WHEN the user qualifies THEN the Mobile_App SHALL display success and provide a link to the secure portal
7. WHEN the user doesn't qualify for standard products THEN the Mobile_App SHALL always offer alternative options or support contact
8. THE Mobile_App SHALL never show a hard rejection without offering next steps

### Requirement 3: Home Screen Dashboard

**User Story:** As a logged-in user, I want to see my business status and quick access to key features, so that I can efficiently manage my business activities.

#### Acceptance Criteria

1. WHEN a user logs in THEN the Mobile_App SHALL display a personalized greeting with their first name
2. WHEN a user has an active loan application THEN the Mobile_App SHALL display the loan status tracker
3. WHEN a user has no active application THEN the Mobile_App SHALL display the "Get Funded" call-to-action card
4. WHEN upcoming events exist THEN the Mobile_App SHALL display up to 3 featured events in a horizontal scroll
5. THE Mobile_App SHALL display the Tools & Services grid with 6 quick-access items
6. WHEN a user taps a tool card THEN the Mobile_App SHALL navigate to the corresponding screen

### Requirement 4: Social Hub Community Features

**User Story:** As an entrepreneur, I want to connect with other business owners and AmPac staff, so that I can build professional relationships and get support.

#### Acceptance Criteria

1. WHEN a user navigates to the Social tab THEN the Mobile_App SHALL display the Social Hub with Channels and Messages sections
2. WHEN a user views channels THEN the Mobile_App SHALL display available community channels
3. WHEN a user taps on a channel THEN the Mobile_App SHALL open the channel chat with message history
4. WHEN a user sends a message in a channel THEN the Mobile_App SHALL deliver it in real-time to other participants
5. WHEN a user views direct messages THEN the Mobile_App SHALL display their private conversations
6. WHEN a user starts a new direct message THEN the Mobile_App SHALL create or open an existing conversation thread
7. THE Mobile_App SHALL support text messages and emoji in all chat interfaces

### Requirement 5: Push Notifications

**User Story:** As a user, I want to receive timely notifications about my application status and messages, so that I stay informed without constantly checking the app.

#### Acceptance Criteria

1. WHEN the app launches THEN the Push_Notification_Service SHALL request notification permissions from the user
2. WHEN a user grants permission THEN the Push_Notification_Service SHALL register the device token with Firebase
3. WHEN a user receives a new direct message THEN the Push_Notification_Service SHALL deliver a push notification
4. WHEN a user taps a notification THEN the Mobile_App SHALL navigate to the relevant screen via deep linking
5. WHEN a user opens notification settings THEN the Mobile_App SHALL allow toggling notification categories
6. THE Push_Notification_Service SHALL update app badge counts for unread messages

### Requirement 6: Offline Mode and Error Handling

**User Story:** As a user with unreliable internet, I want the app to work gracefully when offline, so that I can still access cached content and queue actions.

#### Acceptance Criteria

1. WHEN network connectivity is lost THEN the Mobile_App SHALL display an offline indicator banner
2. WHEN offline THEN the Mobile_App SHALL display cached content from previous sessions
3. WHEN a user attempts an action while offline THEN the Mobile_App SHALL queue the action for later sync
4. WHEN connectivity is restored THEN the Mobile_App SHALL automatically sync queued actions
5. WHEN an API call fails THEN the Mobile_App SHALL retry with exponential backoff up to 3 times
6. WHEN all retries fail THEN the Mobile_App SHALL display a user-friendly error message
7. THE Mobile_App SHALL never crash due to network errors

### Requirement 7: AI Assistant Reliability

**User Story:** As a user, I want the AI assistant to provide helpful responses even when the backend is unavailable, so that I can always get guidance.

#### Acceptance Criteria

1. WHEN a user asks the AI assistant a question THEN the Mobile_App SHALL attempt to connect to the Brain_API
2. WHEN the Brain_API responds successfully THEN the Mobile_App SHALL display the AI response within 5 seconds
3. WHEN the Brain_API is unavailable THEN the Mobile_App SHALL provide contextual fallback responses
4. WHEN the connection times out after 8 seconds THEN the Mobile_App SHALL return a fallback response
5. THE fallback responses SHALL be relevant to common loan and business questions
6. THE Mobile_App SHALL log connection failures for monitoring

### Requirement 8: Payment Integration

**User Story:** As a user, I want to make payments securely through the app, so that I can pay application fees and other charges conveniently.

#### Acceptance Criteria

1. WHEN a user navigates to Payments THEN the Mobile_App SHALL display available payment options
2. WHEN a user initiates a payment THEN the Mobile_App SHALL present the Stripe payment sheet
3. WHEN payment succeeds THEN the Mobile_App SHALL display a confirmation and update the payment status
4. WHEN payment fails THEN the Mobile_App SHALL display the error reason and allow retry
5. THE Mobile_App SHALL use HTTPS for all payment-related API calls
6. THE Mobile_App SHALL not store sensitive payment information locally

### Requirement 9: App Store Compliance

**User Story:** As the app publisher, I want the app to meet all App Store guidelines, so that it gets approved on first submission.

#### Acceptance Criteria

1. THE Mobile_App SHALL include all required privacy permission descriptions in Info.plist
2. THE Mobile_App SHALL declare non-exempt encryption status correctly
3. THE Mobile_App SHALL provide a privacy policy accessible from within the app
4. THE Mobile_App SHALL handle all edge cases without crashing
5. THE Mobile_App SHALL load all screens within 3 seconds on average devices
6. THE Mobile_App SHALL support iOS 15+ and Android API 24+
7. THE Mobile_App SHALL include proper app icons and splash screens for all required sizes

### Requirement 10: Content Moderation and Safety

**User Story:** As a community member, I want to report inappropriate content and block problematic users, so that the community remains safe and professional.

#### Acceptance Criteria

1. WHEN a user views a post or message THEN the Mobile_App SHALL provide a report option
2. WHEN a user reports content THEN the Mobile_App SHALL submit the report to the moderation queue
3. WHEN a user blocks another user THEN the Mobile_App SHALL hide that user's content and prevent messaging
4. THE Mobile_App SHALL display community guidelines accessible from the Social Hub
5. THE Mobile_App SHALL implement basic profanity filtering on user-generated content
