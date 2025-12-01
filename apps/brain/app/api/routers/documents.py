from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from app.schemas.documents import ExtractConfigRequest, ExtractionResponse
from app.services.document_service import document_service
from app.services.sharefile_client import ShareFileClient
from app.core.firebase import get_db
from datetime import datetime

router = APIRouter()
sharefile_client = ShareFileClient()

@router.post("/extract", response_model=ExtractionResponse)
async def extract_document(request: ExtractConfigRequest):
    try:
        return await document_service.extract(request.document_type, request.document_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    taskId: str = Form(...)
):
    """
    Uploads a document for a specific task.
    1. Uploads to ShareFile.
    2. Updates Firestore Task status.
    """
    try:
        db = get_db()
        
        # 1. Get Task
        task_ref = db.collection("tasks").document(taskId)
        task_doc = task_ref.get()
        if not task_doc.exists:
            raise HTTPException(status_code=404, detail="Task not found")
        
        task_data = task_doc.to_dict()
        loan_id = task_data.get("loanApplicationId")
        
        # 2. Get Application (for folder naming)
        app_ref = db.collection("applications").document(loan_id)
        app_doc = app_ref.get()
        if not app_doc.exists:
            raise HTTPException(status_code=404, detail="Application not found")
            
        app_data = app_doc.to_dict()
        # Use business name or ID for folder
        borrower_name = app_data.get("businessName", "Unknown_Borrower")
        # Sanitize name
        borrower_name = "".join(c for c in borrower_name if c.isalnum() or c in (' ', '_', '-')).strip()
        
        # 3. Read file content
        content = await file.read()
        
        # 4. Upload to ShareFile
        folder_id = await sharefile_client.ensure_folder_structure(borrower_name, loan_id)
        sharefile_id = await sharefile_client.upload_file(content, file.filename, folder_id)
        
        # 5. Update Task
        task_ref.update({
            "status": "completed", # Or 'in_review'
            "uploadedFileId": sharefile_id,
            "uploadedAt": datetime.utcnow(),
            "fileName": file.filename
        })
        
        return {"status": "success", "fileId": sharefile_id}
        
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

