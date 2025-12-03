from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
import asyncio
from app.services.sync_service import SyncService
from fastapi.staticfiles import StaticFiles
from app.api.routers import chat, website, documents, agents, knowledge, ventures, calendar, assistant

settings = get_settings()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*",
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

app.include_router(chat.router, prefix=f"{settings.API_V1_STR}/chat", tags=["chat"])
app.include_router(website.router, prefix=f"{settings.API_V1_STR}/website", tags=["website"])
app.include_router(documents.router, prefix=f"{settings.API_V1_STR}/documents", tags=["documents"])
app.include_router(agents.router, prefix=f"{settings.API_V1_STR}/agents", tags=["agents"])
app.include_router(knowledge.router, prefix=f"{settings.API_V1_STR}/knowledge", tags=["knowledge"])
app.include_router(ventures.router, prefix=f"{settings.API_V1_STR}/ventures", tags=["ventures"])
app.include_router(calendar.router, prefix=f"{settings.API_V1_STR}/calendar", tags=["calendar"])
app.include_router(assistant.router, prefix=f"{settings.API_V1_STR}/assistant", tags=["assistant"])

from app.api.routers import m365, applications
app.include_router(m365.router, prefix=f"{settings.API_V1_STR}/m365", tags=["m365"])
app.include_router(applications.router, prefix=f"{settings.API_V1_STR}/applications", tags=["applications"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
