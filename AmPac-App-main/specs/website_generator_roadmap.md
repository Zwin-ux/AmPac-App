# AmPac Website Generator - Full Feature Roadmap

## Vision

To empower every AmPac borrower with an instant, professional, and editable web presence that drives business credibility. The system evolves from a simple "one-shot" generator to a full CMS (Content Management System) powered by AI.

---

## Phase 1: Persistence & Public Hosting (The "Live" Update)

**Goal**: Move from "Preview only" to "Live on the web".

### 1.1. Data Persistence (Firestore)

- **Schema**: Create `websites` collection.

  ```typescript
  interface Website {
      id: string; // businessId
      ownerId: string;
      htmlContent: string;
      theme: string;
      createdAt: Timestamp;
      updatedAt: Timestamp;
      isPublished: boolean;
      publicUrl?: string;
      visitCount: number;
  }
  ```

- **Mobile**: Add "Save Draft" and "Publish" buttons to `WebsiteBuilderScreen`.
- **Brain**: Update `POST /website/generate` to optionally save to Firestore, or create a new `POST /website/publish` endpoint.

### 1.2. Public Viewer (Hosting)

- **Strategy**: Use a lightweight Cloud Function or a dedicated route in `apps/console` (if public access is allowed) to serve the content.
- **Implementation**:
  - Create a Firebase Cloud Function `serveWebsite`.
  - Route: `https://us-central1-ampac-app.cloudfunctions.net/serveWebsite?id={businessId}`.
  - Logic: Fetch HTML from Firestore `websites/{id}`, set `Content-Type: text/html`, and return.
- **Vanity URLs**: Map a custom domain (e.g., `sites.ampac.com`) to the function via Firebase Hosting rewrites.

---

## Phase 2: The AI Editor (The "Refine" Update)

**Goal**: Allow users to tweak the result without regenerating everything (which risks losing good parts).

### 2.1. Section-Based Generation

- **Architecture Change**: Instead of one big HTML blob, store the website as a JSON structure of sections.

  ```json
  {
      "hero": { "headline": "...", "sub": "...", "bg": "..." },
      "services": [ ... ],
      "contact": { ... }
  }
  ```

- **Brain**: Update RAG to return JSON instead of HTML.
- **Mobile**:
  - "Regenerate Hero": User taps the hero section -> "Make it punchier" -> AI updates just that JSON node.
  - "Edit Text": Simple text inputs to override AI generation.

### 2.2. Image Customization

- **Uploads**: Allow users to upload their own hero image via `apps/mobile` (Firebase Storage).
- **AI Generation**: Integrate DALL-E 3 (via OpenAI) to generate custom hero images if the user has none.

---

## Phase 3: Professional Tools (The "Growth" Update)

**Goal**: Turn the website into a business tool, not just a brochure.

### 3.1. Lead Capture

- **Feature**: Add a "Contact Form" that actually works.
- **Backend**: Form submissions on the generated site POST to `apps/brain/api/leads`.
- **Mobile**: Push notification to the business owner: "New lead from your website!".

### 3.2. SEO & Analytics

- **SEO**: Auto-generate `<meta>` tags (description, keywords) based on the business profile.
- **Analytics**: Track page views in Firestore (`visitCount`). Show a simple graph in `BusinessProfileScreen`.

### 3.3. Custom Domains

- **Feature**: Allow users to connect `www.mybusiness.com`.
- **Tech**: Use Firebase Hosting REST API to programmatically add custom domains (complex, requires verification).

---

## Implementation Steps (Immediate Next Actions)

### Step 1: Save & Publish (Phase 1)

1.  **Mobile**: Add `publishWebsite` method to `websiteService.ts`.
2.  **Mobile**: Add "Publish" button to `WebsiteBuilderScreen` preview mode.
3.  **Brain**: Create `POST /website/publish` that saves the HTML to Firestore `websites/{uid}`.
4.  **Functions**: Create a Firebase Function `serveSite` that reads from Firestore and serves HTML.

### Step 2: Refine RAG (Phase 2 Prep)

1.  **Brain**: Split `layout_base.html` into distinct Jinja2 templates.
2.  **Brain**: Improve prompt to handle "Regenerate Section" requests.

### Step 3: Analytics (Phase 3 Prep)

1.  **Mobile**: Add a "Website Stats" card to `HomeScreen`.
