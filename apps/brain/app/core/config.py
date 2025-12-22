from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "AmPac Brain 🧠"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    # CORS
    ALLOWED_CORS_ORIGINS: list[str] = ["*"] # Default to all, override in prod.env
    
    # OpenAI
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o"
    
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
    
    # API Security
    BRAIN_API_KEY: Optional[str] = None
    JWT_SECRET: str = "ampac-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"

    # Auth (Firebase ID tokens)
    AUTH_DISABLED: bool = False
    AUTH_DEV_USER_ID: str = "demo_user"

    class Config:
        env_file = ".env"
        extra = "ignore"

@lru_cache()
def get_settings():
    return Settings()
