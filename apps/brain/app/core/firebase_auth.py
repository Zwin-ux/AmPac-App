from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Optional

from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth as firebase_auth

from app.core.config import get_settings
from app.core.firebase import ensure_firebase_app


bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthContext:
    uid: str
    email: Optional[str]
    claims: Dict[str, Any] = field(default_factory=dict)

    @property
    def role(self) -> str:
        role = self.claims.get("role")
        if isinstance(role, str) and role:
            return role
        return "borrower"

    @property
    def is_staff(self) -> bool:
        return self.role in {"staff", "admin", "service"}


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
) -> AuthContext:
    settings = get_settings()
    if settings.AUTH_DISABLED:
        return AuthContext(uid=settings.AUTH_DEV_USER_ID, email=None, claims={"role": "dev"})

    if not credentials:
        raise HTTPException(status_code=401, detail="Missing Authorization Bearer token")
    if credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid auth scheme; expected Bearer")

    try:
        ensure_firebase_app()
        decoded = firebase_auth.verify_id_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Firebase ID token")

    uid = decoded.get("uid") or decoded.get("user_id") or decoded.get("sub")
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid Firebase ID token (missing uid)")

    return AuthContext(uid=uid, email=decoded.get("email"), claims=decoded)

