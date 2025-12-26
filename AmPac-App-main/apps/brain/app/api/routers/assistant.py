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
    Context-aware assistant chat using Groq API.
    """
    # 1. Build System Prompt based on Context
    system_prompt = """You are the AmPac Smart Assistant, a helpful AI for small business owners and entrepreneurs.

IMPORTANT INSTRUCTIONS:
- If the user expresses intent to "apply for a loan", "start an application", or "get financing", include this action tag at the end: <<<ACTION:{"type":"navigate","target":"Apply"}>>>
- Keep responses concise, professional, and helpful
- Focus on SBA loans, business financing, and AmPac services
- Do not hallucinate specific loan terms or rates"""
    
    if request.context == 'application':
        system_prompt += "\n\nCONTEXT: The user is currently filling out a loan application. Help them understand SBA 504 vs 7(a) loans, required documents, and eligibility. Be encouraging and specific about next steps."
    elif request.context == 'spaces':
        system_prompt += "\n\nCONTEXT: The user is looking at co-working spaces. Explain that AmPac offers flexible workspace solutions with hourly booking and member discounts."
    elif request.context == 'network':
        system_prompt += "\n\nCONTEXT: The user is in the business network section. Encourage them to connect with local entrepreneurs and explain networking benefits."
    else:
        system_prompt += "\n\nCONTEXT: Answer general questions about AmPac Business Capital, a CDC that helps small businesses access SBA financing and grow."

    # 2. Call LLM with system prompt
    response_text = await llm_service.generate_response(request.query, system_prompt)
    
    return AssistantResponse(response=response_text)
