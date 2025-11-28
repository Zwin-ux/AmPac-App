import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize FastAPI
app = FastAPI(
    title="AmPac Brain 🧠",
    description="AI Microservice for Document Processing and Underwriting Automation",
    version="0.1.0"
)

# CORS (Allow requests from Console and Mobile)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firebase Admin (Mock for now, needs service account)
# cred = credentials.Certificate("path/to/serviceAccountKey.json")
# firebase_admin.initialize_app(cred)
# db = firestore.client()

class DocumentAnalysisRequest(BaseModel):
    document_url: str
    document_type: str # e.g., 'tax_return', 'bank_statement'
    application_id: str

class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None

@app.get("/")
async def root():
    return {"status": "online", "service": "AmPac Brain 🧠"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/analyze-document")
async def analyze_document(request: DocumentAnalysisRequest):
    """
    Placeholder for Intelligent Document Processing (IDP)
    """
    return {
        "status": "processing",
        "message": f"Started analysis for {request.document_type}",
        "task_id": "mock-task-id-123"
    }

@app.post("/chat/staff")
async def staff_chat(request: ChatRequest):
    """
    Placeholder for Staff Copilot
    """
    return {
        "response": "I am the AmPac Staff Copilot. I can help you analyze risk, look up policies, or draft emails. (AI integration coming soon!)"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
