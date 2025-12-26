# Technology Stack

## Framework & Platform

- **Expo SDK 54**: React Native development platform with managed workflow
- **React Native 0.81.5**: Cross-platform mobile framework
- **React 19.1.0**: UI library
- **TypeScript 5.9.2**: Type-safe JavaScript with strict mode enabled

## Navigation

- **React Navigation v7**: Native stack and bottom tab navigators
- **SafeAreaProvider**: Safe area context for notch/status bar handling

## Cloud Infrastructure (Azure)

- **Compute**:
  - **Azure Container Apps**: Hosting for `apps/brain` (Python/FastAPI).
  - **Azure Static Web Apps**: Hosting for `apps/console` (React/Vite).
- **Identity**:
  - **Microsoft Entra ID**: SSO and Role-Based Access Control (RBAC) for staff.
- **Integration**:
  - **Azure Service Bus**: Async event messaging (optional for future).
  - **Key Vault**: Secret management.

## Backend & Data Layer

- **AmPac Brain (Python)**:

  - **Framework**: FastAPI (Async API).
  - **AI/ML**: LangChain, OpenAI GPT-4o, Microsoft Graph SDK.
  - **Vector Store**: FAISS (Local) or Azure AI Search (Production).

- **Mobile Backend (Firebase)**:
  - **Auth**: Firebase Auth (Borrowers).
  - **Database**: Firestore (NoSQL, Real-time sync).
  - **Storage**: Firebase Storage (Document intake).

## State & Storage

- **AsyncStorage**: Local persistence for auth state
- **Firebase Auth Persistence**: Automatic session management

## UI & Styling

- **Expo Vector Icons**: Ionicons icon set
- **Custom Theme System**: Centralized design tokens in `src/theme.ts`
- **StyleSheet API**: React Native styling with theme-based values

## Common Commands

```bash
# Start development server
npm start

# Run on specific platform
npm run android
npm run ios
npm run web

# Firebase Functions
cd apps/mobile/functions
npm install
npm run build
```

## Project Configuration

- **TypeScript**: Extends Expo base config with strict mode
- **Expo Config**: app.json with new architecture enabled
- **Firebase Config**: Centralized in firebaseConfig.ts with error handling
