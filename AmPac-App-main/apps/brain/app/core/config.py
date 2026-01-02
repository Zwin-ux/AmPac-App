from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "AmPac Brain 🧠"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    # CORS
    ALLOWED_CORS_ORIGINS: list[str] = ["*"] # Default to all, override in prod.env
    
    # Groq API for AI services
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "llama3-8b-8192"
    
    # Firebase
    FIREBASE_CREDENTIALS_PATH: str = "serviceAccountKey.json"
    FIREBASE_CREDENTIALS_JSON: Optional[str] = None
    
    # Microsoft Graph
    AZURE_TENANT_ID: Optional[str] = None
    AZURE_CLIENT_ID: Optional[str] = None
    AZURE_CLIENT_SECRET: Optional[str] = None

    # Ventures API
    VENTURES_USERNAME: Optional[str] = None
    VENTURES_PASSWORD: Optional[str] = None
    VENTURES_MOCK_MODE: bool = True
    USE_FAKE_SYNC: bool = False

    # ShareFile API
    SHAREFILE_CLIENT_ID: Optional[str] = None
    SHAREFILE_CLIENT_SECRET: Optional[str] = None
    SHAREFILE_SUBDOMAIN: str = "ampac" # e.g., https://ampac.sharefile.com

    # Feature flags / Integrations
    GRAPH_ENABLED: bool = True
    VENTURES_ENABLED: bool = True
    SHAREFILE_ENABLED: bool = True
    BOOKINGS_ENABLED: bool = True
    CONSOLE_DASHBOARD_LIVE: bool = False
    SYNC_EVENTS_ENABLED: bool = True

    # Mock toggles
    GRAPH_MOCK: bool = False
    SHAREFILE_MOCK: bool = False

    # Health / Sync
    SYNC_HEALTH_STALE_SECONDS: int = 120
    SKIP_SYNC_LOOP: bool = False
    BREAKER_FAILURE_THRESHOLD: int = 3
    BREAKER_RESET_SECONDS: int = 60
    
    # Stripe API
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None

    # Support / Notifications
    TEAMS_WEBHOOK_URL: Optional[str] = None
    
    # Storage
    STORAGE_BUCKET: Optional[str] = None
    
    # Error Tracking
    SENTRY_DSN: Optional[str] = None
    
    # Redis Cache
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_ENABLED: bool = True
    
    # API Security
    BRAIN_API_KEY: Optional[str] = None
    JWT_SECRET: str = "ampac-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"

    # Auth (Firebase ID tokens)
    AUTH_DISABLED: bool = False
    AUTH_DEV_USER_ID: str = "demo_user"
    
    # Environment
    ENV: str = "development"  # development, staging, production

    class Config:
        env_file = ".env"
        extra = "ignore"


def validate_production_settings(settings: Settings) -> list[str]:
    """
    Validate settings for production environment.
    Returns a list of error messages if validation fails.
    """
    errors = []
    
    if settings.ENV == "production":
        # Critical: AUTH_DISABLED must be False in production
        if settings.AUTH_DISABLED:
            errors.append("AUTH_DISABLED cannot be True in production")
        
        # Critical: JWT secret must be changed from default
        if settings.JWT_SECRET == "ampac-secret-key-change-in-production":
            errors.append("JWT_SECRET must be changed from default value in production")
        
        # Critical: Must have Stripe configured for payments
        if not settings.STRIPE_SECRET_KEY:
            errors.append("STRIPE_SECRET_KEY is required in production")
        
        # Warning: CORS should be restricted
        if "*" in settings.ALLOWED_CORS_ORIGINS:
            print("⚠️  WARNING: CORS allows all origins (*) in production. Consider restricting.")
    
    return errors


@lru_cache()
def get_settings():
    settings = Settings()
    
    # Validate production settings
    errors = validate_production_settings(settings)
    if errors:
        error_msg = "\n".join(f"  - {e}" for e in errors)
        raise ValueError(f"❌ Production configuration validation failed:\n{error_msg}")
    
    return settings
