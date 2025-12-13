import os
import json
from datetime import datetime
from app.services.llm_service import llm_service
from app.core.firebase import get_db, get_bucket
import re
from app.core.config import get_settings

class WebsiteService:
    def __init__(self):
        # In a real app, we might load these into memory or a vector DB
        self.template_dir = os.path.join(os.getcwd(), "data", "templates")
        settings = get_settings()
        self.api_base = os.getenv("CONTACT_API_BASE") or f"https://brain-service-952649324958.us-central1.run.app{settings.API_V1_STR}"

    def _read_template(self, filename: str) -> str:
        path = os.path.join(self.template_dir, filename)
        try:
            with open(path, "r", encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            return f"<!-- Template {filename} not found -->"

    def _render_html(
        self,
        sections_data: dict,
        business_name: str = "My Business",
        theme: dict | None = None
    ) -> str:
        """
        Assembles the HTML from templates and section data.
        """
        layout_tpl = self._read_template("layout_base.html")
        hero_tpl = self._read_template("hero_modern.html")
        services_tpl = self._read_template("services_list.html")
        contact_tpl = self._read_template("contact_simple.html")

        # Helper to fill a template with a dict
        def fill_template(tpl, data):
            for key, value in data.items():
                tpl = tpl.replace(f"{{{{ {key} }}}}", str(value))
            return tpl

        hero_html = fill_template(hero_tpl, sections_data.get("hero", {}))
        services_html = fill_template(services_tpl, sections_data.get("services", {}))
        contact_html = fill_template(contact_tpl, sections_data.get("contact", {}))

        # Combine into full HTML
        full_body = f"{hero_html}\n{services_html}\n{contact_html}"
        final_html = layout_tpl.replace("{{ content }}", full_body)
        final_html = final_html.replace("{{ business_name }}", business_name)
        final_html = final_html.replace("{{ contact_api_base }}", self.api_base)

        # Apply theme (palette, font)
        palette = theme or {}
        primary = palette.get("primary", "#0F172A")
        accent = palette.get("accent", "#22C55E")
        background = palette.get("background", "#F8FAFC")
        surface = palette.get("surface", "#FFFFFF")
        text = palette.get("text", "#0F172A")
        font_family = palette.get("font", "Inter, sans-serif")
        font_link = ""
        if "Playfair Display" in font_family:
            font_link = "<link href=\"https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap\" rel=\"stylesheet\">"
        elif "Nunito" in font_family:
            font_link = "<link href=\"https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap\" rel=\"stylesheet\">"

        style_block = f"""
        <style>
            :root {{
                --primary: {primary};
                --accent: {accent};
                --background: {background};
                --surface: {surface};
                --text: {text};
                --font-family: {font_family};
            }}
            body {{
                font-family: var(--font-family);
                background: var(--background);
                color: var(--text);
            }}
            a, .btn-primary {{
                color: var(--primary);
            }}
            .btn-primary {{
                background: var(--primary);
                color: white;
                padding: 12px 18px;
                border-radius: 8px;
                display: inline-block;
            }}
        </style>
        """
        head_injection = f"{font_link}{style_block}"
        final_html = final_html.replace("</head>", f"{head_injection}</head>", 1)
        return final_html

    async def generate_website(self, business_data: dict) -> dict:
        """
        Generates a structured JSON representation of the website using RAG.
        Returns a dict with 'html' (full page) and 'sections' (structured data).
        """
        
        # 1. Retrieval (RAG)
        # In a real system, we would query a vector DB for "Business Plan" or "Financials"
        # For now, we'll simulate retrieving key insights from the user's uploaded documents.
        
        # Mock retrieval of "Business Plan" insights
        retrieved_context = ""
        if business_data.get('hasBusinessPlan'):
            retrieved_context = f"""
            RETRIEVED DOCUMENT CONTEXT (Business Plan):
            - Mission: To provide high-quality, sustainable {business_data.get('industry')} solutions.
            - Target Audience: Local homeowners and small businesses in {business_data.get('zip')}.
            - Key Differentiator: 24/7 support and eco-friendly materials.
            - Founder Story: Started in 2020 by {business_data.get('ownerName', 'the founder')} after 10 years in the industry.
            """
        
        template_choice = business_data.get("template") or "local-hero"
        palette_choice = business_data.get("palette") or "modern"
        font_choice = business_data.get("font") or "sans"
        contact_cta = business_data.get("contactCta") or "Call"
        social = business_data.get("social") or {}

        palette_map = {
            "modern": {"primary": "#0F172A", "accent": "#22C55E", "background": "#F8FAFC", "surface": "#FFFFFF", "text": "#0F172A"},
            "sunrise": {"primary": "#7C3AED", "accent": "#F97316", "background": "#FFF7ED", "surface": "#FFFFFF", "text": "#1F172A"},
            "earth": {"primary": "#0B3C49", "accent": "#E3B448", "background": "#F5F1E9", "surface": "#FFFFFF", "text": "#0F172A"},
        }
        theme = palette_map.get(palette_choice, palette_map["modern"]) | {"font": "Inter, sans-serif" if font_choice == "sans" else ("'Playfair Display', serif" if font_choice == "serif" else "'Nunito', sans-serif")}

        hero_tpl = self._read_template("hero_modern.html")
        services_tpl = self._read_template("services_list.html")
        contact_tpl = self._read_template("contact_simple.html")

        # 2. Construct Prompt for JSON Output
        prompt = f"""
        You are an expert web developer and copywriter.
        
        CONTEXT:
        Business Name: {business_data.get('name', 'My Business')}
        Industry: {business_data.get('industry', 'General Business')}
        Location: {business_data.get('zip', 'Unknown')}
        Description/Vibe: {business_data.get('description', 'Professional and reliable.')}
        Phone: {business_data.get('phone', '')}
        Email: {business_data.get('email', '')}
        
        {retrieved_context}

        TASK:
        I have three HTML templates: Hero, Services, and Contact.

        TASK:
        I have three HTML templates: Hero, Services, and Contact.
        Your job is to generate the CONTENT for these templates in a structured JSON format.
        
        TEMPLATES (for reference on what fields are needed):
        --- HERO ---
        {hero_tpl}
        --- SERVICES ---
        {services_tpl}
        --- CONTACT ---
        {contact_tpl}

        OUTPUT FORMAT (JSON ONLY):
        {{
            "hero": {{
                "hero_headline": "...",
                "hero_subheadline": "...",
                "hero_description": "..."
            }},
            "services": {{
                "services_intro": "...",
                "service_1_title": "...",
                "service_1_desc": "...",
                "service_2_title": "...",
                "service_2_desc": "...",
                "service_3_title": "...",
                "service_3_desc": "..."
            }},
            "contact": {{
                "business_address": "...",
                "business_zip": "...",
                "business_phone": "...",
                "business_email": "...",
                "contact_cta": "{contact_cta}",
                "social_links": {json.dumps(social)}
            }}
        }}
        
        INSTRUCTIONS:
        - Be creative with the copy based on the business description.
        - Return ONLY valid JSON.
        """

        # 3. Generation
        response_text = await llm_service.generate_response(prompt)
        
        # Clean up markdown
        response_text = response_text.replace("```json", "").replace("```", "").strip()
        
        try:
            sections_data = json.loads(response_text)
        except (json.JSONDecodeError, Exception) as e:
            print(f"LLM generation failed ({str(e)}), using High-Fidelity Mock.")
            
            # High-Fidelity Mock Data
            sections_data = {
                "hero": {
                    "hero_headline": f"Elevate Your {business_data.get('industry', 'Business')}",
                    "hero_subheadline": "Professional solutions tailored to your needs.",
                    "hero_description": business_data.get('description', 'We provide top-tier services with a focus on quality and customer satisfaction.')
                },
                "services": {
                    "services_intro": "We offer a comprehensive range of services designed to help you succeed.",
                    "service_1_title": "Consultation",
                    "service_1_desc": "Expert advice to guide your strategic decisions.",
                    "service_2_title": "Implementation",
                    "service_2_desc": "Seamless execution of your custom plan.",
                    "service_3_title": "Support",
                    "service_3_desc": "Ongoing maintenance and 24/7 assistance."
                },
                "contact": {
                    "business_address": f"123 Market St, {business_data.get('zip', '90210')}",
                    "business_zip": business_data.get('zip', '90210'),
                    "business_phone": business_data.get('phone', '(555) 123-4567'),
                    "business_email": business_data.get('email', 'contact@business.com')
                }
            }

        # 4. Assembly
        final_html = self._render_html(sections_data, business_data.get('name', 'My Business'), theme)

        return {
            "html": final_html,
            "sections": sections_data,
            "theme": theme
        }

    async def regenerate_section(self, section_name: str, current_data: dict, instruction: str, all_sections: dict) -> dict:
        """
        Regenerates a specific section based on user instruction and returns updated HTML.
        """
        prompt = f"""
        You are an expert copywriter.
        
        TASK: Update the content for the '{section_name}' section of a website.
        
        CURRENT CONTENT (JSON):
        {json.dumps(current_data, indent=2)}
        
        USER INSTRUCTION:
        "{instruction}"
        
        OUTPUT:
        Return the updated JSON object for this section ONLY.
        Do not change the keys, only the values.
        Return ONLY valid JSON.
        """
        
        response_text = await llm_service.generate_response(prompt)
        response_text = response_text.replace("```json", "").replace("```", "").strip()
        
        try:
            new_section_data = json.loads(response_text)
            
            # Update the full sections object
            all_sections[section_name] = new_section_data
            
            # Re-render the full HTML
            # Note: We don't have the business name here easily, so we'll use a placeholder or try to extract it
            # For now, let's assume the client might want to pass it, or we default.
            # Actually, let's just use "My Business" or keep the placeholder if it was in the template.
            # But _render_html replaces {{ business_name }}.
            # Let's assume the client passes businessName in the request if needed, or we just use a generic one.
            # Ideally, we should store the business name in the sections or pass it.
            # Let's just use "My Business" for now to keep it simple, or update the signature.
            
            final_html = self._render_html(all_sections)
            
            return {
                "sectionData": new_section_data,
                "html": final_html
            }
            
        except json.JSONDecodeError:
            raise ValueError("Failed to regenerate section")

    async def publish_website(
        self,
        business_id: str,
        html_content: str,
        owner_id: str,
        sections: dict = None,
        template: str | None = None,
        palette: str | None = None,
        font: str | None = None,
        contact_cta: str | None = None,
        social: dict | None = None,
        slug: str | None = None,
    ) -> dict:
        """
        Saves the generated website to Firestore and returns the public URL.
        """
        db = get_db()
        
        # Create or update the website document
        website_ref = db.collection("websites").document(business_id)
        
        theme_meta = {
            "template": template,
            "palette": palette,
            "font": font,
            "contactCta": contact_cta,
            "social": social,
        }

        # slug generation (cheap and stable)
        def slugify(value: str) -> str:
            value = value.lower()
            value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
            return value or "site"

        site_slug = slug or slugify(business_id)

        now = datetime.utcnow()
        website_data = {
            "id": business_id,
            "ownerId": owner_id,
            "htmlContent": html_content,
            "sections": sections, # Store structured data for future edits
            "theme": theme_meta,
            "updatedAt": now,
            "isPublished": True,
            "slug": site_slug,
            "publishedSnapshot": {
                "htmlContent": html_content,
                "sections": sections,
                "theme": theme_meta,
                "publishedAt": now,
            },
        }
        
        doc = website_ref.get()
        if not doc.exists:
            website_data["createdAt"] = datetime.utcnow()
            website_data["visitCount"] = 0
        
        website_ref.set(website_data, merge=True)
        
        project_id = "ampac-a325f" # Updated to correct project ID
        region = "us-central1"
        public_url = f"https://{region}-{project_id}.cloudfunctions.net/serveWebsite?id={business_id}&slug={site_slug}"
        
        website_ref.update({"publicUrl": public_url})
        
        return {"url": public_url, "status": "published", "slug": site_slug}

    async def save_lead(self, site_id: str | None, slug: str | None, name: str, email: str, message: str) -> str:
        db = get_db()
        leads_ref = db.collection("website_leads")
        now = datetime.utcnow()
        doc_ref = leads_ref.document()
        doc_ref.set({
            "id": doc_ref.id,
            "siteId": site_id,
            "slug": slug,
            "name": name,
            "email": email,
            "message": message,
            "createdAt": now,
        })
        return doc_ref.id

    async def generate_upload_url(self, site_id: str | None, slug: str | None, asset_type: str, file_name: str, content_type: str):
        bucket = get_bucket()
        db = get_db()
        owner_or_site = site_id or slug or "unknown"
        path = f"websites/{owner_or_site}/{asset_type}/{file_name}"
        blob = bucket.blob(path)
        upload_url = blob.generate_signed_url(
            version="v4",
            expiration=3600,
            method="PUT",
            content_type=content_type,
        )
        public_url = f"https://storage.googleapis.com/{bucket.name}/{path}"

        # Store reference on site doc if available
        if site_id:
            website_ref = db.collection("websites").document(site_id)
            update_data = {
                "assets": {
                    "logoUrl": public_url if asset_type == "logo" else None,
                    "heroUrl": public_url if asset_type == "hero" else None,
                    "gallery": [public_url] if asset_type == "gallery" else None,
                },
                "updatedAt": datetime.utcnow(),
            }
            # Merge behavior: only set relevant fields
            website_ref.set(update_data, merge=True)

        return {"uploadUrl": upload_url, "publicUrl": public_url, "path": path}

website_service = WebsiteService()
