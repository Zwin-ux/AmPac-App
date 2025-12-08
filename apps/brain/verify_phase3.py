import httpx
import asyncio
import uuid
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:8000/api/v1"

async def verify_dashboard():
    print("\n--- Verifying Ventures Dashboard ---")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{BASE_URL}/ventures/dashboard")
            if response.status_code == 200:
                data = response.json()
                print("✅ Dashboard Stats:", data)
            else:
                print(f"❌ Failed: {response.status_code} {response.text}")
        except httpx.ConnectError:
            print("❌ Error: Could not connect to Brain service.")
            print("💡 Tip: Is the server running? (Run: `python -m uvicorn apps.brain.app.main:app --reload`)")
        except Exception as e:
            print(f"❌ Error: {e}")

async def verify_calendar():
    print("\n--- Verifying Calendar ---")
    async with httpx.AsyncClient() as client:
        # 1. Available Slots
        print("Checking availability...")
        try:
            start = datetime.utcnow()
            end = start + timedelta(days=1)
            payload = {
                "staffEmail": "officer@ampac.com",
                "durationMinutes": 30,
                "start": start.isoformat(),
                "end": end.isoformat()
            }
            response = await client.post(f"{BASE_URL}/calendar/available", json=payload)
            if response.status_code == 200:
                slots = response.json()
                print(f"✅ Available Slots found: {len(slots)}")
            else:
                print(f"❌ Availability Check Failed: {response.status_code} {response.text}")
        except Exception as e:
            print(f"❌ Error: {e}")

async def verify_chat():
    print("\n--- Verifying Chat ---")
    async with httpx.AsyncClient() as client:
        user_id = "test_user_123"
        headers = {"X-User-ID": user_id}
        
        # 1. Create Thread
        print("Creating thread...")
        try:
            response = await client.post(f"{BASE_URL}/chat/threads", headers=headers)
            if response.status_code == 200:
                thread = response.json()
                thread_id = thread["id"]
                print(f"✅ Thread Created: {thread_id}")
                
                # 2. Send Message
                print("Sending message...")
                msg_payload = {"text": "Hello from verification script!", "senderRole": "borrower"}
                msg_resp = await client.post(f"{BASE_URL}/chat/threads/{thread_id}/messages", json=msg_payload)
                if msg_resp.status_code == 200:
                    print("✅ Message Sent")
                else:
                    print(f"❌ Send Message Failed: {msg_resp.status_code}")
                
                # 3. Get Messages
                print("Fetching messages...")
                get_resp = await client.get(f"{BASE_URL}/chat/threads/{thread_id}/messages")
                if get_resp.status_code == 200:
                    msgs = get_resp.json()
                    print(f"✅ Messages Retrieved: {len(msgs)}")
                else:
                    print(f"❌ Get Messages Failed: {get_resp.status_code}")

            else:
                print(f"❌ Create Thread Failed: {response.status_code}")
        except Exception as e:
            print(f"❌ Error: {e}")

async def main():
    await verify_dashboard()
    await verify_calendar()
    await verify_chat()

if __name__ == "__main__":
    asyncio.run(main())
