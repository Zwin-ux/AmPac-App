from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import get_settings
import asyncio
from app.services.sync_service import SyncService
from fastapi.staticfiles import StaticFiles
from app.api.routers import chat, documents, agents, knowledge, ventures, calendar, assistant, health, support
from app.core.logging_config import init_logging
from app.core.middleware import RequestContextMiddleware, RateLimitingMiddleware, APIKeyMiddleware
from app.core.sentry import init_sentry
import logging

logger = logging.getLogger(__name__)

settings = get_settings()
init_logging()

# Initialize Sentry for error tracking
init_sentry()

# Log startup configuration
logger.info(f"🧠 Starting AmPac Brain in {settings.ENV} mode")
if settings.AUTH_DISABLED:
    logger.warning("⚠️  AUTH_DISABLED=True - Authentication is bypassed!")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Global exception handler - prevents leaking internal error details
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    # In development, return more details
    if settings.ENV == "development":
        return JSONResponse(
            status_code=500,
            content={"detail": str(exc), "type": type(exc).__name__}
        )
    
    # In production, return generic error
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again later."}
    )

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_CORS_ORIGINS + [
        "https://outlook.office.com",
        "https://outlook.office365.com",
        "https://teams.microsoft.com",
        "https://*.office.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for M365
app.mount("/static", StaticFiles(directory="app/static"), name="static")

app.add_middleware(RequestContextMiddleware)
app.add_middleware(RateLimitingMiddleware)

# API Key middleware (only active if BRAIN_API_KEY is set)
if settings.BRAIN_API_KEY:
    app.add_middleware(APIKeyMiddleware, api_key=settings.BRAIN_API_KEY)
    logger.info("🔐 API Key authentication enabled")

@app.on_event("startup")
async def startup_event():
    # Start the background sync service unless explicitly skipped (useful for local smoke tests without Firestore)
    if settings.SKIP_SYNC_LOOP:
        print("SKIP_SYNC_LOOP enabled; not starting SyncService.")
    else:
        sync_service = SyncService()
        asyncio.create_task(sync_service.start_sync_loop())

@app.get("/")
async def root():
    return {"message": "Welcome to AmPac Brain 🧠", "status": "operational"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

app.include_router(chat.router, prefix=f"{settings.API_V1_STR}/chat", tags=["chat"])
app.include_router(documents.router, prefix=f"{settings.API_V1_STR}/documents", tags=["documents"])
app.include_router(agents.router, prefix=f"{settings.API_V1_STR}/agents", tags=["agents"])
app.include_router(knowledge.router, prefix=f"{settings.API_V1_STR}/knowledge", tags=["knowledge"])
app.include_router(ventures.router, prefix=f"{settings.API_V1_STR}/ventures", tags=["ventures"])
app.include_router(calendar.router, prefix=f"{settings.API_V1_STR}/calendar", tags=["calendar"])
app.include_router(assistant.router, prefix=f"{settings.API_V1_STR}/assistant", tags=["assistant"])
app.include_router(support.router, prefix=f"{settings.API_V1_STR}/support", tags=["support"])

from app.api.routers import m365, applications, stripe
app.include_router(m365.router, prefix=f"{settings.API_V1_STR}/m365", tags=["m365"])
app.include_router(applications.router, prefix=f"{settings.API_V1_STR}/applications", tags=["applications"])
app.include_router(stripe.router, prefix=f"{settings.API_V1_STR}/stripe", tags=["stripe"])
app.include_router(health.router, prefix=f"{settings.API_V1_STR}/health", tags=["health"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
