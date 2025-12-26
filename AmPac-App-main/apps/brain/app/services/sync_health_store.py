from datetime import datetime
from typing import Any, Dict, Optional

from app.core.firebase import get_db


COLLECTION = "ops"
DOC_ID = "sync"


def _doc():
    return get_db().collection(COLLECTION).document(DOC_ID)


def write_sync_heartbeat(data: Dict[str, Any]) -> None:
    """
    Writes a lightweight sync heartbeat document that API pods can read.
    """
    try:
        payload = {**data, "updatedAt": datetime.utcnow()}
        _doc().set(payload, merge=True)
    except Exception as e:
        print(f"Failed to write sync heartbeat: {e}")


def read_sync_heartbeat() -> Optional[Dict[str, Any]]:
    """
    Reads the sync heartbeat document. Returns None if missing/unavailable.
    """
    try:
        doc = _doc().get()
        if not doc.exists:
            return None
        return doc.to_dict() or {}
    except Exception as e:
        print(f"Failed to read sync heartbeat: {e}")
        return None

