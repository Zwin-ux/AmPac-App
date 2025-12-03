import requests
import time

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_idp_flow():
    print("Testing IDP Flow...")
    
    # 1. Upload Document
    print("\n1. Uploading Document...")
    files = {'file': ('test_doc.txt', 'This is a test tax return for Acme Corp, Revenue: $1,000,000', 'text/plain')}
    try:
        response = requests.post(f"{BASE_URL}/documents/upload", files=files)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            doc_id = response.json().get("documentId")
            print(f"Document ID: {doc_id}")
            return True
        else:
            print("Upload failed")
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    test_idp_flow()
