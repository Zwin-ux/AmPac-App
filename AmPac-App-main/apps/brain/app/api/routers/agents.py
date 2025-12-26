from fastapi import APIRouter, HTTPException, Depends
from app.schemas.agents import AgentTriggerRequest, AgentWorkflowResponse
from app.services.agent_service import agent_service
from app.core.firebase_auth import AuthContext, get_current_user

router = APIRouter()

@router.post("/trigger", response_model=AgentWorkflowResponse)
async def trigger_agent(request: AgentTriggerRequest, user: AuthContext = Depends(get_current_user)):
    try:
        return await agent_service.trigger_workflow(request.agent_type, request.context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{workflow_id}")
async def get_agent_status(workflow_id: str, user: AuthContext = Depends(get_current_user)):
    status = await agent_service.get_workflow_status(workflow_id)
    if not status:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return status

from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.services.staff_copilot import staff_copilot_agent

class CopilotRequest(BaseModel):
    query: str
    context: Optional[Dict[str, Any]] = {}

@router.post("/copilot")
async def copilot_chat(request: CopilotRequest, user: AuthContext = Depends(get_current_user)):
    """
    Endpoint for Staff Copilot chat.
    """
    if not user.is_staff and user.role != "dev":
        raise HTTPException(status_code=403, detail="Staff access required")
    response = await staff_copilot_agent.handle_query(request.query, request.context)
    return {"response": response}
