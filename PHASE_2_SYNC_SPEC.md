# Phase 2: The "Sync" Core - Detailed Specification

## Objective
Establish a robust, bi-directional data synchronization engine between the "System of Record" (Ventures/Mock) and the "System of Engagement" (Firestore/App). This ensures that when a Loan Officer updates a file in the back office, the Borrower sees it instantly on their phone, and vice versa.

---

## 1. Data Architecture & Schema

### A. Firestore Schema (The "App" State)
We need to formalize the schema in Firestore to support syncing.

**Collection: `applications`**
*   `id` (string): Auto-generated or UUID.
*   `userId` (string): Link to `users` collection.
*   `venturesLoanId` (string): The foreign key to the LOS.
*   `businessName` (string): Snapshot of business name.
*   `status` (string): Normalized status (e.g., `draft`, `submitted`, `underwriting`, `approved`, `closing`, `funded`).
*   `venturesStatus` (string): The raw status string from Ventures (e.g., "Underwriting - Level 2").
*   `lastSyncedAt` (timestamp): When the Brain last touched this record.

**Collection: `tasks`** (Sub-collection of `applications` or root collection with `applicationId`)
*   *Decision: Root collection `tasks` is better for querying by "assigned to" or "status" across the system.*
*   `id` (string): Auto-generated.
*   `applicationId` (string): Link to parent application.
*   `venturesConditionId` (string): Foreign key to Ventures Condition.
*   `title` (string): e.g., "Upload 2023 Tax Returns".
*   `description` (string): Detailed instructions.
*   `status` (string): `open`, `pending_review` (uploaded but not cleared), `completed` (cleared in Ventures).
*   `type` (string): `document_upload`, `information_request`.

### B. Ventures Mock Data Model (The "Bank" State)
The `MockVenturesClient` in Brain must simulate:
*   `Loan`: `{ LoanId, Status, BorrowerName, Amount }`
*   `Condition`: `{ ConditionId, LoanId, Description, Status (Open/Waived/Satisfied) }`

---

## 2. Component Specifications

### A. The Brain (`apps/brain`)
**Role**: The Synchronization Engine.

**1. `SyncService` (Enhanced)**
*   **Loop Frequency**: Run every 10-30 seconds (configurable).
*   **Job 1: Downstream Sync (Ventures -> Firestore)**
    *   Fetch all "Active" loans from `MockVenturesClient`.
    *   For each loan:
        *   Find corresponding Firestore doc by `venturesLoanId`.
        *   **Compare Status**: If `Ventures.Status != Firestore.venturesStatus`, update Firestore.
        *   **Fetch Conditions**: Get open conditions for this loan.
        *   **Sync Tasks**:
            *   If a condition exists in Ventures but not in Firestore `tasks`, **Create Task**.
            *   If a condition is "Satisfied" in Ventures but "Open" in Firestore, **Mark Task Completed**.
*   **Job 2: Upstream Sync (Firestore -> Ventures)**
    *   Listen for `tasks` where `status == 'pending_review'` (User uploaded a doc).
    *   **Action**: Call `VenturesClient.uploadDocument()` (Mock).
    *   **Action**: Update Ventures Condition Status to "Received".

**2. `MockVenturesClient`**
*   Must persist state in memory or a simple JSON file so changes "stick" during a demo session.
*   Methods needed:
    *   `get_all_loans()`
    *   `get_loan_details(loan_id)`
    *   `get_conditions(loan_id)`
    *   `update_condition_status(condition_id, status)`

### B. The Console (`apps/console`)
**Role**: The Staff Interface for managing the pipeline.

**1. `WorkboardPage` (Kanban View)**
*   **Layout**: Columns representing key statuses: `New`, `Underwriting`, `Approved`, `Closing`.
*   **Data Source**: `useCollection(query(collection(db, 'applications')))`
*   **Interaction**:
    *   **Drag & Drop**: Moving a card from "New" to "Underwriting" updates the Firestore `status`.
    *   *Note*: In a real scenario, you can't just change status without Ventures validation, but for "AmPac OS" demo, we allow it, and the Brain will push this change to Ventures (or revert it if Ventures is master). *Decision: Console updates Firestore, Brain sees change, updates Ventures.*

**2. `ApplicationDetailPage`**
*   **Header**: Shows Status, Loan Amount, Borrower Name.
*   **Tabs**:
    *   **Overview**: Basic info.
    *   **Documents (Tasks)**: List of `tasks` for this app.
        *   **Action**: "Add Request" button -> Creates a new `task` in Firestore (which Brain will sync to Ventures as a new Condition).
        *   **Action**: Review uploaded file -> Click "Approve" -> Updates task to `completed`.

### C. The Mobile App (`apps/mobile`)
**Role**: The Borrower's Real-time Tracker.

**1. `ApplicationScreen` (Dashboard)**
*   **Status Tracker**: A visual stepper component (e.g., 1. Applied, 2. Underwriting, 3. Decision).
    *   *Logic*: Subscribes to `application.status`.
*   **Action Items (Tasks)**:
    *   Section: "Things to do".
    *   List `tasks` where `status == 'open'`.
    *   Tap item -> Opens `DocumentUploadScreen`.

**2. `DocumentUploadScreen`**
*   **Function**: User picks file/photo.
*   **Action**: Uploads to Firebase Storage.
*   **Trigger**: Updates `task.status` to `pending_review`.
*   *Result*: Console sees "Review Needed". Brain sees "Pending Review".

---

## 3. Implementation Steps (Phase 2)

### Step 1: Brain - The Mock Data Foundation
*   [ ] Update `MockVenturesClient` to support stateful updates (so we can "move" a loan and it stays moved).
*   [ ] Implement `SyncService.sync_loan_statuses()`: Ventures -> Firestore.
*   [ ] Implement `SyncService.sync_tasks()`: Ventures Conditions -> Firestore Tasks.

### Step 2: Console - The Workboard
*   [ ] Create `WorkboardPage.tsx`.
*   [ ] Implement `LoanService.getPipeline()` using Firebase SDK.
*   [ ] Build the Kanban UI (using a library like `react-beautiful-dnd` or simple CSS grid for now).

### Step 3: Mobile - The Tracker
*   [ ] Update `ApplicationScreen.tsx` to subscribe to the live Firestore document.
*   [ ] Verify that changing status in Console (Step 2) instantly updates Mobile (Step 3).

### Step 4: The "Task" Loop
*   [ ] Console: Add "Request Document" button.
*   [ ] Brain: Ensure this new task syncs "upstream" to Mock Ventures (optional for demo, but good for completeness).
*   [ ] Mobile: Ensure the new task appears in the list.
