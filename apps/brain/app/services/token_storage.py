from app.core.firebase import get_db
from app.services.encryption_service import encryption_service
from datetime import datetime
from typing import Optional, Dict, Any

class TokenStorage:
    """
    Securely stores and retrieves Microsoft Graph tokens for users.
    Tokens are encrypted at rest using EncryptionService.
    """
    
    def __init__(self):
        self.db = get_db()
        self.collection = "users"
        self.subcollection = "integrations"
        self.doc_id = "microsoft"

    async def save_tokens(self, user_id: str, token_data: Dict[str, Any]):
        """
        Encrypts and saves tokens to Firestore.
        token_data expected keys: access_token, refresh_token, expires_at, scope
        """
        if not user_id:
            raise ValueError("User ID is required")

        encrypted_data = {
            "access_token": encryption_service.encrypt(token_data.get("access_token")),
            "refresh_token": encryption_service.encrypt(token_data.get("refresh_token")),
            "expires_at": token_data.get("expires_at"), # Timestamp or int
            "scope": token_data.get("scope"),
            "updated_at": datetime.utcnow()
        }

        # Save to users/{uid}/integrations/microsoft
        doc_ref = self.db.collection(self.collection).document(user_id).collection(self.subcollection).document(self.doc_id)
        doc_ref.set(encrypted_data, merge=True)

    async def get_tokens(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves and decrypts tokens for a user.
        """
        if not user_id:
            return None

        doc_ref = self.db.collection(self.collection).document(user_id).collection(self.subcollection).document(self.doc_id)
        doc = doc_ref.get()

        if not doc.exists:
            return None

        data = doc.to_dict()
        
        try:
            return {
                "access_token": encryption_service.decrypt(data.get("access_token")),
                "refresh_token": encryption_service.decrypt(data.get("refresh_token")),
                "expires_at": data.get("expires_at"),
                "scope": data.get("scope")
            }
        except Exception as e:
            print(f"Error decrypting tokens for user {user_id}: {e}")
            return None

    async def delete_tokens(self, user_id: str):
        """
        Removes tokens for a user (disconnect).
        """
        if not user_id:
            return
            
        doc_ref = self.db.collection(self.collection).document(user_id).collection(self.subcollection).document(self.doc_id)
        doc_ref.delete()

    async def save_ventures_creds(self, user_id: str, creds: Dict[str, str]):
        """
        Encrypts and saves Ventures credentials.
        """
        if not user_id: raise ValueError("User ID required")
        
        encrypted_data = {
            "username": encryption_service.encrypt(creds.get("username")),
            "password": encryption_service.encrypt(creds.get("password")),
            "site": creds.get("site", "ampac"), # Default to ampac if not provided
            "updated_at": datetime.utcnow()
        }
        
        doc_ref = self.db.collection(self.collection).document(user_id).collection(self.subcollection).document("ventures")
        doc_ref.set(encrypted_data, merge=True)

    async def get_ventures_creds(self, user_id: str) -> Optional[Dict[str, str]]:
        """
        Retrieves decrypted Ventures credentials.
        """
        if not user_id: return None
        
        doc_ref = self.db.collection(self.collection).document(user_id).collection(self.subcollection).document("ventures")
        doc = doc_ref.get()
        
        if not doc.exists: return None
        
        data = doc.to_dict()
        try:
            return {
                "username": encryption_service.decrypt(data.get("username")),
                "password": encryption_service.decrypt(data.get("password")),
                "site": data.get("site", "ampac")
            }
        except Exception as e:
            print(f"Error decrypting Ventures creds for {user_id}: {e}")
            return None
