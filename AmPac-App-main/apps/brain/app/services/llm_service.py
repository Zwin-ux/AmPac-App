from app.services.groq_service import groq_service
from app.core.config import get_settings

settings = get_settings()

class LLMService:
    def __init__(self):
        # Use Groq service for all AI interactions
        self.groq = groq_service
        print("🚀 LLM Service initialized with Groq API")

    async def generate_response(self, prompt: str, system_prompt: str = None) -> str:
        """
        Generate AI response using Groq API with intelligent fallback.
        
        Args:
            prompt: User input prompt
            system_prompt: Optional system instruction
            
        Returns:
            Generated response text
        """
        try:
            # Use Groq service for response generation
            response = await self.groq.generate_response(prompt, system_prompt)
            return response
            
        except Exception as e:
            print(f"❌ LLM Service error: {str(e)}")
            # Return a generic fallback response
            return "I'm experiencing technical difficulties. Please try again in a moment, or contact our support team for immediate assistance."

llm_service = LLMService()
