from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.core.firebase_auth import AuthContext, get_current_user
from app.services.llm_service import llm_service

router = APIRouter()

class AssistantRequest(BaseModel):
    context: str # e.g., 'application', 'home', 'spaces'
    query: str

class AssistantResponse(BaseModel):
    response: str

@router.post("/chat", response_model=AssistantResponse)
async def chat_assistant(request: AssistantRequest, user: AuthContext = Depends(get_current_user)):
    """
    Context-aware assistant chat.
    """
    # 1. Build System Prompt based on Context
    system_prompt = "You are the AmPac Smart Assistant, a helpful AI for small business owners."
    
    if request.context == 'application':
        system_prompt += "\nThe user is currently filling out a loan application. Help them understand SBA 504 vs 7(a) loans, required documents, and eligibility. Be concise and encouraging."
    elif request.context == 'spaces':
        system_prompt += "\nThe user is looking at co-working spaces. Explain that they can book by the hour and members get discounts."
    elif request.context == 'network':
        system_prompt += "\nThe user is in the business network section. Encourage them to connect with local peers."
    else:
        system_prompt += "\nAnswer general questions about AmPac Business Capital, a CDC that helps small businesses grow."

    # 2. Construct Full Prompt
    full_prompt = f"{system_prompt}\n\nUser: {request.query}\nAssistant:"
    
    # 3. Call LLM
    response_text = await llm_service.generate_response(full_prompt)
    
    return AssistantResponse(response=response_text)
