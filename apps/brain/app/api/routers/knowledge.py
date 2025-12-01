from fastapi import APIRouter, HTTPException
from app.schemas.knowledge import KnowledgeQueryRequest, KnowledgeResponse
from app.services.knowledge_service import knowledge_service

router = APIRouter()

@router.post("/query", response_model=KnowledgeResponse)
async def query_knowledge(request: KnowledgeQueryRequest):
    try:
        return await knowledge_service.query(request.query, request.filters)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
