from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from app.services.website_service import website_service
from app.core.firebase_auth import AuthContext, get_current_user
from typing import Literal

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
    template: str | None = None
    palette: str | None = None
    font: str | None = None
    contactCta: str | None = None
    social: dict | None = None

class WebsiteGenerationResponse(BaseModel):
    html: str
    sections: dict
    theme: dict | None = None

class WebsitePublishRequest(BaseModel):
    businessId: str
    ownerId: str
    htmlContent: str
    sections: dict | None = None
    template: str | None = None
    palette: str | None = None
    font: str | None = None
    contactCta: str | None = None
    social: dict | None = None
    slug: str | None = None

class WebsitePublishResponse(BaseModel):
    url: str
    status: str
    slug: str | None = None

class SectionRegenerationRequest(BaseModel):
    sectionName: str
    currentData: dict
    instruction: str
    allSections: dict

@router.post("/generate", response_model=WebsiteGenerationResponse)
async def generate_website(
    request: WebsiteGenerationRequest,
    user: AuthContext = Depends(get_current_user)
):
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
async def publish_website(request: WebsitePublishRequest, user: AuthContext = Depends(get_current_user)):
    """
    Publishes the generated website to Firestore.
    """
    try:
        result = await website_service.publish_website(
            business_id=request.businessId,
            html_content=request.htmlContent,
            owner_id=user.uid,
            sections=request.sections,
            template=request.template,
            palette=request.palette,
            font=request.font,
            contact_cta=request.contactCta,
            social=request.social,
            slug=request.slug,
        )
        return WebsitePublishResponse(**result)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sites/{slug}", response_class=HTMLResponse)
async def get_published_site(slug: str):
    """
    Serves the published website HTML by slug.
    """
    html_content = await website_service.get_website_by_slug(slug)
    if not html_content:
        raise HTTPException(status_code=404, detail="Website not found")
    return html_content

class ContactFormRequest(BaseModel):
    siteId: str | None = None
    slug: str | None = None
    name: str
    email: str
    message: str

@router.post("/contact")
async def submit_contact(request: ContactFormRequest):
    """
    Saves a lead for a published site.
    """
    try:
        saved = await website_service.save_lead(
            site_id=request.siteId,
            slug=request.slug,
            name=request.name,
            email=request.email,
            message=request.message,
        )
        return {"status": "ok", "leadId": saved}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class UploadRequest(BaseModel):
    siteId: str | None = None
    slug: str | None = None
    type: Literal['logo', 'hero', 'gallery']
    fileName: str
    contentType: str

@router.post("/upload")
async def upload_asset(request: UploadRequest, user: AuthContext = Depends(get_current_user)):
    """
    Returns a signed URL for uploading assets (logo/hero/gallery) to storage and stores the public URL on the site.
    """
    try:
        result = await website_service.generate_upload_url(
            site_id=request.siteId,
            slug=request.slug,
            asset_type=request.type,
            file_name=request.fileName,
            content_type=request.contentType,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/regenerate-section")
async def regenerate_section(request: SectionRegenerationRequest, user: AuthContext = Depends(get_current_user)):
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
