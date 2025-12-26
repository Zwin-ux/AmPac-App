# Project Structure & Organization

## Monorepo Layout
```
AmPac-App-main/
├── apps/                    # Main applications
│   ├── mobile/             # React Native (Expo) mobile app
│   ├── console/            # React web dashboard
│   ├── brain/              # Python AI microservice
│   ├── functions/          # Firebase Cloud Functions
│   └── m365-addin/         # Microsoft 365 add-in
├── specs/                  # Technical specifications
├── tools/                  # Deployment and utility scripts
└── package.json            # Root package configuration
```

## Mobile App Structure (`apps/mobile/`)
```
src/
├── components/             # Reusable UI components
│   ├── ui/                # Base UI components (Button, Card, etc.)
│   ├── chat/              # Chat-specific components
│   └── social/            # Social features
├── screens/               # Screen components (navigation destinations)
├── services/              # Business logic and API calls
├── context/               # React context providers
├── data/                  # Static data and constants
├── types.ts               # TypeScript type definitions
└── config.ts              # App configuration
```

## Console App Structure (`apps/console/`)
```
src/
├── components/            # Reusable UI components
│   ├── communication/     # Communication features
│   ├── dashboard/         # Dashboard widgets
│   ├── documents/         # Document management
│   └── ventures/          # Ventures integration
├── pages/                 # Route components
├── services/              # API services and business logic
├── types/                 # Shared TypeScript types
├── lib/                   # Utility libraries
└── config.ts              # App configuration
```

## AI Brain Structure (`apps/brain/`)
```
app/
├── api/                   # FastAPI route handlers
│   └── routers/          # API route modules
├── core/                  # Core functionality
│   ├── auth.py           # Authentication logic
│   ├── config.py         # Configuration management
│   └── firebase.py       # Firebase integration
├── services/              # Business logic services
│   ├── agents/           # AI agent implementations
│   └── ventures/         # Ventures integration
├── schemas/               # Pydantic data models
└── main.py               # FastAPI application entry
```

## Key Conventions

### File Naming
- **React Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Services/Utilities**: camelCase (e.g., `authService.ts`)
- **Python Files**: snake_case (e.g., `document_service.py`)
- **Configuration**: lowercase (e.g., `config.ts`, `.env`)

### Import Organization
- External libraries first
- Internal services/utilities
- Relative imports last
- Type-only imports separated with `import type`

### Shared Types
- `apps/mobile/src/types.ts` and `apps/console/src/types/index.ts` must stay in sync
- Both apps read/write the same Firestore collections
- Update both type files when modifying data schemas

### Environment Files
- Each app has its own `.env` and `.env.example`
- Production configs use `.env.production` or `.env.production.template`
- Never commit actual API keys or secrets

### Testing Structure
- Unit tests: `*.test.ts` alongside source files
- E2E tests: dedicated `e2e/` or `tests/` directories
- Test data: `tests/data/` or similar structure

## Documentation Locations
- App-specific README files in each `apps/` directory
- Technical specs in root `specs/` directory
- Deployment guides: `DEPLOYMENT.md` files per app
- API documentation: `api_spec.md` in brain app