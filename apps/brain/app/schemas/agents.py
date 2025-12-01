from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class AgentTriggerRequest(BaseModel):
    agent_type: str = Field(..., description="Type of agent to trigger (document_chaser, compliance_check)")
    context: Dict[str, Any] = Field(..., description="Context for the agent (loanId, etc.)")

class AgentWorkflowResponse(BaseModel):
    workflow_id: str
    status: str
    estimated_completion: datetime
    logs: List[str] = []
