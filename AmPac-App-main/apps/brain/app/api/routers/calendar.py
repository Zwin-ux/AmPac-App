from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from app.core.config import get_settings
from app.core.firebase_auth import AuthContext, get_current_user
from app.services.graph_service import GraphService
from app.services.circuit_breaker import get_breaker
from firebase_admin import firestore
import uuid

router = APIRouter()
settings = get_settings()
graph_breaker = get_breaker("graph")

class BookingRequest(BaseModel):
    staffEmail: str
    durationMinutes: int
    chosenStartTime: str # ISO format
    borrowerEmail: Optional[str] = None  # deprecated; derived from Firebase token when available

class AvailabilityRequest(BaseModel):
    staffEmail: str
    durationMinutes: int
    start: Optional[str] = None
    end: Optional[str] = None

def _parse_iso(dt_str: Optional[str], default: datetime) -> datetime:
    if not dt_str:
        return default
    try:
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except ValueError:
        return default

def _generate_suggested_slots(start_dt: datetime, end_dt: datetime, duration_minutes: int, busy_slots: List[dict]) -> List[dict]:
    """
    Build a lightweight list of available slots (UTC) within the window, excluding busy intervals.
    """
    suggestions = []

    # Normalize busy windows to datetime for overlap checks
    normalized_busy = []
    for b in busy_slots:
        try:
            b_start = datetime.fromisoformat(b["startTime"].replace("Z", "+00:00"))
            b_end = datetime.fromisoformat(b["endTime"].replace("Z", "+00:00"))
            normalized_busy.append((b_start, b_end))
        except Exception:
            continue

    cursor = start_dt
    step = timedelta(minutes=duration_minutes)
    limit = 10  # cap suggestions to avoid large payloads

    while cursor + step <= end_dt and len(suggestions) < limit:
        slot_start = cursor
        slot_end = cursor + step
        overlap = any(slot_start < b_end and slot_end > b_start for b_start, b_end in normalized_busy)
        if not overlap:
            suggestions.append({
                "startTime": slot_start.isoformat(),
                "endTime": slot_end.isoformat()
            })
        cursor = slot_end

    return suggestions

@router.post("/available")
async def get_available_slots(request: AvailabilityRequest, user: AuthContext = Depends(get_current_user)):
    if not settings.BOOKINGS_ENABLED or not settings.GRAPH_ENABLED:
        raise HTTPException(status_code=503, detail="Calendar booking is disabled.")
    if settings.GRAPH_MOCK:
        return {
            "busy": [],
            "suggested": _generate_suggested_slots(
                _parse_iso(request.start, datetime.utcnow()),
                _parse_iso(request.end, datetime.utcnow() + timedelta(days=7)),
                request.durationMinutes,
                []
            ),
            "timeZone": "UTC",
            "mode": "mock"
        }
    if graph_breaker.state == "open" and not graph_breaker.allow_request():
        raise HTTPException(status_code=503, detail="Graph temporarily unavailable (breaker open).")

    service = GraphService()
    
    start_dt = _parse_iso(request.start, datetime.utcnow())
    end_dt = _parse_iso(request.end, start_dt + timedelta(days=7))

    # Use get_staff_availability which returns raw schedule items
    schedule_items = await service.get_staff_availability(
        request.staffEmail,
        start_dt,
        end_dt
    )
    graph_breaker.record_success()
    
    # Process items to find conflicts
    # We return a simplified list of busy slots for the frontend to subtract from available time
    busy_slots = []
    if schedule_items:
        # schedule_items is a list of ScheduleItem objects or dicts depending on SDK return
        # The SDK returns objects, so we access attributes directly
        for item in schedule_items:
            status_val = getattr(item, "status", None) if hasattr(item, "status") else item.get("status") if isinstance(item, dict) else None
            start_val = getattr(item, "start", None) if hasattr(item, "start") else item.get("start") if isinstance(item, dict) else None
            end_val = getattr(item, "end", None) if hasattr(item, "end") else item.get("end") if isinstance(item, dict) else None
            start_time = getattr(start_val, "date_time", None) if start_val else None
            end_time = getattr(end_val, "date_time", None) if end_val else None

            if status_val in ["busy", "tentative", "oof"] and start_time and end_time:
                busy_slots.append({
                    "startTime": start_time,
                    "endTime": end_time,
                    "isConflicting": True
                })

    suggested = _generate_suggested_slots(start_dt, end_dt, request.durationMinutes, busy_slots)
                
    return {
        "busy": busy_slots,
        "suggested": suggested,
        "timeZone": "UTC"
    }

