import uuid
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from app.schemas.agents import AgentWorkflowResponse

class AgentService:
    def __init__(self):
        self._workflows: Dict[str, Dict[str, Any]] = {}

    async def trigger_workflow(self, agent_type: str, context: Dict[str, Any]) -> AgentWorkflowResponse:
        workflow_id = f"wf_{uuid.uuid4().hex[:8]}"
        completion_time = datetime.utcnow() + timedelta(minutes=2) # Faster for demo
        
        # Initialize state
        self._workflows[workflow_id] = {
            "id": workflow_id,
            "agent_type": agent_type,
            "status": "running",
            "logs": [f"[{datetime.utcnow().isoformat()}] Agent {agent_type} initialized"],
            "estimated_completion": completion_time,
            "result": None
        }

        # Start background task
        asyncio.create_task(self._run_workflow(workflow_id, agent_type, context))
        
        return AgentWorkflowResponse(
            workflow_id=workflow_id,
            status="started",
            estimated_completion=completion_time,
            logs=self._workflows[workflow_id]["logs"]
        )

    async def get_workflow_status(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        return self._workflows.get(workflow_id)

    async def _run_workflow(self, workflow_id: str, agent_type: str, context: Dict[str, Any]):
        """
        Simulates a multi-step agent workflow.
        """
        try:
            await self._log(workflow_id, "Analyzing context and requirements...")
            await asyncio.sleep(3)
            
            if agent_type == "document_chaser":
                await self._log(workflow_id, f"Identified missing documents: {context.get('missingDocs', 'None')}")
                await asyncio.sleep(3)
                await self._log(workflow_id, "Drafting email to borrower...")
                await asyncio.sleep(2)
                await self._log(workflow_id, "Email sent via Graph API.")
            
            elif agent_type == "compliance_check":
                await self._log(workflow_id, "Fetching OFAC list...")
                await asyncio.sleep(3)
                await self._log(workflow_id, "Screening business entities...")
                await asyncio.sleep(3)
                await self._log(workflow_id, "No matches found. Compliance PASS.")
            
            else:
                await self._log(workflow_id, "Processing generic workflow...")
                await asyncio.sleep(5)

            # Complete
            self._workflows[workflow_id]["status"] = "completed"
            await self._log(workflow_id, "Workflow completed successfully.")
            
        except Exception as e:
            self._workflows[workflow_id]["status"] = "failed"
            await self._log(workflow_id, f"Workflow failed: {str(e)}")

    async def _log(self, workflow_id: str, message: str):
        if workflow_id in self._workflows:
            timestamp = datetime.utcnow().isoformat()
            self._workflows[workflow_id]["logs"].append(f"[{timestamp}] {message}")

agent_service = AgentService()
