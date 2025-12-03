import asyncio
from datetime import datetime
from app.core.config import get_settings
from app.services.ventures.base import AbstractVenturesClient
from app.services.ventures.mock import MockVenturesClient
# from app.services.ventures.real import RealVenturesClient # Future
from app.services.sharefile_client import ShareFileClient
from app.core.firebase import get_db
from app.core.constants import VENTURES_STATUS_MAP, ApplicationStatus
from typing import Callable, Any

# Global singleton
sync_service_instance = None

class SyncService:
    """
    Background service to synchronize state between Ventures, ShareFile, and Firestore.
    """

    def __init__(self):
        global sync_service_instance
        sync_service_instance = self

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
        
        # Stats and Logs
        self.recent_logs = []
        self.stats = {"synced": 0, "pending": 0, "errors": 0}

    async def _with_retry(self, func: Callable[[], Any], label: str, retries: int = 3, base_delay: float = 1.0):
        """
        Simple exponential backoff wrapper for flaky operations.
        """
        last_exc = None
        for attempt in range(retries):
            try:
                return await func()
            except Exception as e:
                last_exc = e
                if attempt == retries - 1:
                    break
                delay = base_delay * (2 ** attempt)
                self.log_event("info", f"{label} retry {attempt+1}/{retries}: {e}")
                await asyncio.sleep(delay)
        raise last_exc if last_exc else Exception(f"{label} failed without exception")

    def log_event(self, status: str, message: str):
        """
        Records a sync event in memory.
        """
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "status": status,
            "message": message
        }
        self.recent_logs.insert(0, entry)
        self.recent_logs = self.recent_logs[:50] # Keep last 50
        
        if status == "error":
            self.stats["errors"] += 1
        elif status == "success":
            self.stats["synced"] += 1

    def get_sync_stats(self):
        return {
            "syncedCount": self.stats["synced"],
            "pendingCount": self.stats["pending"], # Could be calculated from DB
            "errorCount": self.stats["errors"]
        }

    def get_recent_logs(self, limit: int = 10):
        return self.recent_logs[:limit]

    async def start_sync_loop(self):
        """
        Starts the background synchronization loop.
        """
        print("Starting Sync Service Loop...")
        
        # Initial Seed for Demo Purposes
        await self.seed_initial_data()

        while True:
            try:
                await self.sync_loan_statuses()
                await self.sync_tasks()
                await self.sync_uploads_to_ventures()
                await self._update_pending_stats()
            except Exception as e:
                print(f"Error in sync loop: {e}")
                self.log_event("error", str(e))
            
            # Sleep for a defined interval (e.g., 10 seconds for demo responsiveness)
            await asyncio.sleep(10) 

    async def seed_initial_data(self):
        """
        Seeds Firestore with mock data from Ventures if it doesn't exist.
        This ensures the Console has data to display immediately.
        """
        try:
            print("Checking if seeding is needed...")
            loans = await self._with_retry(self.ventures_client.get_all_loans, "ventures.get_all_loans")
            apps_ref = self.db.collection("applications")
            
            for loan in loans:
                # Check if app exists with this venturesLoanId
                query = apps_ref.where("venturesLoanId", "==", loan.id).limit(1).stream()
                existing_doc = next(query, None)
                
                if not existing_doc:
                    print(f"Seeding Loan {loan.id} into Firestore...")
                    # Map status
                    app_status = VENTURES_STATUS_MAP.get(loan.status_name, ApplicationStatus.SUBMITTED)
                    
                    new_app = {
                        "venturesLoanId": loan.id,
                        "businessName": loan.borrower_name,
                        "status": app_status,
                        "venturesStatus": loan.status_name,
                        "loanAmount": loan.balance,
                        "officerName": loan.officer_name,
                        "createdAt": datetime.utcnow(),
                        "lastSyncedAt": datetime.utcnow(),
                        "userId": "demo_user" # Placeholder
                    }
                    apps_ref.add(new_app)
        except Exception as e:
            print(f"Error seeding data: {e}")

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
                loan_detail = await self._with_retry(
                    lambda: self.ventures_client.get_loan_detail(ventures_id),
                    f"ventures.get_loan_detail[{ventures_id}]"
                )
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
                    self.log_event("success", f"Updated Loan {doc.id}: {current_status} -> {new_app_status}")
                else:
                    # Still refresh venturesStatus/lastSyncedAt for observability
                    apps_ref.document(doc.id).update({
                        "venturesStatus": ventures_status_name,
                        "lastSyncedAt": datetime.utcnow()
                    })
                    self.log_event("info", f"Checked Loan {doc.id}: no status change")
                    
        except Exception as e:
            print(f"Error syncing loan statuses: {e}")
            self.log_event("error", f"Sync loan statuses failed: {e}")

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
                conditions = await self._with_retry(
                    lambda: self.ventures_client.get_conditions(ventures_id),
                    f"ventures.get_conditions[{ventures_id}]"
                )
                
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
                        
                        # Never downgrade from completed -> open to avoid UI flicker while awaiting Ventures acceptance
                        if current_task_status == task_status or (current_task_status == "completed" and task_status == "open"):
                            continue

                        tasks_ref.document(task_doc.id).update({
                            "status": task_status,
                            "lastSyncedAt": datetime.utcnow()
                        })
                        self.log_event("success", f"Task {task_doc.id} -> {task_status} from Ventures")
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
                            "createdBy": "system_sync",
                            "lastSyncedAt": datetime.utcnow()
                        }
                        tasks_ref.add(new_task)
                        self.log_event("success", f"Created task for Loan {doc.id} from Ventures condition {cond_id}")

        except Exception as e:
            print(f"Error syncing tasks: {e}")
            self.log_event("error", f"Sync tasks failed: {e}")

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
                        self.log_event("success", f"Marked condition {cond_id} as Received in Ventures")

        except Exception as e:
            print(f"Error syncing uploads: {e}")
            self.log_event("error", f"Sync uploads failed: {e}")

    async def _update_pending_stats(self):
        """
        Refreshes pending stats for dashboard visibility.
        """
        try:
            tasks_ref = self.db.collection("tasks")
            pending = sum(1 for _ in tasks_ref.where("status", "==", "open").stream())
            self.stats["pending"] = pending
        except Exception as e:
            print(f"Error updating pending stats: {e}")

