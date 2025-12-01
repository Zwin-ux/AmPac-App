from typing import List, Optional, Dict
from datetime import datetime
from .base import AbstractVenturesClient, VenturesLoan, VenturesCondition

class MockVenturesClient(AbstractVenturesClient):
    """
    In-memory mock client for Ventures LOS.
    Simulates loan states and condition updates.
    """
    
    def __init__(self):
        self._loans: Dict[str, VenturesLoan] = {
            "1001": VenturesLoan(
                id="1001", 
                status_name="Underwriting", 
                balance=500000.0, 
                officer_name="Sarah Smith",
                borrower_name="Acme Corp"
            ),
            "1002": VenturesLoan(
                id="1002", 
                status_name="Approved", 
                balance=1200000.0, 
                officer_name="John Doe",
                borrower_name="Beta LLC"
            ),
            "1003": VenturesLoan(
                id="1003", 
                status_name="Closing", 
                balance=75000.0, 
                officer_name="Sarah Smith",
                borrower_name="Gamma Inc"
            )
        }
        
        self._conditions: Dict[str, List[VenturesCondition]] = {
            "1001": [
                VenturesCondition(id="c1", description="2023 Tax Returns", status="Open", category="Financials"),
                VenturesCondition(id="c2", description="Business License", status="Open", category="Legal"),
                VenturesCondition(id="c3", description="Personal Financial Statement", status="Satisfied", category="Financials"),
            ],
            "1002": [
                VenturesCondition(id="c4", description="Insurance Proof", status="Satisfied", category="Insurance"),
            ],
            "1003": [
                VenturesCondition(id="c5", description="Signed Closing Docs", status="Open", category="Closing"),
            ]
        }

    async def get_loan_detail(self, loan_id: str) -> Optional[VenturesLoan]:
        return self._loans.get(loan_id)

    async def get_conditions(self, loan_id: str) -> List[VenturesCondition]:
        return self._conditions.get(loan_id, [])

    async def update_condition_status(self, condition_id: str, status: str, note: Optional[str] = None) -> bool:
        # Find the condition across all loans
        for loan_id, conditions in self._conditions.items():
            for condition in conditions:
                if condition.id == condition_id:
                    print(f"[MockVentures] Updating condition {condition_id} to {status}")
                    condition.status = status
                    return True
        return False
