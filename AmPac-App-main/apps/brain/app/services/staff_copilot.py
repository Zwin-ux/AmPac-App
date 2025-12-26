from app.services.llm_service import llm_service
from app.services.graph_service import graph_service
import asyncio

class StaffCopilotAgent:
    def __init__(self):
        pass

    async def handle_query(self, query: str, context: dict = None) -> str:
        """
        Handles a natural language query from a staff member.
        Tools available:
        - Graph API (Email, Calendar)
        - Firestore (Loan Applications)
        """
        print(f"[StaffCopilot] Query: {query}, Context: {context}")
        
        # 1. Construct Prompt with Context
        user_context = f"User: {context.get('user_name', 'Staff')} ({context.get('role', 'unknown')})"
        current_page = context.get('page', 'dashboard')
        
        prompt = f"""
        You are an AI Copilot for AmPac Business Capital staff.
        Your goal is to assist with loan underwriting, communication, and productivity.
        
        Context:
        - {user_context}
        - Current Page: {current_page}
        
        User Query: "{query}"
        
        Available Tools (simulated for now):
        - [EMAIL_DRAFT]: Draft an email.
        - [SUMMARIZE_LOAN]: Summarize a loan application.
        - [SEARCH_POLICY]: Search SBA SOP guidelines.
        
        If the user asks to draft an email, output the draft clearly.
        If the user asks for a summary, provide a concise summary.
        
        Respond directly to the user.
        """

        try:
            response = await llm_service.generate_response(prompt)
            return response
        except Exception as e:
            return f"Error processing request: {str(e)}"

staff_copilot_agent = StaffCopilotAgent()
