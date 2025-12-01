from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
import asyncio
from app.services.sync_service import SyncService

settings = get_settings()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Start the background sync service
    sync_service = SyncService()
    asyncio.create_task(sync_service.start_sync_loop())

@app.get("/")
async def root():
    return {"message": "Welcome to AmPac Brain 🧠", "status": "operational"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

from app.api.routers import chat, website, documents, agents, knowledge, ventures

app.include_router(chat.router, prefix=f"{settings.API_V1_STR}/chat", tags=["chat"])
app.include_router(website.router, prefix=f"{settings.API_V1_STR}/website", tags=["website"])
app.include_router(documents.router, prefix=f"{settings.API_V1_STR}/documents", tags=["documents"])
app.include_router(agents.router, prefix=f"{settings.API_V1_STR}/agents", tags=["agents"])
app.include_router(knowledge.router, prefix=f"{settings.API_V1_STR}/knowledge", tags=["knowledge"])
app.include_router(ventures.router, prefix=f"{settings.API_V1_STR}/ventures", tags=["ventures"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
