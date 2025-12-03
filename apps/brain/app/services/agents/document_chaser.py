from app.services.graph_service import GraphService
from app.services.llm_service import LLMService
from app.services.sharefile_client import ShareFileClient
import asyncio

class DocumentChaserAgent:
    """
    Agent that monitors emails for missing documents and triggers workflows.
    """
    def __init__(self):
        self.graph_service = GraphService()
        self.llm_service = LLMService()
        self.sharefile_client = ShareFileClient()

    async def check_emails_for_documents(self, user_id: str):
        """
        Checks recent emails for keywords related to documents.
        """
        print(f"DocumentChaser: Checking emails for {user_id}...")
        emails = await self.graph_service.get_recent_emails(user_id, limit=10)
        
        found_docs = []
        
        for email in emails:
            subject = email.get("subject", "").lower()
            body_preview = email.get("bodyPreview", "").lower()
            
            # 1. Keyword Check
            keywords = ["attached", "document", "file", "application", "tax return", "bank statement"]
            if any(k in subject or k in body_preview for k in keywords):
                print(f"DocumentChaser: Found potential doc in email '{subject}'")
                
                # 2. LLM Analysis (Mock for now, or simple implementation)
                # In a real scenario, we'd fetch the full body and attachments
                
                # 3. ShareFile Upload (Mocking attachment content for now)
                # We assume we found an attachment. In reality, we'd iterate over attachments.
                # Let's simulate uploading a "dummy" file if keywords match.
                
                try:
                    # Determine Borrower Name and Loan ID (Mock logic or extract from subject)
                    # Example Subject: "Loan Application for John Doe - 1001"
                    borrower_name = "John Doe" # Placeholder
                    loan_id = "1001" # Placeholder
                    
                    # Ensure Folder Structure
                    folder_id = await self.sharefile_client.ensure_folder_structure(borrower_name, loan_id)
                    
                    # Upload File
                    # In real impl, we'd download attachment content from Graph
                    file_content = b"Mock PDF Content" 
                    file_name = f"Document_from_{email.get('id')}.pdf"
                    
                    file_id = await self.sharefile_client.upload_file(file_content, file_name, folder_id)
                    print(f"DocumentChaser: Uploaded {file_name} to ShareFile folder {folder_id}")
                    
                    found_docs.append({
                        "email_id": email.get("id"),
                        "subject": email.get("subject"),
                        "sender": email.get("sender", {}).get("emailAddress", {}).get("address"),
                        "received": email.get("receivedDateTime"),
                        "sharefile_id": file_id
                    })
                    
                except Exception as e:
                    print(f"DocumentChaser: Failed to upload to ShareFile: {e}")

        if found_docs:
            print(f"DocumentChaser: Triggering 'Document Received' workflow for {len(found_docs)} emails.")
            # Here we would call the workflow engine
            # await workflow_service.trigger("document_received", { "docs": found_docs })
            return {"status": "triggered", "found_docs": found_docs}
            
        return {"status": "no_docs_found"}

document_chaser = DocumentChaserAgent()
