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
            response = await self.llm.ainvoke(prompt)
            return response.content
        except Exception as e:
            return f"Error interacting with LLM: {str(e)}"

llm_service = LLMService()
