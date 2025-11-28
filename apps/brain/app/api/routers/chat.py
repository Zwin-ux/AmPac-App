from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.llm_service import llm_service

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

@router.post("/borrower", response_model=ChatResponse)
async def chat_borrower(request: ChatRequest):
    """
    Basic chat endpoint for borrowers.
    """
    response = await llm_service.generate_response(request.message)
    return ChatResponse(response=response)
