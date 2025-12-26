# Technology Stack & Build System

## Architecture
- **Monorepo Structure**: Multi-app repository with shared dependencies
- **Backend**: Firebase (Firestore, Auth, Storage, Functions)
- **AI/ML**: Python-based microservice with FastAPI
- **Languages**: TypeScript (frontend), Python (AI backend)

## Frontend Technologies

### Mobile App (`apps/mobile`)
- **Framework**: React Native with Expo SDK ~54.0
- **Navigation**: React Navigation v7
- **State Management**: React hooks, AsyncStorage
- **UI**: Custom components, Expo Vector Icons
- **Testing**: Jest, Playwright (E2E), React Native Testing Library

### Staff Console (`apps/console`)
- **Framework**: React 19 with Vite
- **Styling**: Tailwind CSS
- **State Management**: TanStack React Query
- **Authentication**: Azure MSAL (Microsoft Graph integration)
- **UI Components**: Lucide React icons, custom components
- **Build Tool**: Vite with TypeScript

### AI Brain (`apps/brain`)
- **Framework**: FastAPI (Python 3.11)
- **AI/ML**: LangChain, OpenAI GPT-4, Claude 3.5 Sonnet
- **Document Processing**: PDFPlumber, python-docx
- **Authentication**: Firebase Admin SDK, Azure Identity
- **Deployment**: Docker containerized

## Common Development Commands

### Mobile App
```bash
cd apps/mobile
npm install
npx expo start --tunnel    # Start development server
npm run android           # Run on Android
npm run ios              # Run on iOS
npm run typecheck        # TypeScript validation
npm run test:e2e         # End-to-end tests
```

### Staff Console
```bash
cd apps/console
npm install
npm run dev              # Start Vite dev server
npm run build            # Production build
npm run lint             # ESLint validation
npm run preview          # Preview production build
```

### AI Brain
```bash
cd apps/brain
pip install -r requirements.txt
uvicorn app.main:app --reload    # Start FastAPI server
python -m pytest                # Run tests
docker build -t ampac-brain .    # Build Docker image
```

## Key Dependencies
- **Firebase**: v12.6.0 (shared across mobile/console)
- **Sentry**: Error monitoring across all apps
- **TypeScript**: ~5.9 (strict type checking enabled)
- **React**: v19+ (latest stable)

## Environment Configuration
- Environment variables managed via `.env` files per app
- Firebase configuration via environment variables
- Azure/Microsoft Graph credentials for console app
- OpenAI/Claude API keys for AI brain