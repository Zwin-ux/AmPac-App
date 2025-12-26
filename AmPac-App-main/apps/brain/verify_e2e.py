import asyncio
import uuid
import os
import sys

# Set Credentials Path
os.environ["FIREBASE_CREDENTIALS_PATH"] = r"c:\Users\mzwin\AmPac\apps\brain\serviceAccountKey.json"

# Ensure we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime
from app.core.firebase import get_db
from app.services.sync_service import SyncService
from app.services.ventures.mock import MockVenturesClient

async def verify_e2e_flow():
    print("--- Starting End-to-End Verification ---")
    
    # 1. Setup
    db = get_db()
    sync_service = SyncService()
    test_id = str(uuid.uuid4())[:8]
    app_id = f"test_app_{test_id}"
    
    print(f"Test App ID: {app_id}")

    # 2. Simulate Mobile Application Submission
    # Create doc in Firestore
    app_ref = db.collection("applications").document(app_id)
    app_data = {
        "userId": "test_user",
        "status": "submitted", # Trigger for upstream sync
        "venturesLoanId": "",
        "businessName": f"Test Business {test_id}",
        "amount": 100000,
        "createdAt": datetime.utcnow()
    }
    app_ref.set(app_data)
    print(f"✅ Created Firestore App: {app_id} (Status: submitted)")

    # 3. Trigger Upstream Sync (Mobile -> Ventures)
    print("Running sync_applications_upstream()...")
    await sync_service.sync_applications_upstream()
    
    # 4. Verify Sync Result
    updated_doc = app_ref.get().to_dict()
    ventures_id = updated_doc.get("venturesLoanId")
    
    if not ventures_id:
        print("❌ Failed: venturesLoanId not populated in Firestore")
        return
    
    print(f"✅ Upstream Sync Success: Ventures ID is {ventures_id}")
    print(f"✅ App Status: {updated_doc.get('status')} (Expected: underwriting)")

    # Check Ventures Mock State (via new client instance which loads from disk)
    v_client = MockVenturesClient()
    loan = await v_client.get_loan_detail(ventures_id)
    if loan:
        print(f"✅ Found Loan in Ventures: {loan.borrower_name} ({loan.status_name})")
    else:
        print("❌ Failed: Loan not found in Ventures Mock")
        return

    # 5. Simulate Task Sync (Ventures -> Firestore)
    print("Running sync_tasks()...")
    await sync_service.sync_tasks()
    
    tasks_ref = db.collection("tasks")
    tasks = list(tasks_ref.where("loanApplicationId", "==", app_id).stream())
    
    if len(tasks) > 0:
        print(f"✅ Tasks synced from Ventures: {len(tasks)} found")
        for t in tasks:
            print(f"   - {t.to_dict().get('description')}")
    else:
        print("❌ Failed: No tasks synced (Ventures should have default conditions)")
        return

    # 6. Simulate Document Upload (Mobile -> Ventures)
    task_doc = tasks[0]
    task_id = task_doc.id
    ventures_cond_id = task_doc.to_dict().get("venturesConditionId")
    
    print(f"Simulating upload for Task {task_id} (Condition {ventures_cond_id})")
    
    tasks_ref.document(task_id).update({
        "status": "completed",
        "fileUrl": "gs://bucket/fake_file.pdf",
        "updatedAt": datetime.utcnow()
    })
    
    print("Running sync_uploads_to_ventures()...")
    await sync_service.sync_uploads_to_ventures()
    
    # 7. Verify Condition Updated in Ventures
    # Refresh Ventures Client state
    v_client = MockVenturesClient() 
    conditions = await v_client.get_conditions(ventures_id)
    target_cond = next((c for c in conditions if c.id == ventures_cond_id), None)
    
    if target_cond and target_cond.status == "Received":
        print(f"✅ Condition Status in Ventures: {target_cond.status}")
    else:
        print(f"❌ Failed: Condition status is {target_cond.status if target_cond else 'None'}")
        
    print("\n--- E2E Verification Complete ---")

if __name__ == "__main__":
    asyncio.run(verify_e2e_flow())
