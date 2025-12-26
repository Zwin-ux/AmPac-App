import httpx
from app.core.config import get_settings
from typing import List, Dict, Optional

settings = get_settings()

class ShareFileService:
    """
    Service for interacting with Citrix ShareFile API.
    Used to crawl folders and download documents for the Knowledge Base (RAG).
    """

    def __init__(self):
        self.subdomain = "ampacbusinesscapital" # User provided
        self.base_url = f"https://{self.subdomain}.sf-api.com/sf/v3"
        self.client_id = settings.SHAREFILE_CLIENT_ID
        self.client_secret = settings.SHAREFILE_CLIENT_SECRET
        self.username = settings.SHAREFILE_USERNAME
        self.password = settings.SHAREFILE_PASSWORD
        self.token = None

    async def authenticate(self):
        """
        Obtains an OAuth2 Access Token using Password Grant or Client Credentials.
        """
        if self.token:
            return self.token

        token_url = f"https://{self.subdomain}.sharefile.com/oauth/token"
        
        # Using Password Grant for simplicity in this scaffold
        # In production, consider standard OAuth flow
        data = {
            "grant_type": "password",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "username": self.username,
            "password": self.password
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(token_url, data=data)
                response.raise_for_status()
                self.token = response.json().get("access_token")
                print("✅ ShareFile Authenticated")
            except Exception as e:
                print(f"❌ ShareFile Auth Failed: {e}")

    async def list_children(self, folder_id: str = "root") -> List[Dict]:
        """
        Lists files and folders within a specific folder.
        """
        await self.authenticate()
        if not self.token:
            return []

        url = f"{self.base_url}/Items({folder_id})/Children"
        headers = {"Authorization": f"Bearer {self.token}"}

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                data = response.json()
                return data.get("value", [])
            except Exception as e:
                print(f"Error listing children for {folder_id}: {e}")
                return []

    async def download_file(self, file_id: str) -> Optional[bytes]:
        """
        Downloads a file's content.
        """
        await self.authenticate()
        if not self.token:
            return None

        url = f"{self.base_url}/Items({file_id})/Download"
        headers = {"Authorization": f"Bearer {self.token}"}

        async with httpx.AsyncClient() as client:
            try:
                # 1. Get Download Link
                response = await client.get(url, headers=headers, follow_redirects=False)
                
                download_url = response.headers.get("Location")
                if not download_url:
                    # Sometimes it redirects immediately, sometimes returns link
                    download_url = response.json().get("DownloadUrl")

                if download_url:
                    # 2. Download Content
                    file_response = await client.get(download_url)
                    return file_response.content
                
                return None
            except Exception as e:
                print(f"Error downloading file {file_id}: {e}")
                return None

    async def search(self, query: str) -> List[Dict]:
        """
        Searches for files matching the query.
        """
        await self.authenticate()
        if not self.token:
            return []

        url = f"{self.base_url}/Items/Search"
        headers = {"Authorization": f"Bearer {self.token}"}
        params = {"query": query}

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers, params=params)
                response.raise_for_status()
                return response.json().get("value", [])
            except Exception as e:
                print(f"Error searching ShareFile: {e}")
                return []
