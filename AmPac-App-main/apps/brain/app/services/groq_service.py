import asyncio
import json
import time
from typing import List, Dict, Any, Optional
import httpx
from groq import Groq
from app.core.config import get_settings

settings = get_settings()

class GroqService:
    """
    Groq API integration service for AI chat completions.
    Provides async interface with error handling and fallback responses.
    """
    
    def __init__(self, api_key: Optional[str] = None, model: str = "llama3-8b-8192"):
        self.api_key = api_key or settings.GROQ_API_KEY
        self.model = model or settings.GROQ_MODEL
        self.timeout = 10  # 10 second timeout
        self.base_url = "https://api.groq.com/openai/v1"
        
        # Initialize async HTTP client for direct API calls
        self.http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(self.timeout),
            headers={
                "Authorization": f"Bearer {self.api_key}" if self.api_key else "",
                "Content-Type": "application/json"
            }
        )
        
        # Initialize Groq client if API key is available (fallback to sync client)
        if self.api_key:
            self.client = Groq(api_key=self.api_key)
        else:
            self.client = None
            print("⚠️ Groq API Key missing. Fallback mode enabled.")
    
    async def chat_completion(self, messages: List[Dict[str, str]]) -> str:
        """
        Generate chat completion using Groq API with async HTTP client.
        
        Args:
            messages: List of message dicts with 'role' and 'content' keys
            
        Returns:
            Generated response text
        """
        if not self.api_key:
            return self._get_fallback_response(messages)
        
        try:
            # Use async HTTP client for better performance
            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": 0.1,
                "max_tokens": 1024,
                "stream": False
            }
            
            start_time = time.time()
            response = await self.http_client.post(
                f"{self.base_url}/chat/completions",
                json=payload
            )
            
            if response.status_code == 200:
                result = response.json()
                processing_time = (time.time() - start_time) * 1000
                print(f"✅ Groq API response received in {processing_time:.2f}ms")
                
                if result.get("choices") and len(result["choices"]) > 0:
                    return result["choices"][0]["message"]["content"]
                else:
                    print("⚠️ No choices in Groq API response")
                    return self._get_fallback_response(messages)
            
            elif response.status_code == 429:
                print("⚠️ Groq API rate limit exceeded, using fallback")
                return self._get_fallback_response(messages)
            
            elif response.status_code == 401:
                print("❌ Groq API authentication failed")
                return self._get_fallback_response(messages)
            
            else:
                print(f"❌ Groq API error: {response.status_code} - {response.text}")
                return self._get_fallback_response(messages)
                
        except httpx.TimeoutException:
            print(f"⏰ Groq API timeout after {self.timeout}s, using fallback")
            return self._get_fallback_response(messages)
            
        except httpx.RequestError as e:
            print(f"🌐 Groq API network error: {str(e)}, using fallback")
            return self._get_fallback_response(messages)
            
        except Exception as e:
            print(f"❌ Unexpected Groq API error: {str(e)}, using fallback")
            return self._get_fallback_response(messages)
    
    async def generate_response(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """
        Generate a response for a single prompt with optional system message.
        
        Args:
            prompt: User input prompt
            system_prompt: Optional system instruction
            
        Returns:
            Generated response text
        """
        messages = []
        
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        messages.append({"role": "user", "content": prompt})
        
        return await self.chat_completion(messages)
    
    async def health_check(self) -> bool:
        """
        Check if Groq API is available and responding.
        
        Returns:
            True if service is healthy, False otherwise
        """
        if not self.api_key:
            return False
        
        try:
            test_messages = [
                {"role": "user", "content": "Hello"}
            ]
            
            response = await self.chat_completion(test_messages)
            # Check if we got a real response (not fallback)
            return len(response) > 0 and "technical difficulties" not in response.lower()
            
        except Exception:
            return False
    
    async def close(self):
        """Close the HTTP client connection."""
        if self.http_client:
            await self.http_client.aclose()
    
    def _get_fallback_response(self, messages: List[Dict[str, str]]) -> str:
        """
        Generate intelligent fallback responses when Groq API is unavailable.
        Analyzes the conversation context and user message to provide context-aware responses.
        """
        if not messages:
            return "I'm currently experiencing technical difficulties. Please try again later."
        
        # Get the last user message for analysis
        last_message = ""
        conversation_context = []
        
        for msg in messages:
            if msg.get("role") == "user":
                conversation_context.append(msg.get("content", ""))
                last_message = msg.get("content", "").lower()
            elif msg.get("role") == "system":
                # Extract context from system messages
                system_content = msg.get("content", "").lower()
                if "application" in system_content:
                    conversation_context.append("application_context")
                elif "home" in system_content or "dashboard" in system_content:
                    conversation_context.append("home_context")
                elif "spaces" in system_content or "coworking" in system_content:
                    conversation_context.append("spaces_context")
        
        # Analyze conversation history for better context
        full_conversation = " ".join(conversation_context).lower()
        
        # Enhanced context-aware fallback responses with business loan focus
        
        # Loan Application Context
        if any(keyword in last_message for keyword in ["apply", "application", "loan", "financing", "sba", "borrow", "capital"]):
            if "sba" in last_message or "504" in last_message:
                return """I can help you with SBA 504 loans! These are excellent for real estate and equipment purchases:

• Up to 90% financing available
• Fixed rates for 10, 20, or 25-year terms
• Minimum $125,000 loan amount
• Owner-occupied commercial real estate required

To start your SBA 504 application, I'll need information about:
- Your business and industry
- The property or equipment you're purchasing
- Your down payment amount

<<<ACTION:{"type":"navigate","target":"Apply"}>>>"""
            
            elif "7a" in last_message or "working capital" in last_message:
                return """SBA 7(a) loans are perfect for working capital and business expansion:

• Up to $5 million loan amount
• Flexible use of funds (working capital, equipment, expansion)
• Competitive rates (typically Prime + 2-4%)
• Terms up to 25 years for real estate, 10 years for equipment

Ready to apply? I can guide you through the process step by step.

<<<ACTION:{"type":"navigate","target":"Apply"}>>>"""
            
            else:
                return """I can help you explore AmPac's business financing options:

**SBA Loans Available:**
• SBA 504 - Real estate & equipment (up to 90% financing)
• SBA 7(a) - Working capital & expansion (up to $5M)

**Quick Application Process:**
1. Complete our online pre-qualification
2. Upload required documents
3. Get a decision within 48-72 hours

What type of financing are you looking for?

<<<ACTION:{"type":"navigate","target":"Apply"}>>>"""

        # Document Requirements Context
        elif any(keyword in last_message for keyword in ["document", "documents", "paperwork", "requirements", "need", "upload"]):
            if "sba" in full_conversation or "loan" in full_conversation:
                return """For SBA loan applications, you'll need these key documents:

**Business Documents:**
• Business tax returns (last 2-3 years)
• Financial statements (P&L, Balance Sheet)
• Business license & articles of incorporation
• Bank statements (last 3-6 months)

**Personal Documents (for owners 20%+):**
• Personal tax returns (last 2 years)
• Personal financial statement
• Valid ID

**Property-Specific (for SBA 504):**
• Purchase agreement or property details
• Environmental reports (if applicable)

I can help you organize these documents efficiently."""
            else:
                return """I can help you understand what documents you'll need. The requirements vary by loan type:

• **SBA 504 loans** - Focus on property and business financials
• **SBA 7(a) loans** - Emphasis on business operations and cash flow
• **Conventional loans** - Streamlined documentation

What type of financing are you considering? This will help me provide the exact document checklist."""

        # Rates and Terms Context
        elif any(keyword in last_message for keyword in ["rate", "rates", "interest", "terms", "payment", "cost"]):
            return """Current SBA loan rates are very competitive:

**SBA 504 Loans:**
• Fixed rates for 10, 20, or 25 years
• Currently around 6-8% (varies by term)
• No prepayment penalties after year 1

**SBA 7(a) Loans:**
• Variable or fixed rate options
• Prime + 2-4% margin (typically)
• Terms up to 25 years for real estate

**Factors affecting your rate:**
- Loan amount and term
- Business creditworthiness
- Down payment amount
- Current market conditions

Want a personalized rate quote? I can connect you with our lending team."""

        # Eligibility and Qualification Context
        elif any(keyword in last_message for keyword in ["eligibility", "qualify", "requirements", "eligible", "approval"]):
            return """SBA loan eligibility requirements:

**Business Criteria:**
• For-profit business operating in the US
• Meet SBA size standards for your industry
• Demonstrate ability to repay
• Use funds for eligible business purposes

**Owner Requirements:**
• Invest equity in the business (typically 10-15%)
• Good personal and business credit
• Management experience in the industry

**Common Qualifying Factors:**
- 2+ years in business (preferred)
- Strong cash flow and profitability
- Collateral available (especially for larger loans)

Most businesses qualify! Let's review your specific situation."""

        # Spaces and Coworking Context
        elif any(keyword in last_message for keyword in ["space", "spaces", "coworking", "office", "meeting", "room"]):
            return """AmPac's coworking spaces are perfect for growing businesses:

**Flexible Options:**
• Hourly meeting rooms ($25-50/hour)
• Daily office space ($50-75/day)
• Monthly memberships ($200-500/month)
• Dedicated desks and private offices available

**Amenities Included:**
- High-speed internet and printing
- Professional meeting rooms with A/V
- Kitchen facilities and coffee
- Networking events with other entrepreneurs

**Member Benefits:**
- Discounted rates on all services
- Priority booking for events
- Access to business mentorship

Perfect for client meetings, focused work, or networking!"""

        # Network and Community Context
        elif any(keyword in last_message for keyword in ["network", "networking", "connect", "community", "events", "mentor"]):
            return """Join AmPac's thriving business community:

**Networking Opportunities:**
• Monthly entrepreneur meetups
• Industry-specific networking events
• Lunch & learns with business experts
• Quarterly business showcase events

**Community Benefits:**
- Connect with fellow business owners
- Access to mentors and advisors
- Potential partnership opportunities
- Referral network for services

**Upcoming Events:**
- Small Business Success Workshop (next week)
- SBA Loan Information Session (monthly)
- Entrepreneur Coffee Hours (weekly)

Building relationships is key to business success. What type of connections are you looking to make?"""

        # Status and Tracking Context
        elif any(keyword in last_message for keyword in ["status", "track", "progress", "update", "application status"]):
            return """I can help you track your application status:

**Current Application Stages:**
1. **Pre-qualification** - Initial review (24-48 hours)
2. **Documentation** - Document collection and review
3. **Underwriting** - Detailed financial analysis
4. **SBA Review** - Government approval process
5. **Closing** - Final approval and funding

**Stay Updated:**
- Check your dashboard for real-time updates
- Receive email notifications at each stage
- Direct communication with your loan officer

Need help with a specific application? I can connect you with your assigned loan officer for detailed updates."""

        # Payment and Financial Context
        elif any(keyword in last_message for keyword in ["payment", "pay", "fee", "cost", "closing", "down payment"]):
            return """Understanding SBA loan costs and payments:

**Typical Costs:**
• SBA guarantee fee (0.5-3.75% of loan amount)
• Lender processing fee (varies by lender)
• Third-party costs (appraisal, environmental, legal)
• No application fees at AmPac!

**Down Payment Requirements:**
- SBA 504: 10% down (15% for special use properties)
- SBA 7(a): 10-15% down (varies by use)

**Monthly Payments:**
- Fixed or variable rate options
- Terms up to 25 years for real estate
- Payment calculators available in your dashboard

Want to estimate your monthly payment? I can help you run the numbers."""

        # General Business Guidance
        elif any(keyword in last_message for keyword in ["business", "start", "grow", "expand", "help", "advice"]):
            return """I'm here to help with all aspects of your business growth:

**AmPac Services:**
• SBA and conventional business loans
• Business consulting and mentorship
• Coworking spaces and meeting rooms
• Networking and community events

**Business Growth Support:**
- Financial planning assistance
- Market analysis and business planning
- Connection to professional services
- Ongoing business coaching

**Getting Started:**
1. Tell me about your business goals
2. Explore financing options that fit
3. Connect with our expert team
4. Access our business community

What specific area of your business would you like to focus on?"""

        # Error or Technical Issues
        elif any(keyword in last_message for keyword in ["error", "problem", "issue", "bug", "not working", "broken"]):
            return """I apologize for any technical difficulties. Here's how I can help:

**Common Solutions:**
• Try refreshing the page or app
• Check your internet connection
• Clear your browser cache
• Update to the latest app version

**Still Having Issues?**
- Contact our support team: support@ampacbc.com
- Call us directly: (555) 123-4567
- Use the chat support in your dashboard

**In the Meantime:**
I can still help answer questions about loans, applications, or our services. What would you like to know?"""

        # Default Comprehensive Response
        else:
            return """I'm AmPac's AI assistant, ready to help with your business financing needs:

**I Can Help With:**
• SBA 504 & 7(a) loan applications
• Document requirements and preparation
• Rate quotes and payment calculations
• Application status and tracking
• Coworking space reservations
• Business networking opportunities

**Popular Questions:**
- "How do I apply for an SBA loan?"
- "What documents do I need?"
- "What are current interest rates?"
- "Do I qualify for financing?"

I'm currently experiencing some technical difficulties with my advanced features, but I can still provide detailed information about our services.

How can I help you grow your business today?"""

# Create a singleton instance
groq_service = GroqService()