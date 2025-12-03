from fastapi import APIRouter, HTTPException
from app.schemas.agents import AgentTriggerRequest, AgentWorkflowResponse
from app.services.agent_service import agent_service

router = APIRouter()

@router.post("/trigger", response_model=AgentWorkflowResponse)
async def trigger_agent(request: AgentTriggerRequest):
    try:
        return await agent_service.trigger_workflow(request.agent_type, request.context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{workflow_id}")
async def get_agent_status(workflow_id: str):
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
async def copilot_chat(request: CopilotRequest):
    """
    Endpoint for Staff Copilot chat.
    """
    response = await staff_copilot_agent.handle_query(request.query, request.context)
    return {"response": response}
