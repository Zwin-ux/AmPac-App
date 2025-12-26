# Console 2.0: "Mission Control" Specification

## 1. Authentication & Security (The "Work Login")
**Goal**: Seamless Single Sign-On (SSO) using Microsoft Entra ID (formerly Azure AD).
- **Current State**: Basic MSAL setup exists but conflicts with Firebase Auth logic.
- **Upgrade Plan**:
    - **Primary Auth**: Switch `RequireAuth` to use `@azure/msal-react`.
    - **Token Exchange**: (Future) Exchange MSAL Access Token for a Firebase Custom Token so we can still use Firestore Security Rules.
    - **Role-Based Access**: Decode the ID Token to check for roles (e.g., `LoanOfficer`, `Admin`).

## 2. Dashboard Expansion ("Show Stuff")
**Goal**: A high-density "Morning Coffee" view for staff.
- **Widgets**:
    - **"My Tasks"**: List of urgent to-dos (e.g., "Review Tax Returns for Smith Construction").
    - **"Pipeline Velocity"**: Chart showing loans moving through stages this week.
    - **"Recent Activity"**: Live feed of borrower actions (e.g., "John uploaded BankStatements.pdf").
    - **"Calendar"**: Integrated Outlook view of upcoming borrower meetings.

## 3. Application Detail View ("Deep Dive")
**Goal**: A single pane of glass for underwriting.
- **Tabs**:
    - **Overview**: Key metrics (Credit Score, DTI, LTV).
    - **Documents**: File explorer view with "Preview" and "AI Analysis" (e.g., "The Brain flagged a discrepancy in income").
    - **Communication**: Unified thread of SMS, Email, and Chat logs with the borrower.
    - **Underwriting**: Form for staff to input analysis, risk rating, and decision.

## 4. The "Staff Copilot"
**Goal**: AI Assistant living in the sidebar.
- **Capabilities**:
    - "Draft an email to Sarah asking for her 2023 K-1s."
    - "Summarize the last 5 emails from this borrower."
    - "What is the policy for lending to restaurants?" (RAG search).

## 5. Technical Architecture
- **State Management**: Use `TanStack Query` for caching Firestore data.
- **UI Framework**: Continue using Tailwind + Lucide Icons.
- **Routing**: React Router v7.

## 6. Implementation Roadmap
1.  **Fix Auth**: Wire up MSAL correctly in `App.tsx`.
2.  **Expand Dashboard**: Create `DashboardWidgets.tsx`.
3.  **Enhance Detail Page**: Add `DocumentViewer` and `ChatThread` components.
