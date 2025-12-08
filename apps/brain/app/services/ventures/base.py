from abc import ABC, abstractmethod
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

class VenturesLoan(BaseModel):
    id: str
    status_name: str
    balance: Optional[float] = 0.0
    officer_name: Optional[str] = None
    borrower_name: Optional[str] = None

class VenturesCondition(BaseModel):
    id: str
    description: str
    status: str  # "Open", "Waived", "Satisfied", "Received"
    category: str = "General"
    due_date: Optional[datetime] = None

class AbstractVenturesClient(ABC):
    
    @abstractmethod
    async def get_loan_detail(self, loan_id: str) -> Optional[VenturesLoan]:
        pass

    @abstractmethod
    async def get_all_loans(self) -> List[VenturesLoan]:
        pass

    @abstractmethod
    async def get_conditions(self, loan_id: str) -> List[VenturesCondition]:
        pass

    @abstractmethod
    async def update_condition_status(self, condition_id: str, status: str, note: Optional[str] = None) -> bool:
        pass

    @abstractmethod
    async def create_loan(self, loan_data: dict) -> VenturesLoan:
        pass

    @abstractmethod
    async def upload_document(self, loan_id: str, condition_id: str, file_url: str) -> bool:
        pass
