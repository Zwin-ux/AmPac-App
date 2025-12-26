from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.schemas.application import ApplicationCreate, ApplicationUpdate, ApplicationResponse
from app.services.application_service import application_service
from app.core.firebase_auth import AuthContext, get_current_user

router = APIRouter()

@router.get("/ping")
async def ping():
    return {"status": "pong", "service": "applications"}

@router.get("/user/me", response_model=List[ApplicationResponse])
async def list_my_applications(user: AuthContext = Depends(get_current_user)):
    """
    List all applications for the current user.
    """
    return await application_service.list_user_applications(user.uid)

@router.post("/", response_model=ApplicationResponse)
async def create_application(request: ApplicationCreate, user: AuthContext = Depends(get_current_user)):
    """
    Create a new loan application.
    """
    try:
        return await application_service.create_application(user.uid, request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{app_id}", response_model=ApplicationResponse)
async def get_application(app_id: str, user: AuthContext = Depends(get_current_user)):
    """
    Get application details by ID.
    """
    app = await application_service.get_application(app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if app.userId != user.uid and not user.is_staff:
        raise HTTPException(status_code=403, detail="Forbidden")
    return app

@router.put("/{app_id}", response_model=ApplicationResponse)
async def update_application(app_id: str, request: ApplicationUpdate, user: AuthContext = Depends(get_current_user)):
    """
    Update an existing application (autosave).
    """
    existing = await application_service.get_application(app_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Application not found")
    if existing.userId != user.uid and not user.is_staff:
        raise HTTPException(status_code=403, detail="Forbidden")

    app = await application_service.update_application(app_id, request)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app

@router.post("/{app_id}/submit", response_model=ApplicationResponse)
async def submit_application(app_id: str, user: AuthContext = Depends(get_current_user)):
    """
    Submit an application for review.
    """
    existing = await application_service.get_application(app_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Application not found")
    if existing.userId != user.uid and not user.is_staff:
        raise HTTPException(status_code=403, detail="Forbidden")

    app = await application_service.submit_application(app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app
