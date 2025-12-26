from fastapi import APIRouter, HTTPException, Depends
from app.schemas.knowledge import KnowledgeQueryRequest, KnowledgeResponse
from app.services.knowledge_service import knowledge_service
from app.core.firebase_auth import AuthContext, get_current_user

router = APIRouter()

@router.post("/query", response_model=KnowledgeResponse)
async def query_knowledge(request: KnowledgeQueryRequest, user: AuthContext = Depends(get_current_user)):
    try:
        return await knowledge_service.query(request.query, request.filters)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
