# Design Document

## Overview

This design addresses two critical infrastructure improvements for the AmPac Business Capital mobile application:

1. **AI Service Migration**: Replace OpenAI/Google Cloud with Groq API for cost reduction and improved reliability
2. **Android Build Resolution**: Fix persistent Android build failures preventing Google Play Store deployment

The solution provides both immediate fixes and long-term architectural improvements while maintaining backward compatibility and service reliability.

## Architecture

### Current State
- **Brain Service**: FastAPI service using OpenAI API with LangChain
- **Simple AI Service**: Standalone service already configured with Groq API
- **Mobile App**: React Native app connecting to Brain Service for AI features
- **Android Builds**: Failing consistently due to dependency conflicts

### Target State
- **Unified AI Backend**: Brain Service migrated to Groq API with fallback capabilities
- **Simplified Deployment**: Option to use lightweight Simple AI Service for basic functionality
- **Reliable Android Builds**: Optimized EAS configuration with resolved dependency conflicts
- **Flexible Configuration**: Environment-based AI provider selection

## Components and Interfaces

### AI Service Components

#### 1. Groq Integration Service
```python
class GroqService:
    def __init__(self, api_key: str, model: str = "llama3-8b-8192"):
        self.api_key = api_key
        self.model = model
        self.client = httpx.AsyncClient()
    
    async def chat_completion(self, messages: List[Message]) -> str:
        # Groq API integration with error handling
        pass
    
    async def health_check(self) -> bool:
        # Service availability check
        pass
```

#### 2. AI Provider Abstraction
```python
class AIProvider(ABC):
    @abstractmethod
    async def generate_response(self, prompt: str, context: str) -> str:
        pass

class GroqProvider(AIProvider):
    # Groq-specific implementation
    pass

class FallbackProvider(AIProvider):
    # Context-aware fallback responses
    pass
```

#### 3. Configuration Manager
```python
class AIConfig:
    provider: str = "groq"  # groq, openai, fallback
    groq_api_key: str
    groq_model: str = "llama3-8b-8192"
    fallback_enabled: bool = True
    timeout_seconds: int = 10
```

### Android Build Components

#### 1. Optimized EAS Configuration
```json
{
  "build": {
    "android-stable": {
      "node": "20.11.0",
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      },
      "env": {
        "EXPO_USE_FAST_RESOLVER": "1"
      }
    }
  }
}
```

#### 2. Dependency Resolution Strategy
- **React Version**: Downgrade to 18.2.0 for compatibility
- **React Native**: Maintain 0.81.5 with Expo SDK 54
- **Firebase**: Use stable v12.6.0 configuration
- **Stripe**: Use compatible version 0.50.3

#### 3. Build Optimization Pipeline
```typescript
interface BuildConfig {
  nodeVersion: string;
  dependencyStrategy: 'stable' | 'latest';
  androidBuildType: 'apk' | 'aab';
  enableFastResolver: boolean;
  skipCache: boolean;
}
```

## Data Models

### AI Request/Response Models
```python
class AIRequest(BaseModel):
    context: str  # 'application', 'home', 'spaces', etc.
    query: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None

class AIResponse(BaseModel):
    response: str
    provider: str  # 'groq', 'fallback'
    model: str
    processing_time_ms: int
    actions: Optional[List[Dict]] = None  # Navigation actions, etc.

class AIError(BaseModel):
    error_type: str
    message: str
    fallback_used: bool
```

