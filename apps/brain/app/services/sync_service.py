import asyncio
from datetime import datetime
from app.core.config import get_settings
from app.services.ventures.base import AbstractVenturesClient
from app.services.ventures.mock import MockVenturesClient
# from app.services.ventures.real import RealVenturesClient # Future
from app.services.sharefile_client import ShareFileClient
from app.core.firebase import get_db
from app.core.constants import VENTURES_STATUS_MAP, ApplicationStatus

class SyncService:
    """
    Background service to synchronize state between Ventures, ShareFile, and Firestore.
    """

    def __init__(self):
        settings = get_settings()
        if settings.VENTURES_MOCK_MODE:
            print("SyncService: Using MockVenturesClient")
            self.ventures_client: AbstractVenturesClient = MockVenturesClient()
        else:
            # self.ventures_client = RealVenturesClient()
            print("SyncService: Real client not implemented, falling back to Mock")
            self.ventures_client = MockVenturesClient()
            
        self.sharefile_client = ShareFileClient()
        self.db = get_db()

    async def start_sync_loop(self):
        """
        Starts the background synchronization loop.
        """
        print("Starting Sync Service Loop...")
        while True:
            try:
                await self.sync_loan_statuses()
                await self.sync_tasks()
                await self.sync_uploads_to_ventures()
            except Exception as e:
                print(f"Error in sync loop: {e}")
            
            # Sleep for a defined interval (e.g., 30 seconds for demo purposes)
            await asyncio.sleep(30) 

    async def sync_loan_statuses(self):
        """
        Queries active applications in Firestore and updates status from Ventures.
        """
        try:
            # 1. Query Firestore for applications that are not in a terminal state
            apps_ref = self.db.collection("applications")
            docs = apps_ref.where("venturesLoanId", "!=", "").stream()

            for doc in docs:
                app_data = doc.to_dict()
                ventures_id = app_data.get("venturesLoanId")
                current_status = app_data.get("status")
                
                if not ventures_id:
                    continue

                # 2. Call Ventures API
                loan_detail = await self.ventures_client.get_loan_detail(ventures_id)
                if not loan_detail:
                    continue

                ventures_status_name = loan_detail.status_name
                
                # 3. Map to App Status
                new_app_status = VENTURES_STATUS_MAP.get(ventures_status_name)
                
                if new_app_status and new_app_status != current_status:
                    print(f"Updating Loan {doc.id}: {current_status} -> {new_app_status}")
                    
                    # 4. Update Firestore
                    apps_ref.document(doc.id).update({
                        "status": new_app_status,
                        "venturesStatus": ventures_status_name,
                        "lastSyncedAt": datetime.utcnow()
                    })
                    
        except Exception as e:
            print(f"Error syncing loan statuses: {e}")

    async def sync_tasks(self):
        """
        Syncs underwriting conditions from Ventures to Firestore Tasks.
        """
        try:
            apps_ref = self.db.collection("applications")
            docs = apps_ref.where("venturesLoanId", "!=", "").stream()

            for doc in docs:
                app_data = doc.to_dict()
                ventures_id = app_data.get("venturesLoanId")
                
                if not ventures_id:
                    continue

                # 1. Get Conditions from Ventures
                conditions = await self.ventures_client.get_conditions(ventures_id)
                
                # 2. Get existing Tasks for this loan
                tasks_ref = self.db.collection("tasks")
                existing_tasks = tasks_ref.where("loanApplicationId", "==", doc.id).stream()
                existing_task_map = {t.to_dict().get("venturesConditionId"): t for t in existing_tasks}

                for condition in conditions:
                    cond_id = condition.id
                    cond_status = condition.status # e.g., "Open", "Waived", "Satisfied"
                    cond_desc = condition.description
                    
                    # Map Ventures condition status to Task status
                    task_status = "open"
                    if cond_status in ["Satisfied", "Waived", "Received"]:
                        task_status = "completed"

                    if cond_id in existing_task_map:
                        # Update existing task if status changed
                        task_doc = existing_task_map[cond_id]
                        current_task_status = task_doc.to_dict().get("status")
                        
                        # Only update if changed AND if the change is coming from Ventures (source of truth)
                        # But wait, if we just uploaded a file, we marked it completed locally.
                        # If Ventures still says "Open", we shouldn't revert it immediately if we are waiting for sync.
                        # However, for this simple sync, we assume Ventures is master.
                        # If we uploaded, we should have updated Ventures status too (see sync_uploads_to_ventures).
                        
                        if current_task_status != task_status:
                            tasks_ref.document(task_doc.id).update({
                                "status": task_status,
                                "lastSyncedAt": datetime.utcnow()
                            })
                    elif task_status == "open":
                        # Create new task only if it's open
                        new_task = {
                            "loanApplicationId": doc.id,
                            "venturesConditionId": cond_id,
                            "title": "Action Required",
                            "description": cond_desc,
                            "type": "borrower_action",
                            "status": "open",
                            "priority": "high",
                            "createdAt": datetime.utcnow(),
                            "createdBy": "system_sync"
                        }
                        tasks_ref.add(new_task)

        except Exception as e:
            print(f"Error syncing tasks: {e}")

    async def sync_uploads_to_ventures(self):
        """
        Checks for tasks that are 'completed' in Firestore (uploaded) but 'Open' in Ventures.
        Updates Ventures status to 'Received'.
        """
        try:
            # Find tasks that are completed but have a venturesConditionId
            tasks_ref = self.db.collection("tasks")
            # Query for completed tasks
            # Note: Complex queries might need index. 
            # For now, let's iterate active loans and their tasks to be safe/simple for this scale.
            
            apps_ref = self.db.collection("applications")
            docs = apps_ref.where("venturesLoanId", "!=", "").stream()
            
            for app_doc in docs:
                app_data = app_doc.to_dict()
                ventures_id = app_data.get("venturesLoanId")
                
                tasks = tasks_ref.where("loanApplicationId", "==", app_doc.id).where("status", "==", "completed").stream()
                
                for task_doc in tasks:
                    task_data = task_doc.to_dict()
                    cond_id = task_data.get("venturesConditionId")
                    
                    if not cond_id:
                        continue
                        
                    # Check current status in Ventures (via our client cache/fetch)
                    # Optimization: We could fetch all conditions once per loan, but get_conditions is fast/mocked.
                    conditions = await self.ventures_client.get_conditions(ventures_id)
                    matching_cond = next((c for c in conditions if c.id == cond_id), None)
                    
                    if matching_cond and matching_cond.status == "Open":
                        print(f"Pushing Upload Status to Ventures: {cond_id} -> Received")
                        await self.ventures_client.update_condition_status(cond_id, "Received")

        except Exception as e:
            print(f"Error syncing uploads: {e}")

