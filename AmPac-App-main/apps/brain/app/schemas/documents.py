from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class ExtractConfigRequest(BaseModel):
    document_url: str = Field(..., description="URL of the document to process")
    document_type: str = Field(..., description="Type of document (tax_return, bank_statement, etc.)")
    pages: Optional[List[int]] = Field(None, description="Specific pages to process")

class ExtractionData(BaseModel):
    tax_year: Optional[int] = None
    adjusted_gross_income: Optional[float] = None
    wages: Optional[float] = None
    business_income: Optional[float] = None
    total_deposits: Optional[float] = None
    ending_balance: Optional[float] = None
    # Add more fields as needed for generic support
    raw_data: Dict[str, Any] = Field(default_factory=dict)

class ExtractionResponse(BaseModel):
    extraction_id: str
    status: str
    confidence: float
    data: ExtractionData
