# AmPac Mobile Application Context

## High-Level Overview
The **AmPac Mobile App** is a comprehensive digital platform designed for entrepreneurs and small business owners served by **AmPac Business Capital**. It acts as a "pocket partner" for business growth, providing access to capital, workspace, networking, and expert support.

## Core Pillars
The application is built around four main pillars:
1.  **Spaces**: A booking system for physical workspaces (conference rooms, focus pods, training centers) at the AmPac Entrepreneur Ecosystem.
2.  **Network**: A digital directory connecting entrepreneurs with each other and local businesses, fostering a community ecosystem.
3.  **Support (Hotline)**: A direct line to AmPac support staff and Technical Assistance (TA) providers for business coaching and issue resolution.
4.  **Capital (Loan Application)**: A streamlined, mobile-first portal for applying for SBA 504, SBA 7(a), and Community Lending loans.

## Feature Spotlight: Loan Application Portal
The Loan Application feature is a critical component designed to simplify the complex process of securing business capital.

### User Flow
The application process is broken down into a user-friendly, multi-step wizard:

**Step 0: Eligibility Check**
- **Purpose**: Pre-qualify users before they invest time in a full application.
- **Inputs**: Years in Business, Estimated Credit Score.
- **Logic**: Provides immediate feedback (e.g., "2+ years typically required") but allows users to proceed with warnings.

**Step 1: Product Selection & Business Info**
- **Product Selection**: Users choose between "SBA 504 Loan" (Real Estate/Equipment), "SBA 7(a) Loan" (Working Capital), or "Community Lending" (Microloans).
- **Business Information**: Collects core entity details: Legal Business Name, Years in Business, Annual Revenue.

**Step 2: Loan Details**
- **Purpose**: Capture the specific funding request.
- **Inputs**: Requested Loan Amount, Use of Funds (detailed description).

**Step 3: Document Upload**
- **Purpose**: Gather necessary financial documentation.
- **Requirements**: Tax Returns (Last 2 Years), P&L Statement, Balance Sheet.
- **Interface**: Mobile-optimized upload interface (currently mocked for MVP).

**Step 4: Review & Submit**
- **Purpose**: Final verification of all entered data.
- **Action**: Submits the application to the AmPac backend for loan officer review.

### Technical Implementation
- **State Management**: Uses a persistent "Draft" state. Progress is auto-saved locally and to the cloud after every step.
- **Performance**: Implements aggressive caching (stale-while-revalidate) to ensure the application loads instantly, even in poor network conditions.
- **Backend**: Powered by Firebase Firestore for real-time data sync and secure document handling.

## Technical Stack
- **Framework**: React Native (Expo)
- **Language**: TypeScript
- **Backend**: Firebase (Auth, Firestore)
- **Design System**: Custom "Glassmorphism" UI with AmPac brand colors (#005596, #7AB800).
