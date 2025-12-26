# AmPac Website Generator (RAG-based) - Technical Spec

## 1. Overview
This document outlines the technical specification for adding a "Lovable-like" website generation feature to the AmPac ecosystem. The goal is to allow small businesses (borrowers) to generate, preview, and host a professional landing page for their business directly from the AmPac mobile app, leveraging their existing business profile data and AI generation.

## 2. User Experience (Mobile App)

### 2.1. Entry Point
- A new "Web Presence" or "Marketing" tab in the `HomeScreen` or a dedicated card in the `BusinessProfileScreen`.

### 2.2. Creation Flow
1.  **Context Gathering**:
    - The app pulls existing data: Business Name, Industry, Location, Revenue (for scale context).
    - **New Input**: "Describe your business vibe" (e.g., "Modern and sleek coffee shop", "Trusted local plumber").
    - **Optional**: Upload logo or hero image (stored in Firebase Storage).
2.  **Generation Trigger**:
    - User taps "Generate Website".
    - App shows a loading state (e.g., "Designing your layout...", "Writing copy...").
3.  **Preview**:
    - A `WebView` renders the generated HTML/React code.
    - User can tap "Regenerate" (with feedback) or "Publish".

### 2.3. Publishing
- Upon publishing, the user receives a public URL (e.g., `sites.ampac.com/business-name` or `ampac.site/u/{uid}`).

## 3. Architecture & Data Flow

### 3.1. Mobile App (`apps/mobile`)
- **Responsibilities**: Input collection, triggering generation, previewing, publishing.
- **New Service**: `websiteService.ts` to handle API calls to `apps/brain`.
- **UI**: `WebsiteBuilderScreen.tsx`, `WebsitePreviewScreen.tsx`.

### 3.2. The Brain (`apps/brain`) - The RAG Engine
- **Responsibilities**: Retrieving templates, generating code, saving to Firestore.
- **New Router**: `app/api/routers/website.py`.
- **RAG Implementation**:
    - **Retrieval**: Instead of training a model, we use a **Context Retrieval** system.
    - **Knowledge Base**: A collection of high-quality, Tailwind-styled HTML/React component templates (Hero sections, Feature lists, Contact forms, Footers) stored in a JSON file or Vector DB (ChromaDB/Pinecone) if scaling is needed.
    - **Process**:
        1.  Analyze User Request (e.g., "Plumber") -> Retrieve "Service Business" templates.
        2.  Construct Prompt: Combine User Data + Retrieved Templates + Design Rules.
        3.  LLM Generation: Output a single HTML file (or React component structure) with Tailwind CSS via CDN.

### 3.3. Hosting / Public Access
- **Strategy**: Dynamic Rendering via Cloud Functions or a dedicated "Viewer" App.
- **MVP Approach**:
    - A generic React web app (could be part of `apps/console` or a new `apps/sites`) that takes a URL parameter `?id={businessId}`.
    - It fetches the generated HTML/JSON from Firestore and renders it safely.

## 4. Data Model Changes

### 4.1. Firestore Schema
New Collection: `websites` (keyed by `businessId` or `userId`)

```typescript
interface Website {
  id: string; // matches businessId
  ownerId: string;
  status: 'draft' | 'published';
  version: number;
  
  // The Generated Content
  content: {
    html: string; // Full HTML string for MVP
    // OR structured:
    // hero: { title: string, subtitle: string, image: string },
    // services: string[],
    // contact: { phone: string, email: string }
  };
  
  // Metadata
  theme: 'modern' | 'classic' | 'bold';
  generatedAt: Timestamp;
  publishedAt?: Timestamp;
  publicUrl?: string;
}
```

## 5. Implementation Plan

### Phase 1: The Brain (Backend Logic)
1.  **Setup Templates**: Create a `data/templates` folder in `apps/brain` with text files containing Tailwind HTML snippets (Hero, About, Services, Footer).
2.  **RAG Logic**: Implement a simple retriever in `llm_service.py` that selects templates based on keywords (e.g., "food" -> selects menu templates).
3.  **Prompt Engineering**: Create a prompt that instructs the LLM to fill these templates with the business's specific details (Name, Zip, etc.).
4.  **Endpoint**: Create `POST /website/generate` that accepts business details and returns HTML.

### Phase 2: Mobile UI (Frontend)
1.  **Screen**: Build `WebsiteBuilderScreen` with a text input for "Business Description".
2.  **API Integration**: Call the Brain endpoint.
3.  **Preview**: Use `react-native-webview` to display the returned HTML string.

### Phase 3: Persistence & Hosting
1.  **Save**: Add "Save/Publish" button in Mobile to write the HTML to Firestore `websites/{id}`.
2.  **Public View**: Create a simple route in `apps/console` (or a standalone function) that renders the stored HTML for a given ID.

## 6. Example Prompt Structure (RAG)

```text
You are an expert web designer.
CONTEXT:
- Business Name: {name}
- Industry: {industry}
- Location: {zip}
- Description: {description}

DESIGN SYSTEM:
- Use Tailwind CSS via CDN.
- Use the following layout structure: {retrieved_layout_template}

TASK:
Generate a complete, responsive HTML5 landing page for this business. 
Fill in the copy based on the industry and description. 
Ensure the tone is professional and trustworthy.
Return ONLY the HTML code.
```
