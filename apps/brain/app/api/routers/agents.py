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
