from pydantic import BaseModel, Field
from typing import List, Optional

class KnowledgeFilters(BaseModel):
    source: Optional[List[str]] = None
    tags: Optional[List[str]] = None

class KnowledgeQueryRequest(BaseModel):
    query: str = Field(..., description="Natural language query")
    filters: Optional[KnowledgeFilters] = None

class Citation(BaseModel):
    source: str
    section: Optional[str] = None
    text: str
    relevance: float

class KnowledgeResponse(BaseModel):
    answer: str
    citations: List[Citation]
