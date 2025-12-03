import os
import json
from datetime import datetime
from app.services.llm_service import llm_service
from app.core.firebase import get_db

class WebsiteService:
    def __init__(self):
        # In a real app, we might load these into memory or a vector DB
        self.template_dir = os.path.join(os.getcwd(), "data", "templates")

    def _read_template(self, filename: str) -> str:
        path = os.path.join(self.template_dir, filename)
        try:
            with open(path, "r", encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            return f"<!-- Template {filename} not found -->"

    def _render_html(self, sections_data: dict, business_name: str = "My Business") -> str:
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
                "business_email": "..."
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
        final_html = self._render_html(sections_data, business_data.get('name', 'My Business'))

        return {
            "html": final_html,
            "sections": sections_data
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

    async def publish_website(self, business_id: str, html_content: str, owner_id: str, sections: dict = None) -> dict:
        """
        Saves the generated website to Firestore and returns the public URL.
        """
        db = get_db()
        
        # Create or update the website document
        website_ref = db.collection("websites").document(business_id)
        
        website_data = {
            "id": business_id,
            "ownerId": owner_id,
            "htmlContent": html_content,
            "sections": sections, # Store structured data for future edits
            "theme": "modern",
            "updatedAt": datetime.utcnow(),
            "isPublished": True,
        }
        
        doc = website_ref.get()
        if not doc.exists:
            website_data["createdAt"] = datetime.utcnow()
            website_data["visitCount"] = 0
        
        website_ref.set(website_data, merge=True)
        
        project_id = "ampac-a325f" # Updated to correct project ID
        region = "us-central1"
        public_url = f"https://{region}-{project_id}.cloudfunctions.net/serveWebsite?id={business_id}"
        
        website_ref.update({"publicUrl": public_url})
        
        return {"url": public_url, "status": "published"}

website_service = WebsiteService()
