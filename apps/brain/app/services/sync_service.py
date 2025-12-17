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
from app.services.sync_event_store import record_event
from app.services.circuit_breaker import get_breaker
from app.services.sync_health_store import write_sync_heartbeat

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
        self.settings = settings

        self.breaker_ventures = get_breaker("ventures")
        self.breaker_sharefile = get_breaker("sharefile")

        if not settings.VENTURES_ENABLED or settings.VENTURES_MOCK_MODE:
            print("SyncService: Using MockVenturesClient")
            self.ventures_client: AbstractVenturesClient = MockVenturesClient()
            self.ventures_enabled = settings.VENTURES_ENABLED
        else:
            # self.ventures_client = RealVenturesClient()
            print("SyncService: Real client not implemented, falling back to Mock")
            self.ventures_client = MockVenturesClient()
            self.ventures_enabled = True
            
        self.sharefile_client = ShareFileClient()
        self.db = get_db()
        
        # Stats and Logs
        self.recent_logs = []
        self.stats = {"synced": 0, "pending": 0, "errors": 0}
        self.last_loop_at: datetime | None = None
        self.last_error: str | None = None

    async def _with_retry(self, func: Callable[[], Any], label: str, retries: int = 3, base_delay: float = 1.0, breaker=None):
        """
        Simple exponential backoff wrapper for flaky operations with optional circuit breaker.
        """
        if breaker and not breaker.allow_request():
            self.log_event("info", f"{label} skipped: breaker open")
            return None

        last_exc = None
        for attempt in range(retries):
            try:
                result = await func()
                if breaker:
                    breaker.record_success()
                return result
            except Exception as e:
                last_exc = e
                if attempt == retries - 1:
                    break
                delay = base_delay * (2 ** attempt)
                self.log_event("info", f"{label} retry {attempt+1}/{retries}: {e}")
                await asyncio.sleep(delay)
        if breaker:
            breaker.record_failure(str(last_exc) if last_exc else label)
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
            self.last_error = message
        elif status == "success":
            self.stats["synced"] += 1

    def get_sync_stats(self):
        return {
            "syncedCount": self.stats["synced"],
            "pendingCount": self.stats["pending"], # Could be calculated from DB
            "errorCount": self.stats["errors"]
        }

    def _record_sync_event(self, event_type: str, status: str, message: str, meta: dict | None = None):
        """
        Persist a sync event for observability/DLQ.
        """
        try:
            payload = {
                "type": event_type,
                "status": status,
                "message": message,
                "source": "brain",
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }
            if meta:
                payload.update(meta)
            record_event(payload)
        except Exception as e:
            print(f"Failed to record sync event: {e}")

    def get_health_snapshot(self):
        return {
            "lastLoopAt": self.last_loop_at.isoformat() if self.last_loop_at else None,
            "lastError": self.last_error,
            "stats": self.get_sync_stats(),
            "recentLogs": self.get_recent_logs()
        }

    def get_recent_logs(self, limit: int = 10):
        return self.recent_logs[:limit]

    def _persist_heartbeat(self):
        write_sync_heartbeat({
            "lastLoopAt": self.last_loop_at,
            "lastError": self.last_error,
            "stats": self.get_sync_stats(),
            "recentLogs": self.get_recent_logs(limit=10),
        })

    async def start_sync_loop(self):
        """
        Starts the background synchronization loop.
        """
        print("Starting Sync Service Loop...")
        self._persist_heartbeat()
        
        # Initial Seed for Demo Purposes
        await self.seed_initial_data()
        self._persist_heartbeat()

        while True:
            try:
                await self.sync_applications_upstream()
                await self.sync_loan_statuses()
                await self.sync_tasks()
                await self.sync_uploads_to_ventures()
                await self._update_pending_stats()
                self.last_error = None
                self.last_loop_at = datetime.utcnow()
                self._persist_heartbeat()
            except Exception as e:
                print(f"Error in sync loop: {e}")
                self.log_event("error", str(e))
                self.last_error = str(e)
                self._persist_heartbeat()
            
            # Sleep for a defined interval (e.g., 10 seconds for demo responsiveness)
            await asyncio.sleep(10) 

    async def seed_initial_data(self):
        """
        Seeds Firestore with mock data from Ventures if it doesn't exist.
        This ensures the Console has data to display immediately.
        """
        if not self.ventures_enabled:
            self.log_event("info", "Ventures disabled; skip seeding.")
            return
        try:
            print("Checking if seeding is needed...")
            loans = await self._with_retry(
                self.ventures_client.get_all_loans,
                "ventures.get_all_loans",
                breaker=self.breaker_ventures
            )
            if loans is None:
                return
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

    async def sync_applications_upstream(self):
        """
        Pushes new 'submitted' applications from Firestore to Ventures (Upstream).
        """
        if not self.ventures_enabled:
            self.log_event("info", "Ventures disabled; skip upstream sync.")
            return
        try:
            apps_ref = self.db.collection("applications")
            # Find apps that are 'submitted' but have no venturesLoanId yet
            # Note: Firestore doesn't support "where field is missing", so we check empty string or manually filter if needed.
            # Assuming our app creation logic sets venturesLoanId="" initially.
            docs = apps_ref.where("status", "==", ApplicationStatus.SUBMITTED).where("venturesLoanId", "==", "").stream()

            for doc in docs:
                app_data = doc.to_dict()
                print(f"Syncing Application Upstream: {doc.id}")
                
                # 1. Create in Ventures
                try:
                    new_loan = await self._with_retry(
                        lambda: self.ventures_client.create_loan(app_data),
                        f"ventures.create_loan[{doc.id}]",
                        breaker=self.breaker_ventures
                    )
                    if not new_loan:
                        err_msg = f"Create loan skipped or failed for {doc.id}"
                        self.log_event("error", err_msg)
                        self._record_sync_event("app_status", "dead_letter", err_msg, {
                            "loanApplicationId": doc.id
                        })
                        continue
                    
                    # 2. Update Firestore with new ID and move to Underwriting
                    apps_ref.document(doc.id).update({
                        "venturesLoanId": new_loan.id,
                        "status": "underwriting", # Instant intake
                        "venturesStatus": new_loan.status_name,
                        "lastSyncedAt": datetime.utcnow()
                    })
                    msg = f"Created Ventures Loan {new_loan.id} for App {doc.id}"
                    self.log_event("success", msg)
                    self._record_sync_event("app_status", "success", msg, {
                        "loanApplicationId": doc.id,
                        "venturesLoanId": new_loan.id
                    })
                except Exception as e:
                    print(f"Failed to create loan in Ventures: {e}")
                    err_msg = f"Upstream sync failed for {doc.id}: {e}"
                    self.log_event("error", err_msg)
                    self._record_sync_event("app_status", "dead_letter", err_msg, {
                        "loanApplicationId": doc.id
                    })

        except Exception as e:
            print(f"Error syncing applications upstream: {e}")
            err_msg = f"Sync applications upstream failed: {e}"
            self.log_event("error", err_msg)
            self._record_sync_event("app_status", "dead_letter", err_msg)

    async def sync_loan_statuses(self):
        """
        Queries active applications in Firestore and updates status from Ventures.
        """
        if not self.ventures_enabled:
            self.log_event("info", "Ventures disabled; skip status sync.")
            return
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
                    f"ventures.get_loan_detail[{ventures_id}]",
                    breaker=self.breaker_ventures
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
                    msg = f"Updated Loan {doc.id}: {current_status} -> {new_app_status}"
                    self.log_event("success", msg)
                    self._record_sync_event("app_status", "success", msg, {
                        "loanApplicationId": doc.id,
                        "venturesLoanId": ventures_id
                    })
                else:
                    # Still refresh venturesStatus/lastSyncedAt for observability
                    apps_ref.document(doc.id).update({
                        "venturesStatus": ventures_status_name,
                        "lastSyncedAt": datetime.utcnow()
                    })
                    self.log_event("info", f"Checked Loan {doc.id}: no status change")
                    
        except Exception as e:
            print(f"Error syncing loan statuses: {e}")
            err_msg = f"Sync loan statuses failed: {e}"
            self.log_event("error", err_msg)
            self._record_sync_event("app_status", "dead_letter", err_msg)

    async def sync_tasks(self):
        """
        Syncs underwriting conditions from Ventures to Firestore Tasks.
        """
        if not self.ventures_enabled:
            self.log_event("info", "Ventures disabled; skip task sync.")
            return
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
                    f"ventures.get_conditions[{ventures_id}]",
                    breaker=self.breaker_ventures
                )
                if not conditions:
                    continue
                
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
                        msg = f"Task {task_doc.id} -> {task_status} from Ventures"
                        self.log_event("success", msg)
                        self._record_sync_event("task_status", "success", msg, {
                            "taskId": task_doc.id,
                            "venturesConditionId": cond_id,
                            "loanApplicationId": doc.id
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
                            "createdBy": "system_sync",
                            "lastSyncedAt": datetime.utcnow()
                        }
                        tasks_ref.add(new_task)
                        msg = f"Created task for Loan {doc.id} from Ventures condition {cond_id}"
                        self.log_event("success", msg)
                        self._record_sync_event("task_status", "success", msg, {
                            "venturesConditionId": cond_id,
                            "loanApplicationId": doc.id
                        })

        except Exception as e:
            print(f"Error syncing tasks: {e}")
            err_msg = f"Sync tasks failed: {e}"
            self.log_event("error", err_msg)
            self._record_sync_event("task_status", "dead_letter", err_msg)

    async def sync_uploads_to_ventures(self):
        """
        Checks for tasks that are 'completed' in Firestore (uploaded) but 'Open' in Ventures.
        Updates Ventures status to 'Received'.
        """
        if not self.ventures_enabled:
            self.log_event("info", "Ventures disabled; skip upload sync.")
            return
        try:
            # Find tasks that are completed but have a venturesConditionId
            tasks_ref = self.db.collection("tasks")
            
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
                        
                    # Check current status in Ventures
                    conditions = await self._with_retry(
                        lambda: self.ventures_client.get_conditions(ventures_id),
                        f"ventures.get_conditions[{ventures_id}]",
                        breaker=self.breaker_ventures
                    )
                    matching_cond = next((c for c in conditions if c.id == cond_id), None)
                    
                    if matching_cond and matching_cond.status == "Open":
                        print(f"Pushing Upload Status to Ventures: {cond_id} -> Received")
                        # Use the specific upload_document semantic method
                        file_url = task_data.get("fileUrl", "unknown_url") # Expect fileUrl in task
                        await self._with_retry(
                            lambda: self.ventures_client.upload_document(ventures_id, cond_id, file_url),
                            f"ventures.upload_document[{ventures_id}:{cond_id}]",
                            breaker=self.breaker_sharefile
                        )
                        msg = f"Marked condition {cond_id} as Received in Ventures"
                        self.log_event("success", msg)
                        self._record_sync_event("upload", "success", msg, {
                            "venturesConditionId": cond_id,
                            "loanApplicationId": app_doc.id
                        })

        except Exception as e:
            print(f"Error syncing uploads: {e}")
            err_msg = f"Sync uploads failed: {e}"
            self.log_event("error", err_msg)
            self._record_sync_event("upload", "dead_letter", err_msg)

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
