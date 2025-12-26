# Project Structure

## Monorepo Layout

```
apps/
├── mobile/           # React Native Mobile App (Borrowers)
├── console/          # React Admin Dashboard (Staff)
├── brain/            # Python FastAPI Service (AI/Backend)
└── m365-addin/       # Outlook/Teams Manifest
```

## Source Organization

### `/src/screens/`

Screen components for each route in the app. Each screen is a self-contained component with its own styles.

- Authentication: SignInScreen, SignUpScreen
- Main tabs: HomeScreen, ApplicationScreen, SpacesScreen, NetworkScreen, HotlineScreen, ProfileScreen
- Detail views: RoomDetailScreen, BusinessProfileScreen

### `/src/components/`

Reusable UI components used across multiple screens.

- AssistantBubble: Floating AI assistant interface
- SkeletonLoader: Loading state placeholder

### `/src/services/`

Business logic and external service integrations.

- `firestore.ts`: Firestore database operations
- `applications.ts`: Loan application logic
- `rooms.ts`: Space booking logic
- `network.ts`: Business network operations
- `cache.ts`: Local caching utilities

### `/src/types.ts`

Centralized TypeScript type definitions for the entire app. All interfaces and types are defined here.

### `/src/theme.ts`

Design system with colors, spacing, typography, border radius, and shadows. Import and use throughout the app for consistent styling.

## Navigation Architecture

Three-level navigation hierarchy:

1. **Root**: Conditional render between Auth and Main navigators
2. **Auth Stack**: SignIn → SignUp flow
3. **Main Tabs**: Bottom tab navigator with 6 tabs
   - Spaces tab contains a nested stack navigator (SpacesList → RoomDetail)

## Firebase Structure

- `/firebaseConfig.ts`: Firebase initialization with React Native persistence
- `/functions/`: Cloud Functions with TypeScript
- `/dataconnect/`: GraphQL schema and queries (configured but not in active use)
- `/firestore.rules`: Security rules
- `/firestore.indexes.json`: Database indexes

## Styling Conventions

- Use StyleSheet.create() for component styles
- Import theme from `src/theme.ts` for all design tokens
- Apply SafeAreaView for top-level screens
- Use theme.shadows for elevation effects
- Follow theme.spacing for consistent margins/padding
