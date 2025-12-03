from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
from app.services.graph_service import GraphService
from app.services.llm_service import LLMService
from app.services.doc_parser import DocumentParser

router = APIRouter()
# Force Rebuild for Real Intelligence
graph_service = GraphService()
llm_service = LLMService()

class DraftEmailRequest(BaseModel):
    appId: str
    intent: str
    tone: str
    extraNotes: Optional[str] = None

class DraftEmailResponse(BaseModel):
    subject: str
    body: str
    attachments: List[str] = []

class ProposeMeetingRequest(BaseModel):
    borrowerEmail: str
    staffEmails: List[str]
    timeWindow: str

class ProposeMeetingResponse(BaseModel):
    slots: List[str]
    draftBody: str

class DealAnalysisResponse(BaseModel):
    is_eligible: bool
    score: int
    findings: List[str]
    extracted_data: dict

@router.post("/analyze_deal", response_model=DealAnalysisResponse)
async def analyze_deal(
    subject: str = Form(...),
    sender: str = Form(...),
    body: str = Form(...),
    attachments: List[UploadFile] = File(None)
):
    # 1. Parse Attachments
    attachment_text = ""
    if attachments:
        for file in attachments:
            text = await DocumentParser.parse_file(file)
            attachment_text += f"\n--- Attachment: {file.filename} ---\n{text}\n"

    # 2. Combine Context
    full_context = f"Subject: {subject}\nSender: {sender}\nBody: {body}\n\nAttachments:\n{attachment_text}"

    # 3. Analyze with LLM
    prompt = f"""
    You are an expert SBA Loan Underwriter. Analyze the following email and attachments to determine if this deal is eligible for financing.
    
    CONTEXT:
    {full_context}
    
    CRITERIA:
    - SBA 504: Owner Occupied Real Estate (51%+ occupancy).
    - SBA 7(a): Working capital, business acquisition, debt refinance.
    - RESTRICTED: Gambling, Speculative, Pyramid schemes.
    
    INSTRUCTIONS:
    1. Extract the "Amount" requested.
    2. Estimate "DSCR" if financials are present (Net Income / Debt Service).
    3. Check for "Tax Returns" (Forms 1040, 1120).
    4. Assign a "Score" (0-100) based on deal quality and data completeness.
    5. List specific "Findings" (e.g., "✅ Owner Occupied", "❌ Gambling Industry").
    
    OUTPUT FORMAT (JSON ONLY):
    {{
        "is_eligible": true/false,
        "score": 85,
        "findings": ["✅ Finding 1", "ℹ️ Finding 2"],
        "extracted_data": {{
            "amount": "$1,500,000",
            "dscr": "1.25",
            "has_tax_returns": true
        }}
    }}
    """
    
    try:
        llm_response = await llm_service.generate_response(prompt)
        
        # Parse JSON from LLM response (handle potential markdown fences)
        import json
        clean_json = llm_response.replace("```json", "").replace("```", "").strip()
        analysis = json.loads(clean_json)
        
        is_eligible = analysis.get("is_eligible", False)
        score = analysis.get("score", 0)
        findings = analysis.get("findings", [])
        extracted_data = analysis.get("extracted_data", {})
        
    except Exception as e:
        print(f"LLM Analysis Failed: {e}")
        # Fallback to basic keyword match if LLM fails
        is_eligible = False
        score = 0
        findings = [f"⚠️ AI Analysis Failed: {str(e)}"]
        extracted_data = {}

    # 4. "Deal Room" Automation (Kalshi-style Integration)
    if is_eligible:
        try:
            # Mock Team ID (In real app, fetch from config or DB)
            # This ID would be the "AmPac Underwriting" Team ID
            team_id = "00000000-0000-0000-0000-000000000000" 
            
            # 1. Create Channel
            deal_name = f"Deal-{subject[:10].replace(' ', '-')}-{score}"
            channel_id = await graph_service.create_deal_channel(
                team_id=team_id,
                deal_name=deal_name,
                description=f"Deal Room for {subject}"
            )
            
            # 2. Post Adaptive Card
            card = {
                "type": "AdaptiveCard",
                "body": [
                    {
                        "type": "TextBlock",
                        "size": "Medium",
                        "weight": "Bolder",
                        "text": f"🚀 NEW DEAL ALERT: {subject}"
                    },
                    {
                        "type": "FactSet",
                        "facts": [
                            { "title": "Score", "value": str(score) },
                            { "title": "Amount", "value": extracted_data.get("amount", "Unknown") },
                            { "title": "DSCR", "value": extracted_data.get("dscr", "N/A") }
                        ]
                    },
                    {
                        "type": "TextBlock",
                        "text": "This deal has passed initial pre-screening.",
                        "wrap": True
                    }
                ],
                "actions": [
                    {
                        "type": "Action.OpenUrl",
                        "title": "View in Console",
                        "url": "https://ampac-a325f.web.app"
                    }
                ],
                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                "version": "1.2"
            }
            
            await graph_service.post_adaptive_card(team_id, channel_id, card)
            findings.append(f"📢 Deal Room Created: #{deal_name}")
            
        except Exception as e:
            print(f"Failed to trigger Teams automation: {e}")

    return DealAnalysisResponse(
        is_eligible=is_eligible,
        score=score,
        findings=findings,
        extracted_data=extracted_data
    )

class CreateAppRequest(BaseModel):
    borrower_email: str
    business_name: str
    amount: str

@router.post("/create_application")
async def create_application(request: CreateAppRequest):
    # Mock creation logic
    # app_id = await application_service.create(...)
    return {
        "status": "success",
        "application_id": "APP-2023-001",
        "console_url": "https://ampac-console.com/apps/APP-2023-001"
    }

@router.post("/draft_email", response_model=DraftEmailResponse)
async def draft_email(request: DraftEmailRequest):
    # 1. Fetch context (mock for now, would fetch from DB)
    context = f"Application ID: {request.appId}. Intent: {request.intent}. Notes: {request.extraNotes}"
    
    # 2. Use LLM to draft
    prompt = f"Draft a {request.tone} email for a loan application. Context: {context}"
    draft_text = await llm_service.generate_text(prompt)
    
    # Simple parsing (in reality, LLM should return JSON or structured output)
    subject = f"Update regarding Application #{request.appId}"
    body = draft_text
    
    return DraftEmailResponse(subject=subject, body=body)

@router.post("/propose_meeting", response_model=ProposeMeetingResponse)
async def propose_meeting(request: ProposeMeetingRequest):
    # 1. Find slots (mock logic calling graph service)
    # In real implementation:
    # slots = await graph_service.find_meeting_times(request.staffEmails, request.borrowerEmail)
    slots = ["2023-11-01T10:00:00Z", "2023-11-01T14:00:00Z"]
    
    # 2. Draft invite
    draft_body = f"Hi,\n\nI'd like to propose the following times for a quick sync:\n"
    for slot in slots:
        draft_body += f"- {slot}\n"
    draft_body += "\nLet me know what works."
    
    return ProposeMeetingResponse(slots=slots, draftBody=draft_body)
