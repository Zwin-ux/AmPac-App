# Microsoft Teams Integration Roadmap

## Overview
The goal is to integrate AmPac's Console and Mobile apps with Microsoft Teams to enable seamless communication and collaboration. This involves two main strategies:
1. **Deep Integration**: Using Microsoft Graph API to read/write chats and schedule meetings within the AmPac apps.
2. **Embedding**: Packaging the AmPac Console as a Microsoft Teams App (Tab) so staff can work without leaving Teams.

## Phase 1: Authentication & Graph API (Mobile & Console)
*Objective: Allow users to sign in with Microsoft and access Teams data.*

- [ ] **Unified Auth Provider**: Ensure `expo-auth-session` (Mobile) and `msal-react` (Console) use the same Azure AD App Registration.
- [ ] **Scopes**: Request permissions:
    - `User.Read` (Profile)
    - `Chat.ReadWrite` (Send/Receive messages)
    - `OnlineMeetings.ReadWrite` (Video calls)
    - `Presence.Read` (See if staff is available)

## Phase 2: Communication Features
*Objective: Replace internal chat tools with Teams.*

### Mobile (Borrower)
- [ ] **"Chat with Loan Officer"**: Instead of a custom chat backend, this view reads a specific 1:1 Teams chat between the Borrower (Guest) and Staff.
- [ ] **Video Calls**: Use `OnlineMeetings` API to generate a Teams Meeting link for "Meet with Underwriter" buttons.

### Console (Staff)
- [ ] **Embedded Chat**: Show the relevant Teams chat thread inside the `ApplicationDetailPage`.
- [ ] **Presence Indicators**: Show a green dot next to staff names if they are "Available" in Teams.

## Phase 3: Teams App Package (Console Only)
*Objective: Make AmPac Console a native tab in Teams.*

- [ ] **Manifest File (`manifest.json`)**: Create a definition file that points to the hosted Console URL (`https://console.ampac.com`).
- [ ] **SSO Handshake**: Implement the Teams JS SDK `microsoftTeams.authentication` to silently log staff in using their Teams identity.
- [ ] **Context Awareness**: When opening a loan from a Teams notification, deep link directly to that loan in the tab.

## Technical Requirements
- **Azure AD**: A registered app with appropriate API permissions.
- **Backend Proxy**: `apps/brain` may need to act as a middleman for complex Graph operations or webhooks (e.g., listening for new messages).
