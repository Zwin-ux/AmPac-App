import httpx
from app.core.config import get_settings

settings = get_settings()

class ShareFileClient:
    """
    Client for interacting with the ShareFile API.
    Handles authentication, folder management, and file uploads.
    """
    
    def __init__(self):
        self.client_id = settings.SHAREFILE_CLIENT_ID
        self.client_secret = settings.SHAREFILE_CLIENT_SECRET
        self.subdomain = settings.SHAREFILE_SUBDOMAIN
        self.base_url = f"https://{self.subdomain}.sharefile.com/sf/v3"
        self.token = None

    async def authenticate(self):
        """
        Authenticates with ShareFile using OAuth2.
        """
        if not self.client_id or not self.client_secret:
            print("ShareFile credentials not configured.")
            return

        token_url = f"https://{self.subdomain}.sharefile.com/oauth/token"
        payload = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(token_url, data=payload)
                response.raise_for_status()
                data = response.json()
                self.token = data.get("access_token")
            except Exception as e:
                print(f"ShareFile authentication failed: {e}")

    async def _get_headers(self):
        if not self.token:
            await self.authenticate()
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

    async def _find_item_by_name(self, parent_id: str, name: str) -> str:
        """
        Helper to find an item ID by name within a parent folder.
        Returns None if not found.
        """
        headers = await self._get_headers()
        url = f"{self.base_url}/Items({parent_id})/Children"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                data = response.json()
                items = data.get("value", [])
                for item in items:
                    if item.get("Name") == name:
                        return item.get("Id")
            except Exception as e:
                print(f"Error finding item {name}: {e}")
        return None

    async def _create_folder(self, parent_id: str, name: str) -> str:
        """
        Helper to create a folder. Returns the new Folder ID.
        """
        headers = await self._get_headers()
        url = f"{self.base_url}/Items({parent_id})/Folder"
        payload = {"Name": name, "Description": "Created by AmPac Brain"}
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                return response.json().get("Id")
            except Exception as e:
                print(f"Error creating folder {name}: {e}")
                raise

    async def ensure_folder_structure(self, borrower_name: str, loan_id: str) -> str:
        """
        Ensures the folder structure Clients/{BorrowerName}/{LoanID}/Conditions exists.
        Returns the Folder ID for the 'Conditions' folder.
        """
        if not self.token:
            await self.authenticate()
            
        # 1. Get Root (usually "allshared" or specific root, we'll assume default root)
        # For simplicity, let's assume we start at the user's root or a specific known root ID if configured
        # If not configured, we query for the default root
        root_id = "home" # 'home' alias often works for the authenticated user's root
        
        # 2. Ensure "Clients"
        clients_id = await self._find_item_by_name(root_id, "Clients")
        if not clients_id:
            clients_id = await self._create_folder(root_id, "Clients")
            
        # 3. Ensure Borrower Name
        borrower_id = await self._find_item_by_name(clients_id, borrower_name)
        if not borrower_id:
            borrower_id = await self._create_folder(clients_id, borrower_name)
            
        # 4. Ensure Loan ID
        loan_folder_id = await self._find_item_by_name(borrower_id, loan_id)
        if not loan_folder_id:
            loan_folder_id = await self._create_folder(borrower_id, loan_id)
            
        # 5. Ensure Conditions
        conditions_id = await self._find_item_by_name(loan_folder_id, "Conditions")
        if not conditions_id:
            conditions_id = await self._create_folder(loan_folder_id, "Conditions")
            
        return conditions_id

    async def upload_file(self, file_content: bytes, file_name: str, folder_id: str) -> str:
        """
        Uploads a file to the specified ShareFile folder.
        Returns the ID of the uploaded file.
        """
        headers = await self._get_headers()
        
        # 1. Get Upload URL
        # Standard upload method: POST /Items(id)/Upload
        url = f"{self.base_url}/Items({folder_id})/Upload"
        # Standard upload usually requires method=standard query param or similar, 
        # but the default POST often returns the ChunkUri
        
        async with httpx.AsyncClient() as client:
            # Get the ChunkUri
            response = await client.get(url, headers=headers) # GET to get the upload config/link
            response.raise_for_status()
            upload_config = response.json()
            chunk_uri = upload_config.get("ChunkUri")
            
            if not chunk_uri:
                raise Exception("Failed to get upload ChunkUri from ShareFile")
                
            # 2. Upload the file content to the ChunkUri
            # The ChunkUri is a direct link, often doesn't need auth headers if it contains a token, 
            # but usually we post multipart/form-data
            files = {'File1': (file_name, file_content)}
            upload_response = await client.post(chunk_uri, files=files)
            upload_response.raise_for_status()
            
            # ShareFile returns "OK" string usually, not JSON, on success of raw upload
            # But we might need to verify. 
            # For this implementation, we'll assume success if 200 OK.
            # To get the ID, we might need to query the folder again or check response if it's JSON.
            # Some endpoints return the ID. Let's check if it's JSON.
            try:
                res_json = upload_response.json()
                # If it returns a list of uploaded items
                if isinstance(res_json, list) and len(res_json) > 0:
                    return res_json[0].get("Id")
                if res_json.get("Id"):
                    return res_json.get("Id")
            except:
                pass
                
            # Fallback: Find the file we just uploaded
            file_id = await self._find_item_by_name(folder_id, file_name)
            return file_id or "unknown_id"

    async def get_file_preview_link(self, file_id: str) -> str:
        """
        Generates a preview link for a document.
        """
        return f"https://{self.subdomain}.sharefile.com/d/{file_id}"
