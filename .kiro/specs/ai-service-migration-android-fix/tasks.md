# Implementation Plan: AI Service Migration & Android Fix

## Overview

This implementation plan addresses two critical infrastructure improvements:
1. **AI Service Migration**: Replace OpenAI/Google Cloud with Groq API using the provided API key
2. **Android Build Resolution**: Fix persistent build failures preventing Google Play Store deployment

The tasks are organized to deliver immediate fixes while building robust long-term solutions.

## Tasks

- [x] 1. Configure Groq API Integration
  - Update Brain Service configuration to use Groq API key `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`
  - Replace OpenAI dependencies with Groq API client
  - Update environment configuration files
  - _Requirements: 1.1, 1.2, 1.5_

- [ ]* 1.1 Write property test for Groq API integration
  - **Property 1: Groq API Integration**
  - **Validates: Requirements 1.1, 1.3**

- [x] 2. Implement Groq Service Provider
  - [x] 2.1 Create GroqService class with async HTTP client
    - Implement chat completion method using Groq API endpoints
    - Add proper error handling and timeout configuration
    - _Requirements: 1.1, 1.3_

  - [ ]* 2.2 Write property test for API key authentication
    - **Property 2: API Key Authentication**
    - **Validates: Requirements 1.2, 3.4**

  - [x] 2.3 Implement intelligent fallback responses
    - Create context-aware fallback logic for API failures
    - Add business loan specific responses based on query analysis
    - _Requirements: 1.4_

  - [ ]* 2.4 Write property test for fallback response intelligence
    - **Property 3: Fallback Response Intelligence**
    - **Validates: Requirements 1.4**

- [x] 3. Update Brain Service LLM Integration
  - [x] 3.1 Replace LangChain OpenAI with Groq integration
    - Modify llm_service.py to use GroqService instead of ChatOpenAI
    - Update assistant router to handle Groq responses
    - _Requirements: 1.1, 1.3_

  - [x] 3.2 Remove OpenAI dependencies
    - Update requirements.txt to remove OpenAI packages
    - Clean up configuration references to OpenAI
    - _Requirements: 1.5_

  - [ ]* 3.3 Write unit tests for Brain Service integration
    - Test assistant chat endpoint with Groq responses
    - Test error handling and fallback behavior
    - _Requirements: 1.1, 1.4_

- [x] 4. Checkpoint - Verify AI Service Migration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Enhance Simple AI Service
  - [x] 5.1 Update Simple AI Service with new API key
    - Replace existing Groq API key with provided key
    - Ensure service independence from main Brain Service
    - _Requirements: 3.1, 3.3_

  - [ ]* 5.2 Write property test for service independence
    - **Property 4: Service Independence**
    - **Validates: Requirements 3.1, 3.3, 3.5**

  - [x] 5.3 Add health check and monitoring endpoints
    - Implement /health endpoint for service monitoring
    - Add proper logging and error tracking
    - _Requirements: 3.5_

- [ ] 6. Implement Mobile App Fallback Logic
  - [ ] 6.1 Add Simple AI Service fallback to mobile app
    - Update assistantService.ts to include fallback URL configuration
    - Implement automatic fallback when main service is unavailable
    - _Requirements: 3.2_

  - [ ]* 6.2 Write property test for mobile app fallback
    - **Property 5: Mobile App Fallback**
    - **Validates: Requirements 3.2**

- [ ] 7. Fix Android Build Configuration
  - [ ] 7.1 Optimize EAS build configuration
    - Update eas.json with stable Node.js version and build settings
    - Add android-stable build profile with APK output
    - _Requirements: 2.1, 5.1_

  - [ ] 7.2 Resolve React/React Native version conflicts
    - Downgrade React to 18.2.0 for compatibility with React Native 0.81.5
    - Update package.json with compatible dependency versions
    - _Requirements: 2.5, 5.2_

  - [ ]* 7.3 Write property test for build stability
    - **Property 9: Build Stability**
    - **Validates: Requirements 5.1, 5.2**

- [x] 8. Configure Firebase and Stripe for Android
  - [x] 8.1 Validate Firebase configuration for Android builds
    - Ensure google-services.json is properly configured
    - Test Firebase integration in Android build process
    - _Requirements: 2.4_

  - [x] 8.2 Update Stripe integration for Android compatibility
    - Verify Stripe SDK version compatibility with React Native
    - Test payment functionality in Android builds
    - _Requirements: 2.4, 5.3_

  - [ ]* 8.3 Write property test for integration handling
    - **Property 10: Integration Handling**
    - **Validates: Requirements 2.4, 5.3**

- [ ] 9. Implement Environment-Based Configuration
  - [ ] 9.1 Create configuration management system
    - Add environment-based AI provider selection
    - Support dynamic configuration updates without restarts
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 9.2 Write property test for environment configuration
    - **Property 6: Environment Configuration**
    - **Validates: Requirements 4.1, 4.4**

  - [ ] 9.3 Add configuration validation and error handling
    - Implement clear error messages for invalid configurations
    - Add fallback behavior for configuration issues
    - _Requirements: 4.5_

  - [ ]* 9.4 Write property test for configuration error handling
    - **Property 8: Configuration Error Handling**
    - **Validates: Requirements 4.5**

- [ ] 10. Test Android Build Process
  - [ ] 10.1 Execute test Android build with new configuration
    - Run EAS build with android-stable profile
    - Verify successful APK generation
    - _Requirements: 2.1, 2.2_

  - [ ] 10.2 Validate Android APK functionality
    - Install generated APK on Android device
    - Test core features including AI chat and payments
    - _Requirements: 2.3_

  - [ ]* 10.3 Write integration tests for build process
    - Test complete build pipeline from source to APK
    - Verify all integrations work in built APK
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 11. Deploy and Verify Services
  - [ ] 11.1 Deploy updated Brain Service with Groq integration
    - Update production environment with new AI configuration
    - Verify service health and response quality
    - _Requirements: 1.1, 1.3_

  - [ ] 11.2 Deploy Simple AI Service as backup
    - Set up Simple AI Service deployment with new API key
    - Configure load balancing and fallback routing
    - _Requirements: 3.1, 3.5_

  - [ ]* 11.3 Write end-to-end integration tests
    - Test complete flow from mobile app through AI services
    - Verify fallback behavior under various failure scenarios
    - _Requirements: 1.4, 3.2_

- [ ] 12. Final Checkpoint - Complete System Verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and user feedback
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation prioritizes immediate fixes (AI migration, Android builds) while building robust long-term solutions