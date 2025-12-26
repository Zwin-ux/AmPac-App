from datetime import datetime
from typing import Dict, Any, Optional, List
from firebase_admin import firestore
from app.core.firebase import get_db

# Firestore collection used for persistence of sync events.
COLLECTION = "sync_events"


def _col():
    return get_db().collection(COLLECTION)


def record_event(event: Dict[str, Any]) -> Optional[str]:
    """
    Adds a sync event to Firestore. Returns document id on success.
    Expected fields:
        type: str (app_status, task_status, upload, meeting, etc.)
        source: str (firestore, ventures, sharefile, graph)
        targetIds: dict
        payloadHash: str
        status: str (pending, in_flight, done, failed, dead_letter, success, error)
        retries: int
    """
    try:
        now = datetime.utcnow()
        status = event.get("status") or "pending"
        data = {
            "status": status,
            "retries": event.get("retries", 0),
            "createdAt": event.get("createdAt", now),
            "updatedAt": event.get("updatedAt", now),
            **event,
        }
        doc_ref = _col().add(data)
        return doc_ref[1].id if isinstance(doc_ref, tuple) else None
    except Exception as e:
        print(f"Failed to record sync event: {e}")
        return None


def get_queue_depths() -> Dict[str, int]:
    """
    Returns counts of sync events by status for health/ops visibility.
    """
    depths = {"pending": 0, "in_flight": 0, "dead_letter": 0}
    try:
        for status in depths.keys():
            depths[status] = sum(1 for _ in _col().where("status", "==", status).stream())
    except Exception as e:
        print(f"Failed to read queue depths: {e}")
    return depths


def get_recent_events(limit: int = 20) -> list[Dict[str, Any]]:
    """
    Returns recent events (most recent first) for dashboards.
    """
    try:
        docs = _col().order_by("updatedAt", direction=firestore.Query.DESCENDING).limit(limit).stream()
        events = []
        for d in docs:
            ev = d.to_dict()
            ev["id"] = d.id
            # Normalize timestamp to isoformat string for transport
            updated_at = ev.get("updatedAt")
            if hasattr(updated_at, "isoformat"):
                ev["updatedAt"] = updated_at.isoformat()
            created_at = ev.get("createdAt")
            if hasattr(created_at, "isoformat"):
                ev["createdAt"] = created_at.isoformat()
            events.append(ev)
        return events
    except Exception as e:
        print(f"Failed to read recent sync events: {e}")
        return []


def get_dead_letter(limit: int = 20) -> List[Dict[str, Any]]:
    """
    Returns dead-lettered events.
    """
    try:
        docs = _col().where("status", "==", "dead_letter").order_by("updatedAt", direction=firestore.Query.DESCENDING).limit(limit).stream()
        items = []
        for d in docs:
            ev = d.to_dict()
            ev["id"] = d.id
            updated_at = ev.get("updatedAt")
            if hasattr(updated_at, "isoformat"):
                ev["updatedAt"] = updated_at.isoformat()
            created_at = ev.get("createdAt")
            if hasattr(created_at, "isoformat"):
                ev["createdAt"] = created_at.isoformat()
            items.append(ev)
        return items
    except Exception as e:
        print(f"Failed to read DLQ events: {e}")
        return []


def update_event_status(event_id: str, status: str, last_error: Optional[str] = None) -> bool:
    """
    Updates event status and optional lastError. Returns True on success.
    """
    try:
        data = {"status": status, "updatedAt": datetime.utcnow()}
        if last_error is not None:
            data["lastError"] = last_error
        _col().document(event_id).update(data)
        return True
    except Exception as e:
        print(f"Failed to update event {event_id}: {e}")
        return False
