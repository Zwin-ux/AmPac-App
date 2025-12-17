from app.core.firebase import get_db
from app.schemas.application import ApplicationCreate, ApplicationUpdate, ApplicationResponse
from app.core.constants import ApplicationStatus
from datetime import datetime
import uuid

class ApplicationService:
    def __init__(self):
        self.db = get_db()
        self.collection = self.db.collection('applications')

    async def create_application(self, user_id: str, data: ApplicationCreate) -> ApplicationResponse:
        app_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Default documents based on loan type
        default_docs = [
            {
                "id": "tax_returns",
                "name": "Tax Returns (Last 2 Years)",
                "description": "PDF upload - 10MB max",
                "status": "pending",
                "uploaded": False
            },
            {
                "id": "p_and_l",
                "name": "P&L Statement",
                "description": "Most recent 12 months",
                "status": "pending",
                "uploaded": False
            },
            {
                "id": "balance_sheet",
                "name": "Balance Sheet",
                "description": "Year-to-date",
                "status": "pending",
                "uploaded": False
            }
        ]

        app_dict = data.model_dump(exclude_none=True)
        app_dict.update({
            "id": app_id,
            "userId": user_id,
            "status": ApplicationStatus.DRAFT,
            "createdAt": now,
            "updatedAt": now,
            "lastUpdated": now,
            "lastSyncedAt": now,
            "currentStep": 1,
            "documents": default_docs,
            "eligibilitySummary": None,
            "venturesLoanId": app_dict.get("venturesLoanId"),
            "venturesStatus": app_dict.get("venturesStatus")
        })

        self.collection.document(app_id).set(app_dict)
        return ApplicationResponse(**app_dict)

    async def get_application(self, app_id: str) -> ApplicationResponse:
        doc = self.collection.document(app_id).get()
        if not doc.exists:
            return None
        return ApplicationResponse(**doc.to_dict())

    async def update_application(self, app_id: str, data: ApplicationUpdate) -> ApplicationResponse:
        doc_ref = self.collection.document(app_id)
        doc = doc_ref.get()
        if not doc.exists:
            return None

        update_data = data.model_dump(exclude_none=True)
        now = datetime.utcnow()
        update_data["updatedAt"] = now
        update_data["lastUpdated"] = now

        doc_ref.update(update_data)
        
        # Return updated document
        updated_doc = doc_ref.get()
        return ApplicationResponse(**updated_doc.to_dict())

    async def submit_application(self, app_id: str) -> ApplicationResponse:
        doc_ref = self.collection.document(app_id)
        doc = doc_ref.get()
        if not doc.exists:
            return None

        now = datetime.utcnow()
        update_data = {
            "status": ApplicationStatus.SUBMITTED,
            "submissionDate": now,
            "updatedAt": now,
            "lastUpdated": now
        }

        doc_ref.update(update_data)
        
        # TODO: Trigger notifications or workflows here
        
        updated_doc = doc_ref.get()
        return ApplicationResponse(**updated_doc.to_dict())

    async def list_user_applications(self, user_id: str) -> list[ApplicationResponse]:
        docs = self.collection.where("userId", "==", user_id).stream()
        apps = [ApplicationResponse(**doc.to_dict()) for doc in docs]
        # Return most recent first to match mobile expectations
        apps.sort(key=lambda a: a.createdAt, reverse=True)
        return apps

application_service = ApplicationService()
