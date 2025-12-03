from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional
from firebase_admin import firestore
from app.services.ventures_client import VenturesClient, ventures_client
from app.services.encryption_service import encryption_service
from app.services.sync_service import sync_service_instance
from app.core.config import get_settings

router = APIRouter()

class SyncRequest(BaseModel):
    loanId: str
    mode: str # 'dry_run', 'validate', 'commit'
    note: Optional[str] = None

class ConfigureRequest(BaseModel):
    username: str
    password: str
    site_name: str

from app.services.token_storage import TokenStorage

token_storage = TokenStorage()

@router.post("/configure")
async def configure_ventures(config: ConfigureRequest, user_id: str = "demo_user"): # TODO: Get real user_id from auth dependency
    """
    Validates credentials and saves them encrypted to Firestore for the user.
    """
    try:
        # 1. Validate by attempting login (Optional, but good UX)
        # For "Zero-Config", we might skip validation if we trust the user, 
        # but validation prevents bad states.
        temp_client = VenturesClient(
            username=config.username, 
            password=config.password, 
            site_name=config.site_name
        )
        try:
            await temp_client.login()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Authentication failed: {str(e)}")

        # 2. Save to TokenStorage (User-specific vault)
        await token_storage.save_ventures_creds(user_id, {
            "username": config.username,
            "password": config.password,
            "site": config.site_name
        })

        # 3. Reload global client? 
        # No, the global client is likely for a system account. 
        # For user-specific actions, we should instantiate a client per request using stored creds.
        # But for now, we'll keep the existing pattern if it relies on a singleton, 
        # OR we just acknowledge the config is saved.
        
        return {"success": True, "message": "Ventures integration configured successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/config/status")
async def get_config_status(user_id: str = "demo_user"):
    """
    Checks if Ventures is configured for the user.
    """
    try:
        creds = await token_storage.get_ventures_creds(user_id)
        if creds:
            return {
                "configured": True,
                "username": creds.get("username"),
                "site_name": creds.get("site")
            }
        return {"configured": False}
    except Exception as e:
        print(f"Error checking status: {e}")
        return {"configured": False, "error": str(e)}

@router.get("/status/{loan_id}")
async def get_ventures_status(loan_id: str):
    """
    Proxy endpoint to get loan status from Ventures.
    """
    try:
        # In a real app, we'd map AmPac ID -> Ventures ID here
        # For now, we pass it through or use a mock ID if it's not a Ventures ID
        ventures_id = loan_id if loan_id.startswith("v-") else "12345"
        
        # data = await ventures_client.get_loan_status(ventures_id)
        # Mocking response for now since we don't have real creds
        return {
            "venturesLoanId": ventures_id,
            "status": "connected",
            "lastSync": 1630000000000,
            "fieldMappings": [
                {"field": "Status", "ampacValue": "Underwriting", "venturesValue": "Underwriting", "status": "match"}
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync")
async def sync_loan(request: SyncRequest):
    """
    Trigger a sync operation.
    """
    try:
        # Logic to fetch AmPac data, transform it, and send to Ventures
        # result = await ventures_client.sync_loan(...)
        
        return {
            "success": True,
            "log": {
                "id": "log_123",
                "status": "success",
                "summary": f"Successfully executed {request.mode}",
                "timestamp": 1630000000000
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard")
async def get_dashboard_stats():
    """
    Returns sync statistics and recent logs.
    """
    settings = get_settings()
    
    # Feature flag or fallback if service not initialized
    if settings.USE_FAKE_SYNC or not sync_service_instance:
        return {
            "syncedCount": 142,
            "pendingCount": 12,
            "errorCount": 5,
            "recentLogs": [
                {"timestamp": "2023-10-27T10:00:00Z", "status": "success", "message": "Synced Loan 123 (Fake)"},
                {"timestamp": "2023-10-27T09:55:00Z", "status": "error", "message": "Failed to connect (Fake)"}
            ]
        }
    
    stats = sync_service_instance.get_sync_stats()
    logs = sync_service_instance.get_recent_logs()
    
    return {
        "syncedCount": stats["syncedCount"],
        "pendingCount": stats["pendingCount"],
        "errorCount": stats["errorCount"],
        "recentLogs": logs
    }
