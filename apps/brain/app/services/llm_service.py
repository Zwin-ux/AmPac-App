from langchain_openai import ChatOpenAI
from app.core.config import get_settings

settings = get_settings()

class LLMService:
    def __init__(self):
        # Initialize only if API key is present to avoid crash on startup
        if settings.OPENAI_API_KEY:
            self.llm = ChatOpenAI(
                model=settings.OPENAI_MODEL,
                api_key=settings.OPENAI_API_KEY,
                temperature=0
            )
        else:
            self.llm = None
            print("⚠️ OpenAI API Key missing. Using Mock LLM mode.")

    async def generate_response(self, prompt: str) -> str:
        if not self.llm:
            # MOCK RESPONSES based on keywords
            prompt_lower = prompt.lower()
            if "apply" in prompt_lower or "loan" in prompt_lower:
                return "I can help you with that application. Let's get started.\n<<<ACTION:{\"type\":\"navigate\",\"target\":\"Apply\"}>>>"
            elif "email" in prompt_lower:
                return "I've drafted an email to the borrower requesting the missing documents."
            elif "ltv" in prompt_lower:
                return "For SBA 504 loans, the maximum LTV is typically 90%."
            else:
                return "I am the AmPac Brain (Mock Mode). I can help with loans, policies, and emails."
        
        try:
            # Construct a prompt with system instructions
            system_instruction = """
            You are the AmPac Brain, an intelligent assistant for AmPac Business Capital.
            Your goal is to help users with loan applications and business financing.

            CAPABILITIES:
            - If the user expresses a clear intent to "apply for a loan", "start an application", or "get financing", you MUST include the following action tag at the end of your response:
              <<<ACTION:{"type":"navigate","target":"Apply"}>>>
            
            - Keep your responses concise, professional, and helpful.
            - Do not hallucinate loan terms.
            """
            
            full_prompt = f"{system_instruction}\n\nUser: {prompt}\nAssistant:"
            
            response = await self.llm.ainvoke(full_prompt)
            return response.content
        except Exception as e:
            return f"Error interacting with LLM: {str(e)}"

llm_service = LLMService()
