import uuid
import asyncio
from app.schemas.documents import ExtractionResponse, ExtractionData

class DocumentService:
    async def extract(self, doc_type: str, url: str) -> ExtractionResponse:
        # Simulate processing time
        await asyncio.sleep(2)
        
        extraction_id = f"ext_{uuid.uuid4().hex[:8]}"
        
        if "tax" in doc_type.lower() or "1040" in doc_type:
            return ExtractionResponse(
                extraction_id=extraction_id,
                status="completed",
                confidence=0.98,
                data=ExtractionData(
                    tax_year=2023,
                    adjusted_gross_income=150000.0,
                    wages=120000.0,
                    business_income=30000.0,
                    raw_data={"form": "1040", "filer": "John Doe"}
                )
            )
        else:
            return ExtractionResponse(
                extraction_id=extraction_id,
                status="completed",
                confidence=0.95,
                data=ExtractionData(
                    total_deposits=45000.0,
                    ending_balance=12500.0,
                    raw_data={"bank": "Chase", "period": "Oct 2023"}
                )
            )

document_service = DocumentService()
