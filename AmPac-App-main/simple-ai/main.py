#!/usr/bin/env python3
"""
Simple AI Service for AmPac Mobile App
Just handles AI chat completions - nothing else!
Independent service that doesn't rely on the main Brain Service.
"""

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import httpx
import uvicorn
import logging
import time
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Service metrics
service_metrics = {
    "start_time": datetime.utcnow().isoformat(),
    "requests_processed": 0,
    "errors_count": 0,
    "groq_api_calls": 0,
    "fallback_responses": 0
}

# Simple configuration - independent from Brain Service
API_KEY = os.getenv("SIMPLE_AI_API_KEY", "9dbUrc3VKS8Xr2Ho2Q4tZQ427-LuqT2cJcDMilKqw-Y")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "[REDACTED]")
PORT = int(os.getenv("PORT", 8080))
HOST = os.getenv("HOST", "0.0.0.0")

app = FastAPI(
    title="Simple AI Service", 
    version="1.0.0",
    description="Independent AI service for AmPac mobile app - no dependencies on Brain Service"
)

# Enable CORS for mobile app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple data models
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    context: Optional[dict] = {}
    stream: Optional[bool] = False

class ChatResponse(BaseModel):
    response: str
    model: str = "groq/llama3-8b-8192"

class HealthResponse(BaseModel):
    status: str
    service: str
    timestamp: str
    uptime_seconds: float
    groq_api_status: str

class MetricsResponse(BaseModel):
    service_info: Dict[str, Any]
    metrics: Dict[str, Any]
    groq_api_health: Dict[str, Any]

# Simple API key check
def verify_api_key(request_api_key: str) -> bool:
    return request_api_key == API_KEY

async def check_groq_api_health() -> Dict[str, Any]:
    """Check if Groq API is accessible"""
    try:
        async with httpx.AsyncClient() as client:
            # Simple test request to Groq API
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama3-8b-8192",
                    "messages": [{"role": "user", "content": "test"}],
                    "max_tokens": 1
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                return {"status": "healthy", "response_time_ms": response.elapsed.total_seconds() * 1000}
            else:
                return {"status": "unhealthy", "error": f"HTTP {response.status_code}"}
                
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

@app.get("/")
async def root():
    return {"message": "Simple AI Service", "status": "running", "timestamp": datetime.utcnow().isoformat()}

@app.get("/health", response_model=HealthResponse)
async def health():
    """Enhanced health check endpoint with Groq API status"""
    start_time = datetime.fromisoformat(service_metrics["start_time"])
    uptime = (datetime.utcnow() - start_time).total_seconds()
    
    # Quick Groq API health check
    groq_health = await check_groq_api_health()
    groq_status = groq_health["status"]
    
    return HealthResponse(
        status="healthy" if groq_status == "healthy" else "degraded",
        service="simple-ai",
        timestamp=datetime.utcnow().isoformat(),
        uptime_seconds=uptime,
        groq_api_status=groq_status
    )

@app.get("/metrics", response_model=MetricsResponse)
async def metrics():
    """Service monitoring and metrics endpoint"""
    start_time = datetime.fromisoformat(service_metrics["start_time"])
    uptime = (datetime.utcnow() - start_time).total_seconds()
    
    # Get Groq API health
    groq_health = await check_groq_api_health()
    
    return MetricsResponse(
        service_info={
            "name": "Simple AI Service",
            "version": "1.0.0",
            "start_time": service_metrics["start_time"],
            "uptime_seconds": uptime,
            "environment": {
                "port": PORT,
                "host": HOST,
                "groq_api_configured": bool(GROQ_API_KEY)
            }
        },
        metrics={
            "requests_processed": service_metrics["requests_processed"],
            "errors_count": service_metrics["errors_count"],
            "groq_api_calls": service_metrics["groq_api_calls"],
            "fallback_responses": service_metrics["fallback_responses"],
            "success_rate": (
                (service_metrics["requests_processed"] - service_metrics["errors_count"]) / 
                max(service_metrics["requests_processed"], 1)
            ) * 100
        },
        groq_api_health=groq_health
    )

@app.get("/ready")
async def readiness():
    """Readiness probe for deployment orchestration"""
    groq_health = await check_groq_api_health()
    
    if groq_health["status"] == "healthy":
        return {"status": "ready", "timestamp": datetime.utcnow().isoformat()}
    else:
        raise HTTPException(
            status_code=503, 
            detail={"status": "not_ready", "reason": "Groq API unavailable"}
        )

@app.post("/api/v1/chat/completions", response_model=ChatResponse)
async def chat_completions(
    request: ChatRequest, 
    x_api_key: Optional[str] = Header(None, alias="X-API-Key")
):
    # Update metrics
    service_metrics["requests_processed"] += 1
    
    # Check API key
    if not x_api_key or not verify_api_key(x_api_key):
        logger.warning("Invalid API key attempt")
        service_metrics["errors_count"] += 1
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    logger.info(f"Processing chat request with {len(request.messages)} messages")
    
    try:
        # Call Groq API - independent of Brain Service
        service_metrics["groq_api_calls"] += 1
        
        async with httpx.AsyncClient() as client:
            groq_response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama3-8b-8192",
                    "messages": [{"role": msg.role, "content": msg.content} for msg in request.messages],
                    "max_tokens": 1000,
                    "temperature": 0.7
                },
                timeout=30.0
            )
            
            if groq_response.status_code == 200:
                groq_data = groq_response.json()
                ai_response = groq_data["choices"][0]["message"]["content"]
                logger.info("Successfully generated AI response via Groq")
                return ChatResponse(response=ai_response)
            else:
                logger.warning(f"Groq API error: {groq_response.status_code}")
                service_metrics["fallback_responses"] += 1
                # Fallback response - service remains independent
                return ChatResponse(
                    response="I'm here to help with your business loan questions. What would you like to know about SBA loans, application requirements, or funding options?"
                )
                
    except Exception as e:
        logger.error(f"AI Error: {e}")
        service_metrics["errors_count"] += 1
        service_metrics["fallback_responses"] += 1
        # Always return a helpful fallback - no dependency on other services
        return ChatResponse(
            response="I'm here to help with your business loan questions. What would you like to know about SBA loans, application requirements, or funding options?"
        )

if __name__ == "__main__":
    logger.info(f"🤖 Starting Simple AI Service on {HOST}:{PORT}")
    logger.info("Service is independent - no Brain Service dependencies")
    uvicorn.run(app, host=HOST, port=PORT)