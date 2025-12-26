# AmPac x Microsoft 365: The "Connected Workplace" Specification

## 🎯 Vision
For AmPac staff, the Console shouldn't just be "another tab" they have to check. It should be an extension of the tools they already use (Outlook, Teams, Excel). When they sign in with their Work Account, the Console becomes the **Context Layer** on top of M365.

## 1. Identity & Access (The Foundation)
**Goal**: "One Identity to Rule Them All."
- **Current**: Basic SSO (`User.Read`).
- **Upgrade**:
    - **Role Mapping**: Map Azure AD Groups (e.g., `SG-AmPac-Underwriters`) to Console Roles.
        - *Benefit*: IT manages access in Azure; Console updates automatically.
    - **Conditional Access**: Respect Azure policies (e.g., "Must be on corporate VPN" or "MFA required").

## 2. Outlook Integration ("Contextual Communication")
**Goal**: "Never search for a loan email again."
- **Feature: The "Loan Inbox"**
    - **Concept**: When viewing `Application #1042` (John's Bakery), the Console queries Graph API for all emails *to/from* `john@bakery.com`.
    - **UI**: A "Communication" tab in the Loan Detail view that shows a filtered list of real Outlook emails.
    - **Action**: "Reply" button opens a deep-link to Outlook Web with the draft pre-filled.
- **Feature: "Smart Drafts"**
    - **Concept**: Click "Request Tax Returns" in Console -> Generates a draft in Outlook with the correct attachments requested.

## 3. Teams Integration ("War Rooms")
**Goal**: "Collaborate where work happens."
- **Feature: "Deal Rooms"**
    - **Concept**: For loans >$500k, the Console automatically creates a Teams Channel (e.g., `Deal-JohnsBakery`).
    - **Automation**: Adds the Loan Officer, Underwriter, and Legal Counsel to the channel.
    - **Tab**: Pins the Console's "Loan Detail" page as a Tab inside that Teams Channel.
- **Feature: "Instant Huddle"**
    - **Concept**: "Meet Now" button in Console starts a Teams call with the assigned staff members.

## 4. SharePoint / OneDrive ("The Document Lake")
**Goal**: "Files live in one place, accessible everywhere."
- **Feature: "Synced Folders"**
    - **Concept**: Instead of storing files in Firebase Storage (siloed), store them in a SharePoint Site (`/sites/Loans/2025/JohnsBakery`).
    - **Benefit**: Staff can open Excel financial models directly from the Console using "Open in Excel Online" for real-time co-authoring.
    - **Flow**: Mobile App Upload -> Brain moves file to SharePoint -> Console shows SharePoint link.

## 5. Planner / To-Do ("Actionable Intelligence")
**Goal**: "Tasks shouldn't die in the dashboard."
- **Feature: "Task Sync"**
    - **Concept**: When a loan moves to "Underwriting", the Console creates a Planner Task: "Review Financials - Due Friday".
    - **Benefit**: Staff see this task in their personal "Microsoft To-Do" app alongside their other daily work.

## 6. Excel Integration ("The Underwriter's Canvas")
**Goal**: "Live data in your models."
- **Feature: "Live Data Feed"**
    - **Concept**: An Excel Add-in (or Power Query) that pulls live loan data from the Console API.
    - **Usage**: Underwriter opens `RiskModel.xlsx`, clicks "Refresh", and the latest revenue numbers from the borrower's application populate the cells.

---

## 🛠 Technical Implementation Plan

### Phase 1: Enhanced Graph Scopes (Immediate)
Update `authConfig.ts` to request:
- `GroupMember.Read.All` (For RBAC)
- `Files.ReadWrite` (For SharePoint/OneDrive)
- `Tasks.ReadWrite` (For Planner)
- `Team.Create` (For Deal Rooms)

### Phase 2: The "Context Engine" (Service)
Extend `GraphService.ts` to include:
- `getEmailsFrom(emailAddress: string)`
- `createPlannerTask(planId: string, title: string)`
- `createTeamsChannel(teamId: string, channelName: string)`

### Phase 3: SharePoint Adapter
- Replace `documentService.ts` (Firebase) with a hybrid approach:
    - Metadata in Firestore.
    - Binary blobs in SharePoint Drive.
