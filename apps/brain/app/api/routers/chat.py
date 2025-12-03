from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import List, Optional
from firebase_admin import firestore
from datetime import datetime
import uuid
from app.services.notification_service import notification_service

router = APIRouter()

class Message(BaseModel):
    id: str
    threadId: str
    senderRole: str # 'borrower' or 'staff'
    text: str
    createdAt: datetime

class Thread(BaseModel):
    id: str
    borrowerId: str
    staffId: Optional[str] = None
    lastMessageAt: datetime
    preview: str

class CreateMessageRequest(BaseModel):
    text: str
    senderRole: str = "borrower" # Default to borrower for mobile app

@router.get("/threads", response_model=List[Thread])
async def get_threads(x_user_id: Optional[str] = Header(None)):
    """
    Get all chat threads for the current user.
    """
    if not x_user_id:
        # Default for demo/dev
        x_user_id = "demo_user"

    db = firestore.client()
    threads_ref = db.collection("threads")
    # Simple query
    query = threads_ref.where("borrowerId", "==", x_user_id).stream()
    
    results = []
    for doc in query:
        data = doc.to_dict()
        results.append(Thread(**data))
    
    return results

@router.get("/threads/{thread_id}/messages", response_model=List[Message])
async def get_messages(thread_id: str):
    """
    Get messages for a specific thread.
    """
    db = firestore.client()
    messages_ref = db.collection("threads").document(thread_id).collection("messages")
    query = messages_ref.order_by("createdAt").stream()
    
    results = []
    for doc in query:
        data = doc.to_dict()
        results.append(Message(**data))
    
    return results

@router.post("/threads/{thread_id}/messages", response_model=Message)
async def send_message(thread_id: str, request: CreateMessageRequest):
    """
    Send a message to a thread.
    """
    db = firestore.client()
    
    msg_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    new_message = {
        "id": msg_id,
        "threadId": thread_id,
        "senderRole": request.senderRole,
        "text": request.text,
        "createdAt": now
    }
    
    # Add to subcollection
    db.collection("threads").document(thread_id).collection("messages").document(msg_id).set(new_message)
    
    # Update thread lastMessageAt
    # Update thread lastMessageAt
    thread_ref = db.collection("threads").document(thread_id)
    thread_ref.update({
        "lastMessageAt": now,
        "preview": request.text[:50]
    })
    
    # Send Notification
    try:
        thread_doc = thread_ref.get()
        if thread_doc.exists:
            thread_data = thread_doc.to_dict()
            # Determine recipient
            if request.senderRole == 'staff':
                recipient_id = thread_data.get('borrowerId')
                sender_name = "AmPac Staff"
            else:
                recipient_id = thread_data.get('staffId')
                sender_name = "Borrower"
            
            if recipient_id:
                notification_service.notify_new_message(
                    recipient_id=recipient_id,
                    sender_name=sender_name,
                    message_preview=request.text[:100],
                    thread_id=thread_id
                )
    except Exception as e:
        print(f"Notification error: {e}")

    return Message(**new_message)

@router.post("/threads", response_model=Thread)
async def create_thread(x_user_id: Optional[str] = Header(None)):
    """
    Create a new thread (mostly for testing/init).
    """
    if not x_user_id:
        x_user_id = "demo_user"
        
    db = firestore.client()
    thread_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    new_thread = {
        "id": thread_id,
        "borrowerId": x_user_id,
        "staffId": "staff_001",
        "lastMessageAt": now,
        "preview": "New conversation started"
    }
    
    db.collection("threads").document(thread_id).set(new_thread)
    return Thread(**new_thread)

class ChatCompletionRequest(BaseModel):
    messages: List[dict]
    context: Optional[dict] = {}
    stream: bool = False

@router.post("/completions")
async def chat_completions(request: ChatCompletionRequest):
    """
    OpenAI-compatible chat completion endpoint for RAG.
    """
    print(f"Received chat completion request. Messages: {len(request.messages)}")
    try:
        from app.services.llm_service import llm_service
        
        # Extract last user message
        last_message = request.messages[-1]['content']
        print(f"Last message: {last_message}")
        
        # Generate response
        response_text = await llm_service.generate_response(last_message)
        print(f"LLM Response generated: {len(response_text)} chars")
        
        return {
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": response_text
                    }
                }
            ]
        }
    except Exception as e:
        print(f"Error in chat_completions: {e}")
        raise HTTPException(status_code=500, detail=str(e))
