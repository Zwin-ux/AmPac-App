from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional
from firebase_admin import firestore
from app.services.ventures_client import VenturesClient, ventures_client
from app.services.encryption_service import encryption_service

router = APIRouter()

class SyncRequest(BaseModel):
    loanId: str
    mode: str # 'dry_run', 'validate', 'commit'
    note: Optional[str] = None

class ConfigureRequest(BaseModel):
    username: str
    password: str
    site_name: str

@router.post("/configure")
async def configure_ventures(config: ConfigureRequest):
    """
    Validates credentials and saves them encrypted to Firestore.
    """
    try:
        # 1. Validate by attempting login
        temp_client = VenturesClient(
            username=config.username, 
            password=config.password, 
            site_name=config.site_name
        )
        try:
            await temp_client.login()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Authentication failed: {str(e)}")

        # 2. Encrypt password
        encrypted_pw = encryption_service.encrypt(config.password)

        # 3. Save to Firestore
        db = firestore.client()
        db.collection("system_secrets").document("ventures_config").set({
            "username": config.username,
            "encrypted_password": encrypted_pw,
            "site_name": config.site_name,
            "updated_at": firestore.SERVER_TIMESTAMP
        })

        # 4. Reload the global client
        ventures_client._load_config()

        return {"success": True, "message": "Ventures integration configured successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/config/status")
async def get_config_status():
    """
    Checks if Ventures is configured.
    """
    try:
        db = firestore.client()
        doc = db.collection("system_secrets").document("ventures_config").get()
        if doc.exists:
            data = doc.to_dict()
            return {
                "configured": True,
                "username": data.get("username"),
                "site_name": data.get("site_name")
            }
        return {"configured": False}
    except Exception as e:
        # If Firestore fails (e.g. permissions), assume not configured or error
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
