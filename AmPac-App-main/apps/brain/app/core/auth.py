from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader
from app.core.config import get_settings
import jwt
from datetime import datetime, timedelta
from typing import Optional

settings = get_settings()

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def get_api_key(api_key: str = Security(api_key_header)):
    """
    Validates the API key for Brain service access.
    """
    if not settings.BRAIN_API_KEY:
        # In development mode, allow requests without API key
        if settings.VENTURES_MOCK_MODE:
            return "dev-mode"
        else:
            raise HTTPException(status_code=403, detail="API key not configured")
    
    if api_key != settings.BRAIN_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    return api_key

def create_jwt_token(user_id: str, role: str = "user", expires_minutes: int = 30) -> str:
    """
    Creates a JWT token for user authentication.
    """
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(minutes=expires_minutes),
        "iat": datetime.utcnow()
    }
    
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def verify_jwt_token(token: str) -> dict:
    """
    Verifies a JWT token and returns the decoded payload.
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user(token: str = Security(api_key_header)) -> dict:
    """
    Gets the current user from JWT token.
    """
    if not token:
        raise HTTPException(status_code=401, detail="Authorization token missing")
    
    # Check if it's a JWT token (starts with Bearer)
    if token.startswith("Bearer "):
        token = token[7:].strip()
        return verify_jwt_token(token)
    
    # Otherwise, treat as API key
    return {"sub": "api-client", "role": "service"}

async def get_current_user_or_api_key(
    api_key: Optional[str] = Security(api_key_header)
) -> dict:
    """
    Gets current user from either JWT token or API key.
    """
    if not api_key:
        raise HTTPException(status_code=401, detail="Authorization required")
    
    # Check if it's a JWT token
    if api_key.startswith("Bearer "):
        token = api_key[7:].strip()
        return verify_jwt_token(token)
    
    # Otherwise, validate as API key
    await get_api_key(api_key)
    return {"sub": "api-client", "role": "service"}

# Role-based access control
def require_role(role: str):
    """
    Dependency to check if user has required role.
    """
    def dependency(user: dict = Security(get_current_user_or_api_key)):
        if user.get("role") != role:
            raise HTTPException(
                status_code=403, 
                detail=f"Requires role: {role}, but user has role: {user.get('role')}"
            )
        return user
    return dependency

# Admin role check
def require_admin(user: dict = Security(get_current_user_or_api_key)):
    """
    Dependency to check if user is admin.
    """
    if user.get("role") not in ["admin", "service"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
