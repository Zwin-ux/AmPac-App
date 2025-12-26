import requests

try:
    response = requests.get("http://localhost:8001/api/v1/applications/user/me", headers={"x-user-id": "test-user"})
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
