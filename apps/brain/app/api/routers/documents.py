from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import uuid
from app.services.document_analysis import document_analysis_agent

router = APIRouter()

class DocumentAnalysisRequest(BaseModel):
    documentId: str
    fileName: str
    content: Optional[str] = None

@router.post("/analyze")
async def analyze_document(request: DocumentAnalysisRequest, background_tasks: BackgroundTasks):
    """
    Triggers background analysis of a document.
    """
    background_tasks.add_task(document_analysis_agent.analyze_document, request.documentId, request.fileName, request.content)
    return {"status": "processing", "message": "Document analysis started"}

@router.post("/upload")
async def upload_document(file: UploadFile = File(...), background_tasks: BackgroundTasks = None):
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
