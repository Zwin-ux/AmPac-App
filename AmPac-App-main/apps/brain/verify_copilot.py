import requests
import asyncio

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_copilot():
    print("Testing Staff Copilot...")
    
    payload = {
        "query": "Draft an email to Alex asking for tax returns.",
        "context": {
            "page": "/applications/123",
            "role": "underwriter"
        }
    }
    
    try:
        response = requests.post(f"{BASE_URL}/agents/copilot", json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200 and "response" in response.json():
            return True
        else:
            print("Copilot failed")
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    test_copilot()
