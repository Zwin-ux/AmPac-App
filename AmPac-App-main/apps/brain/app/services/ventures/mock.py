from typing import List, Optional, Dict
from datetime import datetime
import json
from pathlib import Path
from .base import AbstractVenturesClient, VenturesLoan, VenturesCondition

class MockVenturesClient(AbstractVenturesClient):
    """
    In-memory mock client for Ventures LOS.
    Simulates loan states and condition updates.
    """
    
    def __init__(self):
        # Persist mock state so demo actions "stick" across restarts
        self._state_path = Path(__file__).resolve().parents[3] / "data" / "ventures_mock_state.json"
        self._loans, self._conditions = self._load_state()

    async def get_loan_detail(self, loan_id: str) -> Optional[VenturesLoan]:
        return self._loans.get(loan_id)

    async def get_all_loans(self) -> List[VenturesLoan]:
        return list(self._loans.values())

    async def get_conditions(self, loan_id: str) -> List[VenturesCondition]:
        return self._conditions.get(loan_id, [])

    async def update_condition_status(self, condition_id: str, status: str, note: Optional[str] = None) -> bool:
        # Find the condition across all loans
        for loan_id, conditions in self._conditions.items():
            for condition in conditions:
                if condition.id == condition_id:
                    print(f"[MockVentures] Updating condition {condition_id} to {status}")
                    condition.status = status
                    self._persist_state()
                    return True
        return False

    async def create_loan(self, loan_data: dict) -> VenturesLoan:
        import random
        # Generate new ID
        new_id = f"V-{random.randint(1000, 9999)}"
        
        # Create Loan Object
        new_loan = VenturesLoan(
            id=new_id,
            status_name="Underwriting", # Default new status
            balance=float(loan_data.get("amount", 0.0)),
            officer_name="Unassigned",
            borrower_name=loan_data.get("businessName", "New Borrower")
        )
        
        # Add to state
        self._loans[new_id] = new_loan
        
        # Add default conditions
        self._conditions[new_id] = [
            VenturesCondition(id=f"c-{random.randint(10000, 99999)}", description="2023 Tax Returns", status="Open", category="Financials"),
            VenturesCondition(id=f"c-{random.randint(10000, 99999)}", description="Articles of Incorporation", status="Open", category="Legal"),
        ]
        
        self._persist_state()
        print(f"[MockVentures] Created Loan {new_id} for {new_loan.borrower_name}")
        return new_loan

    async def upload_document(self, loan_id: str, condition_id: str, file_url: str) -> bool:
        """
        Simulates uploading a document by marking the condition as Received.
        """
        print(f"[MockVentures] Uploading document to {loan_id}/{condition_id}: {file_url}")
        return await self.update_condition_status(condition_id, "Received", note=f"File uploaded: {file_url}")

    # --- Persistence helpers ---

    def _default_loans(self) -> Dict[str, VenturesLoan]:
        return {
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

    def _default_conditions(self) -> Dict[str, List[VenturesCondition]]:
        return {
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

    def _load_state(self):
        """
        Load persisted mock state; fallback to defaults.
        """
        try:
            if self._state_path.exists():
                with open(self._state_path, "r", encoding="utf-8") as f:
                    data = json.load(f)

                loans = {
                    item["id"]: VenturesLoan(**item)
                    for item in data.get("loans", [])
                }
                conditions = {
                    loan_id: [VenturesCondition(**cond) for cond in conds]
                    for loan_id, conds in data.get("conditions", {}).items()
                }

                # Ensure minimal integrity
                if loans:
                    return loans, conditions
        except Exception as e:
            print(f"[MockVentures] Failed to load state, using defaults: {e}")

        # Fallback defaults and persist for next boot
        loans = self._default_loans()
        conditions = self._default_conditions()
        self._persist_state(loans, conditions)
        return loans, conditions

    def _persist_state(self, loans: Optional[Dict[str, VenturesLoan]] = None, conditions: Optional[Dict[str, List[VenturesCondition]]] = None):
        """
        Persist current mock state to disk so demo actions survive restarts.
        """
        loans_to_store = loans or self._loans
        conditions_to_store = conditions or self._conditions

        payload = {
            "loans": [loan.model_dump() for loan in loans_to_store.values()],
            "conditions": {
                loan_id: [cond.model_dump() for cond in conds]
                for loan_id, conds in conditions_to_store.items()
            }
        }

        try:
            self._state_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self._state_path, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2, default=str)
        except Exception as e:
            print(f"[MockVentures] Failed to persist state: {e}")
