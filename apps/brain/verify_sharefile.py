import asyncio
from unittest.mock import MagicMock, AsyncMock
import sys
import os

# Add app to path
sys.path.append(os.getcwd())

from app.services.agents.document_chaser import DocumentChaserAgent

async def test_sharefile_integration():
    print("Testing ShareFile Integration Logic...")
    
    # Mock Dependencies
    agent = DocumentChaserAgent()
    agent.graph_service.get_recent_emails = AsyncMock(return_value=[
        {
            "id": "msg_123",
            "subject": "Loan Application - Attached Documents",
            "bodyPreview": "Please find attached the tax returns.",
            "sender": {"emailAddress": {"address": "borrower@example.com"}},
            "receivedDateTime": "2023-10-27T10:00:00Z"
        }
    ])
    
    agent.sharefile_client.ensure_folder_structure = AsyncMock(return_value="folder_conditions_123")
    agent.sharefile_client.upload_file = AsyncMock(return_value="file_456")
    
    # Run Agent
    result = await agent.check_emails_for_documents("user_123")
    
    # Verify
    print(f"Result: {result}")
    
    if result["status"] == "triggered" and len(result["found_docs"]) == 1:
        doc = result["found_docs"][0]
        if doc.get("sharefile_id") == "file_456":
            print("SUCCESS: Document found and 'uploaded' to ShareFile.")
        else:
            print("FAILURE: ShareFile ID missing or incorrect.")
    else:
        print("FAILURE: Workflow not triggered.")

if __name__ == "__main__":
    asyncio.run(test_sharefile_integration())
