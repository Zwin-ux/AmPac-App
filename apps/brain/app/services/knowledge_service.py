from typing import List, Dict, Any, Optional
import re

class KnowledgeService:
    def __init__(self):
        # High-Fidelity Knowledge Base (Simulating Vector DB)
        self.knowledge_base = [
            {
                "id": "pol_001",
                "source": "SBA SOP 50 10 7",
                "section": "Chapter 3, Pg 145",
                "text": "Debt Service Coverage Ratio (DSCR) must be at least 1.15x for standard 7(a) loans, but AmPac internal policy requires 1.25x for all hospitality deals.",
                "keywords": ["dscr", "debt service", "coverage", "ratio", "1.15", "1.25", "hospitality", "hotel"]
            },
            {
                "id": "pol_002",
                "source": "AmPac Credit Policy v2024",
                "section": "Section 4.2 - LTV Limits",
                "text": "Maximum Loan-to-Value (LTV) for Gas Stations is capped at 75% including goodwill. For multi-purpose properties, LTV can go up to 85%.",
                "keywords": ["ltv", "loan to value", "gas station", "75%", "85%", "goodwill"]
            },
            {
                "id": "pol_003",
                "source": "SBA 504 Program Guide",
                "section": "Occupancy Requirements",
                "text": "For new construction, the borrower must occupy at least 60% of the rentable property area immediately, with plans to occupy some of the additional space within 3 years and 80% within 10 years.",
                "keywords": ["occupancy", "504", "construction", "60%", "80%", "rentable"]
            },
            {
                "id": "pol_004",
                "source": "AmPac Risk Framework",
                "section": "Appendix B - Prohibited Industries",
                "text": "AmPac does not lend to businesses involved in speculative activities, gambling, or adult entertainment. Cannabis-related businesses are currently under review but generally prohibited.",
                "keywords": ["prohibited", "gambling", "adult", "cannabis", "speculative", "restricted"]
            },
            {
                "id": "pol_005",
                "source": "Underwriting Guidelines",
                "section": "Global Cash Flow",
                "text": "Global Cash Flow analysis must include all guarantor income and debt obligations. A minimum Global DSCR of 1.10x is required across all related entities.",
                "keywords": ["global", "cash flow", "guarantor", "1.10", "dscr"]
            }
        ]

    async def query(self, query_text: str, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Performs a keyword-weighted search over the knowledge base.
        """
        print(f"[KnowledgeService] Querying: {query_text}")
        
        # 1. Tokenize Query
        query_words = set(re.findall(r'\w+', query_text.lower()))
        
        # 2. Score Documents
        scored_docs = []
        for doc in self.knowledge_base:
            score = 0
            # Keyword match
            for keyword in doc["keywords"]:
                if keyword in query_text.lower():
                    score += 3  # High weight for exact keyword match
                
                # Partial match in query words
                for qw in query_words:
                    if qw in keyword:
                        score += 1
            
            # Text overlap
            for qw in query_words:
                if qw in doc["text"].lower():
                    score += 0.5
            
            if score > 0:
                scored_docs.append({**doc, "score": score})
        
        # 3. Sort and Filter
        scored_docs.sort(key=lambda x: x["score"], reverse=True)
        top_docs = scored_docs[:3]
        
        # 4. Generate "Answer" (Mock LLM Synthesis)
        if not top_docs:
            return {
                "answer": "I couldn't find any specific policies matching your query in the AmPac knowledge base.",
                "citations": []
            }
        
        # Construct a synthetic answer based on the top result
        best_doc = top_docs[0]
        answer = f"According to {best_doc['source']}, {best_doc['text']}"
        
        return {
            "answer": answer,
            "citations": [
                {
                    "source": doc["source"],
                    "section": doc["section"],
                    "text": doc["text"],
                    "relevance": f"{doc['score']:.1f}"
                } for doc in top_docs
            ]
        }

knowledge_service = KnowledgeService()
