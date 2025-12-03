from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.website_service import website_service

router = APIRouter()

class WebsiteGenerationRequest(BaseModel):
    name: str
    industry: str
    zip: str
    description: str
    phone: str | None = None
    email: str | None = None
    hasBusinessPlan: bool = False
    ownerName: str | None = None

class WebsiteGenerationResponse(BaseModel):
    html: str
    sections: dict

class WebsitePublishRequest(BaseModel):
    businessId: str
    ownerId: str
    htmlContent: str
    sections: dict | None = None

class WebsitePublishResponse(BaseModel):
    url: str
    status: str

class SectionRegenerationRequest(BaseModel):
    sectionName: str
    currentData: dict
    instruction: str
    allSections: dict

@router.post("/generate", response_model=WebsiteGenerationResponse)
async def generate_website(request: WebsiteGenerationRequest):
    """
    Generates a landing page based on business details.
    """
    try:
        # Convert Pydantic model to dict
        data = request.model_dump()
        result = await website_service.generate_website(data)
        return WebsiteGenerationResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/publish", response_model=WebsitePublishResponse)
async def publish_website(request: WebsitePublishRequest):
    """
    Publishes the generated website to Firestore.
    """
    try:
        result = await website_service.publish_website(
            business_id=request.businessId,
            html_content=request.htmlContent,
            owner_id=request.ownerId,
            sections=request.sections
        )
        return WebsitePublishResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/regenerate-section")
async def regenerate_section(request: SectionRegenerationRequest):
    """
    Regenerates a specific section of the website.
    """
    try:
        result = await website_service.regenerate_section(
            section_name=request.sectionName,
            current_data=request.currentData,
            instruction=request.instruction,
            all_sections=request.allSections
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
