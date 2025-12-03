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

    async def generate_response(self, prompt: str) -> str:
        if not self.llm:
            return "OpenAI API Key not configured. Please set OPENAI_API_KEY in .env."
        
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
