# AmPac Brain 🧠

The **AmPac Brain** is the intelligent core of the AmPac ecosystem, leveraging Large Language Models (LLMs) and AI to automate complex lending processes, enhance decision-making, and provide 24/7 assistance to borrowers and staff.

## Mission
To reduce the time-to-decision for small business loans from weeks to hours by autonomously handling document processing, risk assessment, and customer communication.

## Core Capabilities

### 1. Intelligent Document Processing (IDP)
*   **Automated Extraction**: Instantly extract key financial data from Tax Returns (1040, 1120S), Bank Statements, and P&L/Balance Sheets.
*   **Verification**: Cross-reference extracted data with application details to detect discrepancies.
*   **Fraud Detection**: Analyze document metadata and visual patterns to flag potential alterations.

### 2. AI Underwriting Assistant
*   **Risk Analysis**: Analyze borrower financials, credit history, and business performance to generate a preliminary risk score.
*   **Memo Generation**: Auto-draft the Credit Memo, summarizing strengths, weaknesses, and mitigating factors for the Loan Officer.
*   **Policy Compliance**: Automatically check applications against SBA 504/7(a) and internal credit policies.

### 3. Conversational AI Agents
*   **Borrower Concierge (Mobile)**: A chat interface in the mobile app to answer questions ("What documents do I need?"), guide users through the application, and provide status updates.
*   **Staff Copilot (Console)**: A sidekick for loan officers to query the knowledge base ("What is the max LTV for a gas station?"), summarize long email threads, and draft communication.

## Architecture

*   **Service Type**: Python-based Microservice (FastAPI or Flask)
*   **AI Orchestration**: LangChain or LlamaIndex
*   **Models**: GPT-4o (Reasoning/Extraction), Claude 3.5 Sonnet (Coding/Analysis), Local Llama 3 (Privacy-sensitive tasks)
*   **Database**: Vector Database (Pinecone/Weaviate) for semantic search over credit policies and loan documents.
*   **Integration**:
    *   Listens to Firestore triggers (e.g., `onDocumentUpload`).
    *   Exposes REST/GraphQL endpoints for the Mobile and Console apps.

## Roadmap

### Phase 1: Foundation
- [ ] Set up Python environment and API scaffold.
- [ ] Implement basic OCR and data extraction for IRS Form 1040.
- [ ] Create "Chat with Policy" RAG (Retrieval-Augmented Generation) pipeline.

### Phase 2: Underwriting Automation
- [ ] Build the "Credit Memo Generator" agent.
- [ ] Implement financial ratio calculation engine (DSCR, LTV, Global Cash Flow).

### Phase 3: Full Autonomy
- [ ] Deploy borrower-facing chat agent.
- [ ] Enable autonomous document verification and "needs list" generation.
