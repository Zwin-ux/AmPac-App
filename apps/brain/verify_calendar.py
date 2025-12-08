import asyncio
import httpx
import os
import json
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta, timezone

# 1. Setup Environment
# Ensure we use the same credentials as the main app for verification
if "FIREBASE_CREDENTIALS_PATH" not in os.environ:
    # Fallback to a common default/hardcoded path if not set, or let the user know
    default_path = r"c:\Users\mzwin\AmPac\apps\brain\serviceAccountKey.json"
    if os.path.exists(default_path):
        os.environ["FIREBASE_CREDENTIALS_PATH"] = default_path

def init_firebase():
    """Initialize Firebase Admin if not already initialized."""
    try:
        if not firebase_admin._apps:
            cred_path = os.environ.get("FIREBASE_CREDENTIALS_PATH")
            if cred_path and os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                print("✅ Firebase initialized with credentials.")
            else:
                print("⚠️  Warning: FIREBASE_CREDENTIALS_PATH not found. Firestore checks might fail.")
                # We might proceed if we only rely on API responses
    except Exception as e:
        print(f"❌ Firebase init failed: {e}")

async def verify_calendar_flow():
    print("\n--- Starting Calendar Verification ---")
    
    base_url = "http://127.0.0.1:8000"  # Assuming Brain is running locally
    
    # Init Firebase for verification steps
    init_firebase()
    db = None
    if firebase_admin._apps:
        db = firestore.client()

    async with httpx.AsyncClient(base_url=base_url, timeout=30.0) as client:
        # Step 1: Check Availability
        print("\n1. Checking Availability...")
        now = datetime.now(timezone.utc)
        start_time = now.isoformat()
        end_time = (now + timedelta(days=7)).isoformat()
        
        payload_avail = {
            "staffEmail": "officer@ampac.com",
            "durationMinutes": 30,
            "start": start_time,
            "end": end_time
        }
        
        try:
            resp = await client.post("/api/v1/calendar/available", json=payload_avail)
            resp.raise_for_status()
            data = resp.json()
            
            suggestions = data.get("suggested", [])
            print(f"✅ Availability Response: {len(suggestions)} slots suggested.")
            
            if not suggestions:
                print("❌ No suggestions returned. Cannot proceed to booking.")
                return
                
            first_slot = suggestions[0]
            print(f"   Selected Slot: {first_slot['startTime']} - {first_slot['endTime']}")

        except httpx.HTTPStatusError as e:
            print(f"❌ Availability Check Failed: {e.response.text}")
            return
        except Exception as e:
            print(f"❌ Availability Check Failed: {e}")
            return

        # Step 2: Book a Meeting
        print("\n2. Booking Meeting...")
        chosen_time = first_slot['startTime']
        
        payload_book = {
            "staffEmail": "officer@ampac.com",
            "borrowerEmail": "verifier@ampac.com",
            "durationMinutes": 30,
            "chosenStartTime": chosen_time
        }
        
        booking_id = None
        try:
            resp = await client.post("/api/v1/calendar/book", json=payload_book)
            resp.raise_for_status()
            data = resp.json()
            
            print(f"✅ Booking Successful!")
            print(f"   Event ID: {data.get('eventId')}")
            print(f"   Join URL: {data.get('joinUrl')}")
            
            # We assume the ID is not returned in the body directly for security/simplicity, 
            # but usually persistence returns the ID. 
            # In our router implementation, we return eventId and joinUrl. 
            # To verify firestore, we'll query for the most recent booking.
            
        except httpx.HTTPStatusError as e:
            print(f"❌ Booking Failed: {e.response.text}")
            return

        # Step 3: Verify Persistence
        if db:
            print("\n3. Verifying Firestore Persistence...")
            # Query for the booking we just made
            bookings_ref = db.collection("bookings")
            # We can query by staffEmail and borrowerEmail
            query = bookings_ref.where("borrowerEmail", "==", "verifier@ampac.com")
            results = list(query.stream())
            # Sort manually by createdAt to avoid index requirement
            results.sort(key=lambda x: x.to_dict().get('createdAt', ''), reverse=True)
            
            if results:
                doc = results[0]
                b_data = doc.to_dict()
                print(f"✅ Found Booking in Firestore: {doc.id}")
                print(f"   Time: {b_data.get('startTime')}")
                print(f"   Status: {b_data.get('status')}")
                
                # Verify match
                if b_data.get("startTime") == chosen_time:
                     print("✅ Booking time matches.")
                else:
                     print(f"⚠️ Booking time mismatch? Got {b_data.get('startTime')}, expected {chosen_time}")
            else:
                print("❌ Booking not found in Firestore.")
        else:
            print("\n⚠️ Skipping Firestore verification (No credentials).")

    print("\n--- Calendar Verification Complete ---")

if __name__ == "__main__":
    asyncio.run(verify_calendar_flow())
