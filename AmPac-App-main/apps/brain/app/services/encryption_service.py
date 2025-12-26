from cryptography.fernet import Fernet
import base64
import os
from app.core.config import get_settings

settings = get_settings()

class EncryptionService:
    def __init__(self):
        # In a real app, this should be a persistent secret in .env
        # For now, we'll derive a key or use a default for dev if missing
        secret = os.getenv("SECRET_KEY", "default-insecure-secret-key-for-dev-only-32b")
        
        # Fernet requires a 32-byte url-safe base64-encoded key
        # We'll ensure our secret is compatible or hash it
        try:
            self.fernet = Fernet(secret)
        except ValueError:
            # If the key isn't valid base64 32-byte, let's generate a deterministic one from it
            # This is a fallback for dev convenience
            import hashlib
            key = hashlib.sha256(secret.encode()).digest()
            b64_key = base64.urlsafe_b64encode(key)
            self.fernet = Fernet(b64_key)

    def encrypt(self, data: str) -> str:
        if not data:
            return ""
        return self.fernet.encrypt(data.encode()).decode()

    def decrypt(self, token: str) -> str:
        if not token:
            return ""
        return self.fernet.decrypt(token.encode()).decode()

encryption_service = EncryptionService()