### Build Configuration Models
```typescript
interface AndroidBuildConfig {
  profile: string;
  nodeVersion: string;
  buildType: 'apk' | 'aab';
  gradleVersion: string;
  dependencies: {
    react: string;
    reactNative: string;
    expo: string;
  };
  optimizations: {
    fastResolver: boolean;
    skipCache: boolean;
    parallelBuilds: boolean;
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing the acceptance criteria, several properties can be consolidated:
- Properties 1.1, 1.3 can be combined into a comprehensive Groq API usage property
- Properties 3.1, 3.3, 3.5 can be combined into a simple AI service independence property  
- Properties 4.1, 4.4 can be combined into environment-based configuration property
- Properties 5.1, 5.2 can be combined into build stability property

### Core Properties

**Property 1: Groq API Integration**
*For any* AI request sent to the Brain Service, the service should use Groq API endpoints and return responses from Groq's Llama model, never calling OpenAI APIs.
**Validates: Requirements 1.1, 1.3**

**Property 2: API Key Authentication**
*For any* request to AI services, the system should authenticate using the configured Groq API key and reject requests with invalid authentication.
**Validates: Requirements 1.2, 3.4**

**Property 3: Fallback Response Intelligence**
*For any* AI request when Groq API is unavailable, the system should provide contextually appropriate fallback responses based on the query content and context.
**Validates: Requirements 1.4**

**Property 4: Service Independence**
*For any* deployment of the Simple AI Service, it should start, run, and respond to requests independently without requiring the main Brain Service to be available.
**Validates: Requirements 3.1, 3.3, 3.5**

**Property 5: Mobile App Fallback**
*For any* situation where the main Brain Service is unreachable, the mobile app should automatically fallback to the Simple AI Service and continue providing AI functionality.
**Validates: Requirements 3.2**

**Property 6: Environment Configuration**
*For any* deployment environment (development, staging, production), the system should use the appropriate API keys, endpoints, and configuration values for that environment.
**Validates: Requirements 4.1, 4.4**

**Property 7: Dynamic Configuration Updates**
*For any* configuration change (API keys, provider selection), the services should reload and use the new configuration without requiring code changes or service restarts.
**Validates: Requirements 4.2, 4.3**

**Property 8: Configuration Error Handling**
*For any* invalid configuration (missing keys, wrong endpoints), the system should provide clear error messages and activate fallback behavior.
**Validates: Requirements 4.5**

**Property 9: Build Stability**
*For any* Android build using the optimized configuration, the build should complete successfully using stable Node.js and compatible React/React Native versions.
**Validates: Requirements 5.1, 5.2**

**Property 10: Integration Handling**
*For any* Android build that includes Firebase and Stripe integrations, the build process should properly configure and include these services in the final APK.
**Validates: Requirements 2.4, 5.3**

**Property 11: Build Error Reporting**
*For any* build failure during dependency installation, the build system should provide specific error messages that help identify and resolve the issue.
**Validates: Requirements 5.4**

## Error Handling

### AI Service Error Handling

#### Groq API Failures
- **Timeout Handling**: 10-second timeout with automatic fallback
- **Rate Limiting**: Exponential backoff with jitter for rate limit responses
- **Authentication Errors**: Clear error messages for invalid API keys
- **Service Unavailable**: Immediate fallback to context-aware responses

#### Fallback Response Strategy
```python
def get_contextual_fallback(query: str, context: str) -> str:
    """Generate intelligent fallback responses based on query analysis"""
    # Loan-related queries -> loan information
    # Application queries -> process guidance  
    # Document queries -> requirements list
    # Default -> general business assistance
```

#### Configuration Error Handling
- **Missing API Keys**: Service starts in fallback mode with warnings
- **Invalid Endpoints**: Clear error messages with suggested fixes
- **Environment Mismatches**: Validation warnings during startup

### Android Build Error Handling

#### Dependency Resolution Failures
- **Version Conflicts**: Automatic resolution to compatible versions
- **Missing Dependencies**: Clear installation instructions
- **Cache Issues**: Automatic cache clearing and retry

#### Build Process Failures
- **Gradle Errors**: Specific error messages with resolution steps
- **Firebase Integration**: Validation of google-services.json configuration
- **Stripe Integration**: Verification of SDK compatibility

#### EAS Build Failures
- **Node Version Issues**: Automatic fallback to stable versions
- **Memory Limits**: Optimization flags to reduce memory usage
- **Timeout Handling**: Extended timeouts for complex builds

## Testing Strategy

### Dual Testing Approach
This system requires both unit tests and property-based tests for comprehensive coverage:

- **Unit Tests**: Verify specific examples, integration points, and error conditions
- **Property Tests**: Verify universal properties across all inputs using randomized testing

### Property-Based Testing Configuration
- **Minimum 100 iterations** per property test due to randomization
- **Test Framework**: pytest with Hypothesis for Python services
- **Tag Format**: **Feature: ai-service-migration-android-fix, Property {number}: {property_text}**

### Unit Testing Focus Areas
- **API Integration**: Specific Groq API request/response examples
- **Configuration Loading**: Environment variable parsing and validation
- **Error Scenarios**: Specific failure cases and fallback behavior
- **Build Validation**: Successful build outputs and APK functionality

### Integration Testing
- **End-to-End AI Flow**: Mobile app → Brain Service → Groq API → Response
- **Fallback Testing**: Service failures and automatic recovery
- **Build Pipeline**: Complete Android build process validation
- **Cross-Platform**: iOS and Android feature parity verification

### Performance Testing
- **AI Response Times**: Sub-10-second response requirements
- **Build Duration**: Android build completion within reasonable timeframes
- **Concurrent Requests**: Multiple simultaneous AI requests handling
- **Memory Usage**: Service memory consumption under load

The testing strategy ensures both correctness (property tests) and reliability (unit tests) while providing comprehensive coverage of the migration and build fix requirements.