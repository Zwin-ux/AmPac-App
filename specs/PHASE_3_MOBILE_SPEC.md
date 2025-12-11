# Phase 3: Mobile & Graph Integration Spec

## Objective
Empower the borrower with self-service tools that reduce friction and increase application velocity. The Mobile App will become the primary interface for "getting things done," leveraging the Microsoft Graph API to seamlessly connect borrowers with staff availability.

---

## 1. Mobile App Enhancements (`apps/mobile`)

### A. "Book a Meeting" Feature (Graph API Integration)
**Goal**: Allow borrowers to schedule a closing or consultation call without back-and-forth emails.

**User Flow**:
1.  Borrower taps "Schedule Call" on the Home Screen or within a Task.
2.  App requests available slots from `Brain` (which queries Staff Outlook via Graph).
3.  Borrower selects a time (e.g., "Tuesday, 2:00 PM").
4.  App confirms booking.
5.  **Result**:
    *   Calendar invite sent to Borrower (email).
    *   Event created on Staff's Outlook Calendar.
    *   Task marked as "Scheduled" in Console.

**Technical Implementation**:
*   **Frontend**: `BookingScreen.tsx`
    *   Calendar UI (e.g., `react-native-calendars`).
    *   Time slot picker.
*   **Backend (Brain)**: `POST /api/v1/calendar/book`
    *   Input: `{ staffId, timeSlot, borrowerEmail }`
    *   Action: `graph_client.create_event(...)`

### B. "Quick Apply" 2.0 (Lead Gen Optimization)
**Goal**: Capture leads faster by reducing the initial form to 3 fields.

**User Flow**:
1.  "Get Started" button on Landing Page.
2.  **Step 1**: Scan Business Card (OCR) or Enter Name/Email/Phone.
3.  **Step 2**: "What do you need?" (Working Capital vs. Real Estate).
4.  **Submit**: Creates a `draft` application in Firestore immediately.
5.  **Follow-up**: Push notification 1 hour later: "Complete your profile to see your rates."

**Technical Implementation**:
*   **Frontend**: `QuickApplySheet.tsx` (Already exists, needs refinement).
*   **Backend**: `SyncService` ensures this draft is visible in Console as "Lead".

### C. Real-Time Chat (Direct Line)
**Goal**: Replace SMS/Email with secure in-app messaging.

**User Flow**:
1.  Borrower has a question about a document.
2.  Taps "Ask Loan Officer".
3.  Sends message: "Do you need the 2023 or 2024 return?"
4.  **Console**: Staff sees message in `ApplicationDetailPage`.
5.  Staff replies: "2024 please."
6.  **Mobile**: Push Notification -> In-app message.

**Technical Implementation**:
*   **Firestore**: `applications/{id}/messages` collection.
*   **Security**: Rules allow read/write for Owner and Staff only.

---

## 2. Backend Services (`apps/brain`)

### A. Graph Client Expansion
We need to expand `graph_client.py` to support:
*   `find_meeting_times(staff_email, duration_minutes)`
*   `create_calendar_event(subject, attendees, start_time, end_time)`

### B. Ventures Dashboard Fix
*   **Issue**: The dashboard is stuck loading because `getDashboardStats` in `venturesService.ts` is mocking a delay but might be failing silently or the backend endpoint `GET /dashboard/stats` is missing.
*   **Fix**: Implement `GET /api/v1/ventures/dashboard` in `ventures.py` to return real (or properly mocked) stats from the `SyncService` logs.

---

## 3. Execution Plan

### Step 1: Fix Ventures Dashboard
*   [ ] Update `apps/brain/app/api/routers/ventures.py` to include a `/dashboard` endpoint.
*   [ ] Update `apps/console/src/services/venturesService.ts` to call this real endpoint.

### Step 2: Implement Graph Booking (Backend)
*   [ ] Update `apps/brain/app/services/graph_client.py` with `find_meeting_times` and `create_event`.
*   [ ] Create `apps/brain/app/api/routers/calendar.py`.

### Step 3: Implement Graph Booking (Mobile)
*   [ ] Create `BookingScreen.tsx`.
*   [ ] Connect to `POST /api/v1/calendar/book`.

### Step 4: Chat Infrastructure
*   [ ] Create `MessageList` component in Mobile.
*   [ ] Create `ChatWidget` in Console.
