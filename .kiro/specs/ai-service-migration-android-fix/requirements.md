# Requirements Document

## Introduction

This specification addresses two critical issues in the AmPac Business Capital mobile application ecosystem:
1. Migration from Google Cloud/OpenAI to Groq API for AI services to reduce costs and improve reliability
2. Resolution of Android deployment build failures that have prevented Android app store deployment

## Glossary

- **Brain_Service**: The Python FastAPI microservice that handles AI processing for the mobile app
- **Groq_API**: The new AI service provider using the provided API key for language model inference
- **Mobile_App**: The React Native Expo mobile application for entrepreneurs
- **Android_Build**: The compilation process that creates Android APK/AAB files for Google Play Store
- **EAS_Build**: Expo Application Services build system used for creating production builds

## Requirements

### Requirement 1: AI Service Migration

**User Story:** As a system administrator, I want to migrate from OpenAI/Google Cloud to Groq API, so that we can reduce AI service costs and improve reliability.

#### Acceptance Criteria

1. WHEN the Brain Service receives an AI request, THE Brain_Service SHALL use Groq API instead of OpenAI API
2. WHEN configuring the Groq API, THE Brain_Service SHALL use the provided API key `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`
3. WHEN the mobile app sends chat requests, THE Brain_Service SHALL return responses from Groq's Llama model
4. WHEN Groq API is unavailable, THE Brain_Service SHALL provide intelligent fallback responses based on query context
5. WHEN the migration is complete, THE Brain_Service SHALL no longer depend on OpenAI API keys

### Requirement 2: Android Build Resolution

**User Story:** As a mobile app developer, I want to fix Android build failures, so that Android users can download and use the AmPac mobile app.

#### Acceptance Criteria

1. WHEN building for Android production, THE EAS_Build SHALL complete successfully without dependency errors
2. WHEN the Android build completes, THE Mobile_App SHALL generate a valid APK or AAB file
3. WHEN Android users install the app, THE Mobile_App SHALL function with all core features working
4. WHEN Firebase services are used, THE Android_Build SHALL properly integrate Google Services configuration
5. WHEN React Native dependencies are resolved, THE Android_Build SHALL handle version compatibility correctly

### Requirement 3: Simplified AI Service Deployment

**User Story:** As a system administrator, I want a simplified AI service deployment option, so that we can quickly deploy AI functionality without complex dependencies.

#### Acceptance Criteria

1. WHEN deploying the simple AI service, THE Simple_AI_Service SHALL run independently of the main Brain Service
2. WHEN the mobile app cannot reach the main Brain Service, THE Mobile_App SHALL fallback to the Simple AI Service
3. WHEN using the Simple AI Service, THE Service SHALL provide business loan assistance using Groq API
4. WHEN API authentication is required, THE Simple_AI_Service SHALL validate requests using the configured API key
5. WHEN the Simple AI Service starts, THE Service SHALL be accessible on the configured port with health checks

### Requirement 4: Configuration Management

**User Story:** As a developer, I want centralized configuration management for AI services, so that API keys and endpoints can be easily updated without code changes.

#### Acceptance Criteria

1. WHEN configuring AI services, THE System SHALL support environment-based configuration for different deployment environments
2. WHEN API keys are updated, THE Services SHALL reload configuration without requiring code changes
3. WHEN switching between AI providers, THE Configuration SHALL allow easy provider selection
4. WHEN deploying to different environments, THE Configuration SHALL use appropriate API endpoints and keys
5. WHEN configuration is invalid, THE System SHALL provide clear error messages and fallback behavior

### Requirement 5: Android Build Optimization

**User Story:** As a mobile developer, I want optimized Android build configuration, so that builds complete faster and more reliably.

#### Acceptance Criteria

1. WHEN configuring EAS build profiles, THE Configuration SHALL use stable Node.js and dependency versions
2. WHEN resolving package conflicts, THE Build_System SHALL use compatible React Native and React versions
3. WHEN building for Android, THE Build_Process SHALL handle Firebase and Stripe integrations correctly
4. WHEN dependency installation fails, THE Build_System SHALL provide clear error messages for troubleshooting
5. WHEN builds succeed, THE Generated_APK SHALL be installable on Android devices with all features working