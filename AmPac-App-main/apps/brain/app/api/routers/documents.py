from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends
from pydantic import BaseModel
from typing import Optional
import uuid
from app.services.document_analysis import document_analysis_agent
from app.core.firebase_auth import AuthContext, get_current_user

router = APIRouter()

class DocumentAnalysisRequest(BaseModel):
    documentId: str
    fileName: str
    content: Optional[str] = None

@router.post("/analyze")
async def analyze_document(
    request: DocumentAnalysisRequest,
    background_tasks: BackgroundTasks,
    user: AuthContext = Depends(get_current_user),
):
    """
    Triggers background analysis of a document.
    """
    background_tasks.add_task(document_analysis_agent.analyze_document, request.documentId, request.fileName, request.content)
    return {"status": "processing", "message": "Document analysis started"}

@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user: AuthContext = Depends(get_current_user),
):
    """
    Uploads a document and triggers analysis.
    For MVP, we generate a mock ID and trigger analysis immediately.
    """
    doc_id = str(uuid.uuid4())
    print(f"Received upload: {file.filename} ({file.content_type})")
    
    # Trigger analysis
    if background_tasks:
        background_tasks.add_task(document_analysis_agent.analyze_document, doc_id, file.filename)
    
    return {
        "documentId": doc_id,
        "fileName": file.filename,
        "status": "processing",
        "message": "Upload successful, analysis started"
    }
