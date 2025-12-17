from datetime import datetime, timedelta
from fastapi import APIRouter
from app.core.firebase import get_db
from app.core.config import get_settings
from app.services.sync_service import sync_service_instance
from app.services.sync_event_store import get_queue_depths, get_dead_letter
from app.services.circuit_breaker import get_breaker_states, get_breaker
from app.services.graph_service import graph_service
from app.services.sync_health_store import read_sync_heartbeat

router = APIRouter()


@router.get("/")
async def api_health():
    """
    Aggregated health snapshot for API v1.
    """
    deps = await dependency_health()
    sync = await sync_health()
    breaker_states = get_breaker_states()

    return {
        "status": "ok" if deps["status"] == "ok" and sync["status"] in ["ok", "stale"] else "degraded",
        "deps": deps,
        "sync": sync,
        "breakers": breaker_states,
    }


@router.get("/deps")
async def dependency_health():
    """
    Lightweight dependency health indicators.
    """
    settings = get_settings()
    dependencies = {}

    # Firestore
    try:
        db = get_db()
        test_iter = db.collection("health_checks").limit(1).stream()
        next(test_iter, None)
        dependencies["firestore"] = {"status": "ok"}
    except Exception as e:
        dependencies["firestore"] = {"status": "error", "error": str(e)}

    # Ventures
    if not settings.VENTURES_ENABLED:
        dependencies["ventures"] = {"status": "disabled"}
    elif settings.VENTURES_MOCK_MODE:
        dependencies["ventures"] = {"status": "mock"}
    elif settings.VENTURES_USERNAME and settings.VENTURES_PASSWORD:
        dependencies["ventures"] = {"status": "configured"}
    else:
        dependencies["ventures"] = {"status": "unconfigured"}

    # Microsoft Graph
    if not settings.GRAPH_ENABLED:
        dependencies["graph"] = {"status": "disabled"}
    elif settings.GRAPH_MOCK:
        dependencies["graph"] = {"status": "mock"}
    elif settings.AZURE_CLIENT_ID and settings.AZURE_CLIENT_SECRET and settings.AZURE_TENANT_ID:
        dependencies["graph"] = {"status": "configured"}
    else:
        dependencies["graph"] = {"status": "unconfigured"}

    # ShareFile
    if not settings.SHAREFILE_ENABLED:
        dependencies["sharefile"] = {"status": "disabled"}
    elif settings.SHAREFILE_MOCK:
        dependencies["sharefile"] = {"status": "mock"}
    elif settings.SHAREFILE_CLIENT_ID and settings.SHAREFILE_CLIENT_SECRET:
        dependencies["sharefile"] = {"status": "configured"}
    else:
        dependencies["sharefile"] = {"status": "unconfigured"}

    overall_ok = all(
        item["status"] in ["ok", "mock", "configured"] for item in dependencies.values()
    )

    return {
        "status": "ok" if overall_ok else "degraded",
        "dependencies": dependencies
    }


@router.get("/sync")
async def sync_health():
    """
    Sync loop freshness + queue/error snapshot.
    """
    settings = get_settings()
    snapshot = None
    if sync_service_instance:
        snapshot = sync_service_instance.get_health_snapshot()
    else:
        heartbeat = read_sync_heartbeat()
        if heartbeat:
            snapshot = {
                "lastLoopAt": heartbeat.get("lastLoopAt").isoformat() if hasattr(heartbeat.get("lastLoopAt"), "isoformat") else heartbeat.get("lastLoopAt"),
                "lastError": heartbeat.get("lastError"),
                "stats": heartbeat.get("stats"),
                "recentLogs": heartbeat.get("recentLogs"),
            }

    if not snapshot:
        return {"status": "degraded", "reason": "sync_worker_heartbeat_missing", "queueDepth": get_queue_depths()}

    last_loop = snapshot.get("lastLoopAt")
    stale = False

    if last_loop:
        try:
            last_loop_dt = datetime.fromisoformat(last_loop)
            if datetime.utcnow() - last_loop_dt > timedelta(seconds=settings.SYNC_HEALTH_STALE_SECONDS):
                stale = True
        except Exception:
            stale = True
    else:
        stale = True

    status = "ok"
    if stale:
        status = "stale"
    if snapshot.get("lastError"):
        status = "degraded"

    queue_depth = get_queue_depths()
    dlq_items = get_dead_letter(limit=5)

    return {
        "status": status,
        "stale": stale,
        "lastError": snapshot.get("lastError"),
        "lastLoopAt": snapshot.get("lastLoopAt"),
        "stats": snapshot.get("stats"),
        "recentLogs": snapshot.get("recentLogs"),
        "staleAfterSeconds": settings.SYNC_HEALTH_STALE_SECONDS,
        "queueDepth": queue_depth,
        "dlq": dlq_items
    }


@router.get("/calendar")
async def calendar_health():
    """
    Calendar/Graph health snapshot (non-invasive).
    """
    settings = get_settings()
    breaker = get_breaker("graph")

    flags = {
        "graphEnabled": settings.GRAPH_ENABLED,
        "graphMock": settings.GRAPH_MOCK,
        "bookingsEnabled": settings.BOOKINGS_ENABLED
    }

    status = "ok"
    reason = None

    if not settings.BOOKINGS_ENABLED or not settings.GRAPH_ENABLED:
        status = "disabled"
        reason = "bookings_disabled" if not settings.BOOKINGS_ENABLED else "graph_disabled"
    elif settings.GRAPH_MOCK:
        status = "mock"
    elif breaker.state == "open":
        status = "circuit_open"
        reason = breaker.last_error or "breaker_open"
    elif not (settings.AZURE_CLIENT_ID and settings.AZURE_CLIENT_SECRET and settings.AZURE_TENANT_ID):
        status = "unconfigured"
        reason = "missing_credentials"
    elif not graph_service.client:
        status = "unavailable"
        reason = "graph_client_not_initialized"

    return {
        "status": status,
        "reason": reason,
        "flags": flags,
        "breaker": breaker.to_dict(),
        "hasClient": bool(graph_service.client),
    }
