# Integrated Borrower Experience Roadmap

## Vision

To create a unified "Borrower Portal" within the AmPac Mobile App where entrepreneurs can manage their entire loan lifecycle without needing to interact directly with disparate backend systems (Ventures, ShareFile, Outlook). The app acts as a simplified frontend for these complex enterprise tools.

## 1. Ventures (LOS) Integration

*Objective: Real-time transparency and data synchronization.*

### A. Status Synchronization (Ventures -> App)

- **Concept**: The "Black Box" problem. Borrowers often don't know where their loan is.
- **Implementation**:
  - Map Ventures "Loan Status" (e.g., "Underwriting", "Committee", "Closing") to user-friendly App Statuses.
  - **Webhooks/Polling**: The `Brain` service polls Ventures for status changes or receives webhooks.
  - **Notification**: Push notification to the mobile app: "Your loan has moved to Underwriting."
  - **UI**: A visual "Pizza Tracker" progress bar in the app.

### B. Task & Condition Sync (Bi-Directional)

- **Concept**: Underwriters create "Conditions" in Ventures (e.g., "Provide 2023 Tax Return"). These should appear as "Tasks" in the app.
- **Flow**:
  1. Staff adds Condition in Ventures.
  2. `Brain` syncs this to a Firestore `Task` document.
  3. App displays "Action Required: Upload 2023 Tax Return".
  4. Borrower completes task -> `Brain` updates Ventures Condition to "Received".

### C. Data Pre-filling (Ventures -> App)

- **Concept**: Repeat borrowers shouldn't re-type data.
- **Implementation**:
  - When a user starts a new application, query Ventures for existing "Entity" records.
  - Pre-fill Business Name, EIN, Address, and Owner info from the LOS.

## 2. ShareFile Integration

*Objective: Secure, organized document exchange.*

### A. Intelligent Uploads

- **Current State**: Uploads go to generic Firebase Storage.
- **Future State**:
  - When an Application is created, `Brain` creates a specific Folder structure in ShareFile: `Clients/{BorrowerName}/{LoanID}/`.
  - **Direct Upload**: Mobile app uploads directly to this ShareFile folder (or proxies through `Brain` to keep API keys hidden).
  - **Metadata**: Files are tagged with the Document Type (e.g., "Tax Return") for easy sorting by staff.

### B. Document Review & Signing

- **Concept**: Staff uploads a document for the borrower to see/sign.
- **Flow**:
  1. Staff uploads "Commitment Letter" to the ShareFile folder.
  2. `Brain` detects new file -> Creates `Document` record in Firestore.
  3. App shows "New Document Available".
  4. **Preview**: App uses ShareFile API to generate a secure preview link.

## 3. Microsoft Teams Integration

*Objective: Human connection.*

### A. Contextual Chat

- **Feature**: "Chat with my Loan Officer".
- **Backend**: Instead of building a custom chat, this view wraps a specific Microsoft Teams 1:1 chat thread.
- **Benefit**: Staff stays in Teams; Borrower stays in App.

### B. Meeting Scheduler

- **Feature**: "Schedule a Call".
- **Integration**: Uses Microsoft Graph to find free slots on the Loan Officer's Outlook calendar.
- **Action**: Creates a Teams Meeting link and adds it to both calendars.

## 4. Technical Architecture

### The "Brain" (Middleware)

The Python FastAPI service (`apps/brain`) acts as the orchestrator:

- **Ventures Client**: Handles SOAP/REST calls to the LOS.
- **ShareFile Client**: Manages OAuth tokens and folder creation.
- **Graph Client**: Manages Teams/Outlook interactions.
- **Firestore**: Acts as the "Cache" for the Mobile App. The App *never* talks to Ventures/ShareFile directly; it reads the Firestore state which `Brain` keeps in sync.

## 5. User Stories

### Story: The "Missing Doc"

1. **Underwriter (Ventures)**: Reviews file, notices missing K-1. Adds Condition: "Missing K-1 for 2023".
2. **System**: `Brain` detects new condition -> Creates Firestore Task -> Pushes Notification.
3. **Borrower (Mobile)**: Taps notification. Sees "Upload K-1".
4. **Action**: Takes photo of K-1. Uploads.
5. **System**: File goes to ShareFile `.../Financials/`. Task marked "Pending Review". Ventures Condition updated to "Received".
6. **Underwriter**: Sees "Received" in Ventures. Opens ShareFile link. Approves.

### Story: The "Status Update"

1. **Committee**: Approves the loan.
2. **Staff (Ventures)**: Changes status to "Approved".
3. **System**: `Brain` updates Firestore Application Status.
4. **Borrower (Mobile)**: Confetti animation on screen. "Congratulations! Your loan is approved."
