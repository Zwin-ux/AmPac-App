from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import httpx

from app.core.config import get_settings
from app.core.firebase_auth import AuthContext, get_current_user


router = APIRouter()
settings = get_settings()


class SupportNotifyRequest(BaseModel):
    title: str
    body: str


def _truncate(value: str, max_len: int) -> str:
    if len(value) <= max_len:
        return value
    return value[: max_len - 1] + "…"


@router.post("/notify")
async def notify_support(request: SupportNotifyRequest, user: AuthContext = Depends(get_current_user)):
    """
    Sends a support notification to Teams (server-side) using an incoming webhook.
    """
    if not settings.TEAMS_WEBHOOK_URL:
        raise HTTPException(status_code=503, detail="Support notifications not configured")

    title = _truncate(request.title.strip(), 200)
    body = _truncate(request.body.strip(), 3500)

    text = f"**{title}**\n{body}\n\nUser: {user.uid}"
    if user.email:
        text += f"\nEmail: {user.email}"

    payload = {"text": text}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(settings.TEAMS_WEBHOOK_URL, json=payload)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Support notification failed: {e}")

    if res.status_code >= 300:
        raise HTTPException(status_code=502, detail="Support notification failed")

    return {"ok": True}

