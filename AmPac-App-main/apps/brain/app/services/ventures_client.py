import httpx
from typing import Optional, Dict, Any, List
from app.core.firebase import get_db
from app.core.config import get_settings
from app.services.encryption_service import encryption_service

settings = get_settings()

class VenturesClient:
    def __init__(self, username=None, password=None, site_name=None):
        self.base_url = "https://api.venturesgo.com/api/v4"
        self.client_name = site_name or "test_integration"
        self.username = username
        self.password = password
        self.token: Optional[str] = None
        
        # If creds not provided, try to load from Firestore
        if not self.username:
            self._load_config()

    def _load_config(self):
        try:
            db = get_db()
            doc = db.collection("system_secrets").document("ventures_config").get()
            if doc.exists:
                data = doc.to_dict()
                self.username = data.get("username")
                self.client_name = data.get("site_name", "test_integration")
                encrypted_pw = data.get("encrypted_password")
                if encrypted_pw:
                    self.password = encryption_service.decrypt(encrypted_pw)
        except Exception as e:
            print(f"Failed to load Ventures config: {e}")

    async def login(self) -> str:
        """
        Authenticates with Ventures and returns a Bearer token.
        """
        if not self.username or not self.password:
            # Try loading again just in case
            self._load_config()
            if not self.username or not self.password:
                raise ValueError("Ventures credentials not configured")

        url = f"{self.base_url}/token"
        payload = {
            "client": self.client_name,
            "username": self.username,
            "password": self.password
        }
        
        if settings.VENTURES_MOCK_MODE:
            self.token = f"mock_token_{self.username}"
            return self.token

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            try:
                data = response.json()
                self.token = data.get("token", response.text)
            except:
                self.token = response.text.strip('"')
            
            return self.token

    async def _get_headers(self) -> Dict[str, str]:
        if not self.token:
            await self.login()
        return {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json"
        }

    async def get_loan_status(self, loan_id: str) -> Dict[str, Any]:
        """
        Fetches loan details from Ventures.
        Note: 'loan_id' here is the Ventures ID, not AmPac ID.
        """
        headers = await self._get_headers()
        # Assuming 'loan' is the object type. Docs say call /objects to find out.
        # We'll assume 'loan' or 'application' for now.
        url = f"{self.base_url}/objects/loan/{loan_id}"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 401:
                # Token expired, retry once
                await self.login()
                headers = await self._get_headers()
                response = await client.get(url, headers=headers)
            
            response.raise_for_status()
            return response.json()

    async def sync_loan(self, loan_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Creates or updates a loan in Ventures.
        """
        headers = await self._get_headers()
        # Logic to determine if create or update would go here
        # For now, let's assume we are creating a new record for simplicity
        url = f"{self.base_url}/objects/loan"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=loan_data, headers=headers)
            response.raise_for_status()
            return response.json()

    async def get_loan_detail(self, loan_id: str) -> Dict[str, Any]:
        """
        Fetches detailed status, loan amount, and key dates.
        """
        # Re-use get_loan_status or expand it
        return await self.get_loan_status(loan_id)

    async def get_conditions(self, loan_id: str) -> List[Dict[str, Any]]:
        """
        Fetches underwriting conditions (tasks) for a loan.
        """
        headers = await self._get_headers()
        # Assuming a sub-resource or query
        url = f"{self.base_url}/objects/loan/{loan_id}/conditions"
        
        async with httpx.AsyncClient() as client:
            # Mock response for now if 404
            try:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                return response.json()
            except Exception:
                return []

    async def get_entities(self, tax_id: str) -> List[Dict[str, Any]]:
        """
        Search for existing borrower records by Tax ID (EIN/SSN).
        """
        headers = await self._get_headers()
        url = f"{self.base_url}/search/entities"
        params = {"taxId": tax_id}
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers, params=params)
                response.raise_for_status()
                return response.json()
            except Exception:
                return []

ventures_client = VenturesClient()
