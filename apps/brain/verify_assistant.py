import httpx
import asyncio

BASE_URL = "http://127.0.0.1:8000/api/v1"

async def verify_assistant():
    print("\n--- Verifying Smart Assistant ---")
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Test Application Context
        print("Testing 'application' context...")
        payload = {
            "context": "application",
            "query": "What is the difference between 504 and 7a?",
            "userId": "test_user"
        }
        try:
            response = await client.post(f"{BASE_URL}/assistant/chat", json=payload)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Response: {data['response'][:100]}...")
            else:
                print(f"❌ Failed: {response.status_code} {response.text}")
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"❌ Error: {repr(e)}")

if __name__ == "__main__":
    asyncio.run(verify_assistant())
