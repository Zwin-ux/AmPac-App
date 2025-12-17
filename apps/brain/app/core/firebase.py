import firebase_admin
from firebase_admin import credentials, firestore, storage
from app.core.config import get_settings
import os
from unittest.mock import MagicMock

settings = get_settings()

class MockFirestoreClient:
    def collection(self, name):
        print(f"[MockFirestore] Accessing collection: {name}")
        return MagicMock()

class MockBucket:
    def blob(self, path):
        print(f"[MockBucket] Accessing blob: {path}")
        return MagicMock()

import json

def _ensure_app():
    try:
        return firebase_admin.get_app()
    except ValueError:
        cred_path = settings.FIREBASE_CREDENTIALS_PATH
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            return firebase_admin.initialize_app(cred, {
                "storageBucket": settings.STORAGE_BUCKET
            })
        elif settings.FIREBASE_CREDENTIALS_JSON:
            try:
                cred_dict = json.loads(settings.FIREBASE_CREDENTIALS_JSON)
                cred = credentials.Certificate(cred_dict)
                return firebase_admin.initialize_app(cred, {
                    "storageBucket": settings.STORAGE_BUCKET
                })
            except Exception as e:
                print(f"Error loading Firebase credentials from JSON: {e}")
                return firebase_admin.initialize_app(options={"storageBucket": settings.STORAGE_BUCKET})
        else:
            return firebase_admin.initialize_app(options={"storageBucket": settings.STORAGE_BUCKET})

def ensure_firebase_app():
    return _ensure_app()

def get_db():
    try:
        ensure_firebase_app()
        return firestore.client()
    except Exception as e:
        print(f"Firebase Init Error (db): {e}")
        return MockFirestoreClient()

def get_bucket():
    try:
        ensure_firebase_app()
        bucket_name = settings.STORAGE_BUCKET
        if bucket_name:
            return storage.bucket(bucket_name)
        return storage.bucket()
    except Exception as e:
        print(f"Firebase Init Error (bucket): {e}")
        return MockBucket()