@router.post("/book")
async def book_meeting(request: BookingRequest, user: AuthContext = Depends(get_current_user)):
    if not settings.BOOKINGS_ENABLED or not settings.GRAPH_ENABLED:
        raise HTTPException(status_code=503, detail="Calendar booking is disabled.")

    borrower_email = user.email or request.borrowerEmail
    if not borrower_email:
        raise HTTPException(status_code=400, detail="Borrower email missing; sign in with an email-based account.")
    if settings.GRAPH_MOCK:
        mock_event_id = f"mock-event-{uuid.uuid4()}"
        mock_join_url = "https://teams.microsoft.com/l/meetup-join/mock-link"
        try:
            db = firestore.client()
            booking_id = str(uuid.uuid4())
            chosen_dt = datetime.fromisoformat(request.chosenStartTime.replace("Z", "+00:00"))
            booking_data = {
                "id": booking_id,
                "staffEmail": request.staffEmail,
                "borrowerId": user.uid,
                "borrowerEmail": borrower_email,
                "eventId": mock_event_id,
                "joinUrl": mock_join_url,
                "startTime": request.chosenStartTime,
                "endTime": (chosen_dt + timedelta(minutes=request.durationMinutes)).isoformat(),
                "status": "confirmed",
                "createdAt": datetime.utcnow(),
                "mode": "mock"
            }
            db.collection("bookings").document(booking_id).set(booking_data)
        except Exception:
            # No-op in mock mode
            ...
        return {"eventId": mock_event_id, "joinUrl": mock_join_url}

    if graph_breaker.state == "open" and not graph_breaker.allow_request():
        raise HTTPException(status_code=503, detail="Graph temporarily unavailable (breaker open).")

    service = GraphService()
    
    # 1. Validate availability (Simplified: we trust the client's chosen time but could double check)
    try:
        chosen_dt = datetime.fromisoformat(request.chosenStartTime.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use ISO 8601.")

    chosen_end_dt = chosen_dt + timedelta(minutes=request.durationMinutes)
    
    # Double check availability
    window_start = chosen_dt
    window_end = chosen_end_dt
    
    schedule_items = await service.get_staff_availability(
        request.staffEmail, 
        window_start, 
        window_end
    )
    
    for item in schedule_items:
         if item.status in ["busy", "tentative", "oof"]:
             # If there is ANY busy item in this window, it's a conflict
             # (The window is exactly the meeting time)
             raise HTTPException(status_code=409, detail="Time slot is no longer available.")

    # 2. Create Event
    event_result = await service.create_calendar_event(
        organizer_email=request.staffEmail,
        subject="Consultation Call",
        attendees=[borrower_email],
        start_time=request.chosenStartTime,
        end_time=chosen_end_dt.isoformat()
    )
    
    if not event_result:
        graph_breaker.record_failure("create_calendar_event_failed")
        raise HTTPException(status_code=502, detail="Failed to create calendar event with provider.")
    else:
        graph_breaker.record_success()

    # 3. Persist to Firestore
    try:
        db = firestore.client()
        booking_id = str(uuid.uuid4())
        booking_data = {
            "id": booking_id,
            "staffEmail": request.staffEmail,
            "borrowerId": user.uid,
            "borrowerEmail": borrower_email,
            "eventId": event_result["eventId"],
            "joinUrl": event_result["joinUrl"],
            "startTime": request.chosenStartTime,
            "endTime": chosen_end_dt.isoformat(),
            "status": "confirmed",
            "createdAt": datetime.utcnow()
        }
        db.collection("bookings").document(booking_id).set(booking_data)
    except Exception as e:
        print(f"Failed to save booking to Firestore: {e}")
    
    return {
        "eventId": event_result["eventId"],
        "joinUrl": event_result["joinUrl"]
    }
