import asyncio
from app.schemas.knowledge import KnowledgeResponse, Citation

class KnowledgeService:
    async def query(self, query_text: str, filters: list = None) -> KnowledgeResponse:
        # Simulate RAG latency
        await asyncio.sleep(1.5)
        
        if "dscr" in query_text.lower():
            return KnowledgeResponse(
                answer="The minimum **DSCR** for a gas station is generally **1.25x**. However, for SBA 504 loans, a global cash flow analysis is required.",
                citations=[
                    Citation(
                        source="SBA SOP 50 10 7",
                        section="Chapter 3, Pg 145",
                        text="Debt Service Coverage Ratio (DSCR) must be...",
                        relevance=0.95
                    ),
                    Citation(
                        source="AmPac Credit Policy",
                        section="Section 4.2",
                        text="Gas stations require 1.25x coverage.",
                        relevance=0.92
                    )
                ]
            )
        
        return KnowledgeResponse(
            answer="I found some information related to your query in our internal knowledge base, but it might not be specific.",
            citations=[
                Citation(
                    source="General Policy",
                    section="Intro",
                    text="AmPac aims to support small businesses...",
                    relevance=0.5
                )
            ]
        )

knowledge_service = KnowledgeService()
