# Requirements Document

## Introduction

This feature integrates Microsoft Teams with the AmPac mobile application to enhance communication between entrepreneurs and AmPac staff. The integration enables real-time notifications, scheduled consultations via Teams meetings, and seamless communication channels for loan application support and business advisory services.

## Glossary

- **AmPac System**: The AmPac mobile application and its backend services
- **Teams Bot**: An automated Microsoft Teams bot that sends notifications and facilitates interactions
- **Loan Officer**: AmPac staff member who reviews and processes loan applications
- **Entrepreneur**: Small business owner using the AmPac platform
- **Consultation**: A scheduled video meeting between an entrepreneur and AmPac staff
- **Webhook**: An HTTP callback that delivers real-time notifications

## Requirements

### Requirement 1: Application Status Notifications

**User Story:** As an entrepreneur, I want to receive Teams notifications about my loan application status, so that I stay informed without constantly checking the app.

#### Acceptance Criteria

1. WHEN a loan application status changes to 'submitted' THEN the AmPac System SHALL send a Teams notification to the assigned loan officer channel
2. WHEN a loan application status changes to 'under_review' THEN the AmPac System SHALL send a Teams notification to the entrepreneur (if Teams-connected)
3. WHEN a loan application status changes to 'approved' or 'rejected' THEN the AmPac System SHALL send a Teams notification with next steps to the entrepreneur
4. WHEN a notification fails to send THEN the AmPac System SHALL retry up to 3 times with exponential backoff
5. WHEN an entrepreneur has not connected Teams THEN the AmPac System SHALL fall back to in-app notifications only

### Requirement 2: Schedule Consultations via Teams

**User Story:** As an entrepreneur, I want to schedule a consultation with an AmPac advisor through Teams, so that I can get personalized business guidance via video call.

#### Acceptance Criteria

1. WHEN an entrepreneur requests a consultation THEN the AmPac System SHALL display available time slots from the advisor's calendar
2. WHEN an entrepreneur selects a time slot THEN the AmPac System SHALL create a Teams meeting and send calendar invites to both parties
3. WHEN a consultation is scheduled THEN the AmPac System SHALL store the meeting link and display it in the app
4. WHEN a scheduled consultation is within 15 minutes THEN the AmPac System SHALL send a reminder notification
5. WHEN an entrepreneur cancels a consultation THEN the AmPac System SHALL cancel the Teams meeting and notify the advisor

### Requirement 3: Teams Channel for Loan Support

**User Story:** As a loan officer, I want to communicate with entrepreneurs through a dedicated Teams channel, so that I can provide support and request additional documents efficiently.

#### Acceptance Criteria

1. WHEN a loan application is assigned to a loan officer THEN the AmPac System SHALL create a private Teams channel for that application
2. WHEN a loan officer sends a message in the channel THEN the AmPac System SHALL deliver the message to the entrepreneur's app
3. WHEN an entrepreneur replies from the app THEN the AmPac System SHALL post the reply to the Teams channel
4. WHEN a document is requested via Teams THEN the AmPac System SHALL create a document request in the entrepreneur's app
5. WHEN the loan application is closed THEN the AmPac System SHALL archive the Teams channel after 30 days

### Requirement 4: Teams Account Connection

**User Story:** As an entrepreneur, I want to connect my Microsoft account to AmPac, so that I can receive Teams notifications and join meetings seamlessly.

#### Acceptance Criteria

1. WHEN an entrepreneur initiates Teams connection THEN the AmPac System SHALL redirect to Microsoft OAuth consent screen
2. WHEN OAuth consent is granted THEN the AmPac System SHALL store the refresh token securely in Firebase
3. WHEN a connected account token expires THEN the AmPac System SHALL automatically refresh the token
4. WHEN an entrepreneur disconnects Teams THEN the AmPac System SHALL revoke tokens and stop sending Teams notifications
5. WHEN OAuth fails THEN the AmPac System SHALL display a clear error message with retry option

### Requirement 5: AmPac Staff Teams Bot

**User Story:** As an AmPac staff member, I want a Teams bot that summarizes new applications and pending tasks, so that I can manage my workload efficiently.

#### Acceptance Criteria

1. WHEN a new loan application is submitted THEN the Teams Bot SHALL post a summary card to the loan officers channel
2. WHEN a staff member queries the bot with an application ID THEN the Teams Bot SHALL return application details and status
3. WHEN a staff member requests their pending tasks THEN the Teams Bot SHALL list all applications awaiting their action
4. WHEN the bot receives an unrecognized command THEN the Teams Bot SHALL respond with available commands help
5. WHEN the bot encounters an error THEN the Teams Bot SHALL log the error and respond with a user-friendly message

### Requirement 6: Meeting Recording and Transcription

**User Story:** As an entrepreneur, I want consultation recordings and transcripts saved to my account, so that I can review the advice given later.

#### Acceptance Criteria

1. WHEN a consultation meeting ends THEN the AmPac System SHALL retrieve the recording from Teams (if recording was enabled)
2. WHEN a recording is available THEN the AmPac System SHALL store it in Firebase Storage linked to the user's account
3. WHEN a transcript is available THEN the AmPac System SHALL store the transcript text in Firestore
4. WHEN an entrepreneur views past consultations THEN the AmPac System SHALL display recordings and transcripts
5. WHEN a recording is older than 1 year THEN the AmPac System SHALL notify the user before automatic deletion
