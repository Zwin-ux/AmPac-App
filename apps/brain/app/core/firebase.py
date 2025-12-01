import firebase_admin
from firebase_admin import credentials, firestore
from app.core.config import get_settings
import os

settings = get_settings()

import firebase_admin
from firebase_admin import credentials, firestore
from app.core.config import get_settings
import os
from unittest.mock import MagicMock

settings = get_settings()

class MockFirestoreClient:
    def collection(self, name):
        print(f"[MockFirestore] Accessing collection: {name}")
        return MagicMock()

def get_db():
    try:
        # Check if already initialized
        app = firebase_admin.get_app()
        return firestore.client()
    except ValueError:
        pass

    # Not initialized, try to initialize
    cred_path = settings.FIREBASE_CREDENTIALS_PATH
    
    try:
        if os.path.exists(cred_path):
            try:
                cred = credentials.Certificate(cred_path)
                app = firebase_admin.initialize_app(cred)
                return firestore.client()
            except Exception as e:
                print(f"Warning: Failed to initialize Firebase with {cred_path}: {e}")
                print("Falling back to Mock Firestore.")
                return MockFirestoreClient()
        else:
            # Try default credentials
            try:
                app = firebase_admin.initialize_app()
                return firestore.client()
            except Exception:
                print("Warning: No credentials found. Falling back to Mock Firestore.")
                return MockFirestoreClient()
    except Exception as e:
        print(f"Firebase Init Error: {e}")
        return MockFirestoreClient()

