import asyncio
import aiohttp
import json
import os

# Configuration
API_URL = "http://127.0.0.1:8001/api/v1"
TEST_FILES_DIR = "tests/data"

async def test_chat_api(session):
    print("\n--- Testing Chat API (RAG) ---")
    payload = {
        "messages": [
            {"role": "user", "content": "What is the max LTV for a gas station?"}
        ]
    }
    try:
        async with session.post(f"{API_URL}/chat/completions", json=payload) as response:
            if response.status == 200:
                data = await response.json()
                content = data['choices'][0]['message']['content']
                print(f"✅ Chat API Success. Response: {content[:100]}...")
                if "policy" in content.lower() or "sba" in content.lower():
                    print("✅ Response contains expected policy keywords.")
                else:
                    print("⚠️ Response might not be RAG-enhanced.")
            else:
                print(f"❌ Chat API Failed: {response.status} - {await response.text()}")
    except Exception as e:
        print(f"❌ Chat API Error: {str(e)}")

async def test_document_upload(session):
    print("\n--- Testing Document Upload & Analysis ---")
    # Create a dummy PDF if not exists
    if not os.path.exists(TEST_FILES_DIR):
        os.makedirs(TEST_FILES_DIR)
    
    dummy_pdf_path = os.path.join(TEST_FILES_DIR, "tax_return_2023.pdf")
    with open(dummy_pdf_path, "wb") as f:
        f.write(b"%PDF-1.4 dummy content")

    data = aiohttp.FormData()
    data.add_field('file',
                   open(dummy_pdf_path, 'rb'),
                   filename='tax_return_2023.pdf',
                   content_type='application/pdf')

    try:
        async with session.post(f"{API_URL}/documents/upload", data=data) as response:
            if response.status == 200:
                result = await response.json()
                print(f"✅ Upload Success. ID: {result.get('id')}")
                if result.get('analysis_started'):
                    print("✅ Analysis Started signal received.")
                
                # Check if analysis result is available (mock immediate return)
                if 'extracted_data' in result:
                     print(f"✅ Extracted Data: {json.dumps(result['extracted_data'], indent=2)}")
            else:
                print(f"❌ Upload Failed: {response.status} - {await response.text()}")
    except Exception as e:
        print(f"❌ Upload Error: {str(e)}")

async def test_website_builder(session):
    print("\n--- Testing Website Builder (Mock Fallback) ---")
    payload = {
        "name": "QA Test Business",
        "industry": "Technology",
        "zip": "90210",
        "description": "A test business for QA."
    }
    try:
        async with session.post(f"{API_URL}/website/generate", json=payload) as response:
            if response.status == 200:
                data = await response.json()
                if data.get('html') and data.get('sections'):
                    print("✅ Website Generation Success.")
                    print(f"✅ Hero Headline: {data['sections']['hero']['hero_headline']}")
                else:
                    print("❌ Website Generation returned incomplete data.")
            else:
                print(f"❌ Website Generation Failed: {response.status} - {await response.text()}")
    except Exception as e:
        print(f"❌ Website Builder Error: {str(e)}")

async def test_agent_workflow(session):
    print("\n--- Testing Agent Workflow ---")
    payload = {
        "agent_type": "compliance_check",
        "context": {"loanId": "test-loan-123"}
    }
    workflow_id = None
    
    # Trigger
    try:
        async with session.post(f"{API_URL}/agents/trigger", json=payload) as response:
            if response.status == 200:
                data = await response.json()
                workflow_id = data.get('workflow_id') # Response uses snake_case
                print(f"✅ Agent Triggered. Workflow ID: {workflow_id}")
            else:
                print(f"❌ Agent Trigger Failed: {response.status} - {await response.text()}")
                return
    except Exception as e:
        print(f"❌ Agent Trigger Error: {str(e)}")
        return

    # Poll Status
    if workflow_id:
        print("⏳ Polling status...")
        for _ in range(3):
            await asyncio.sleep(2)
            async with session.get(f"{API_URL}/agents/status/{workflow_id}") as response:
                if response.status == 200:
                    status_data = await response.json()
                    print(f"   Status: {status_data.get('status')} - Logs: {len(status_data.get('logs', []))}")
                    if status_data.get('status') == 'completed':
                        print("✅ Agent Workflow Completed.")
                        break
                else:
                    print(f"❌ Status Check Failed: {response.status}")

async def main():
    async with aiohttp.ClientSession() as session:
        await test_chat_api(session)
        await test_document_upload(session)
        await test_website_builder(session)
        await test_agent_workflow(session)

if __name__ == "__main__":
    asyncio.run(main())
