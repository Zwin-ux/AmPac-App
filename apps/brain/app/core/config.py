from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "AmPac Brain 🧠"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    # OpenAI
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o"
    
    # Firebase
    FIREBASE_CREDENTIALS_PATH: str = "serviceAccountKey.json"
    
    # Microsoft Graph
    AZURE_TENANT_ID: Optional[str] = None
    AZURE_CLIENT_ID: Optional[str] = None
    AZURE_CLIENT_SECRET: Optional[str] = None

    # Ventures API
    VENTURES_USERNAME: Optional[str] = None
    VENTURES_PASSWORD: Optional[str] = None
    VENTURES_MOCK_MODE: bool = True

    # ShareFile API
    SHAREFILE_CLIENT_ID: Optional[str] = None
    SHAREFILE_CLIENT_SECRET: Optional[str] = None
    SHAREFILE_SUBDOMAIN: str = "ampac" # e.g., https://ampac.sharefile.com

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
