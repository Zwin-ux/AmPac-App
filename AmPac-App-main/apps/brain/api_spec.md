# AmPac Brain API Specification

## Overview
Base URL: `https://api.ampac.com/brain` (or local `http://localhost:8000`)
Version: `v1`

## Authentication & Identity
All requests must be authenticated via Firebase ID Token.

- **Header**: `Authorization: Bearer <FIREBASE_ID_TOKEN>`
- **Identity Resolution**:
  - The Brain service verifies the token.
  - Extracts `uid`, `email`, and custom claims (e.g., `role: "staff" | "borrower"`).
  - **Borrower ID**: `uid` from token.
  - **Staff ID**: `uid` from token (if role is staff).

## Observability
Standard headers for tracing and debugging.

- `X-Request-ID`: UUID (Client generated or assigned by LB)
- `X-Trace-ID`: Distributed trace ID (e.g., OpenTelemetry)
- `X-Client-Version`: `ios-1.0.2` or `web-console-2.1.0`

## Error Handling
Standard error shape for all 4xx/5xx responses.

```json
{
  "error": {
    "code": "context_required",
    "message": "Loan ID is required for this operation.",
    "requestId": "123e4567-e89b-..."
  }
}
```

**Common Codes**:
- `unauthorized`: Invalid or missing token.
- `forbidden`: User does not have access to the requested resource (e.g., wrong loan ID).
- `rate_limit_exceeded`: Too many requests.
- `service_unavailable`: LLM provider is down.
- `context_required`: Missing `loanId` or other context.

---

## Endpoints

### 1. Chat Completions
`POST /v1/chat/completions`

Streamed or synchronous chat response.

**Request Body**:
```json
{
  "messages": [
    { "role": "system", "content": "You are a helpful assistant..." },
    { "role": "user", "content": "What is the status of my loan?" }
  ],
  "context": {
    "loanId": "loan_12345", 
    "screen": "ApplicationReview",
    "userRole": "borrower" // Redundant if in token, but helpful for explicit intent
  },
  "stream": true,
  "tools": ["get_loan_status", "explain_document"] // Optional: allowed tools
}
```

**Response (Streamed)**:
Server-Sent Events (SSE) stream of JSON chunks.

**Response (Sync)**:
```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Your loan is currently in the **Underwriting** phase.",
      "flags": {
        "requires_human_review": false,
        "is_financial_advice": false
      }
    },
    "finish_reason": "stop"
  }]
}
```

#### Examples

**A. Borrower Request (General)**
```json
// POST /v1/chat/completions
{
  "messages": [{ "role": "user", "content": "Do I need to submit my tax returns?" }],
  "context": { "screen": "DocumentUpload" }
}
```

**B. Staff Request (With Loan Context)**
```json
// POST /v1/chat/completions
{
  "messages": [{ "role": "user", "content": "Summarize the risk factors for this deal." }],
  "context": { 
    "loanId": "loan_98765",
    "screen": "UnderwritingDashboard"
  }
}
```

### 2. Underwriting Analysis
`POST /v1/underwriting/analyze`

Triggers a deep analysis of a loan file. This is an async long-running job or a slow sync request (timeout > 60s).

**Request Body**:
```json
{
  "loanId": "loan_98765",
  "analysisType": "risk_assessment", // or "credit_memo_draft"
  "focusAreas": ["cash_flow", "collateral"]
}
```

**Response**:
```json
{
  "analysisId": "an_55555",
  "loanId": "loan_98765",
  "status": "completed",
  "result": {
    "riskScore": 75,
    "summary": "Strong cash flow but high LTV.",
    "flags": [
      { "type": "warning", "message": "DSCR is below 1.25 in 2023." }
    ],
    "suggestedActions": ["Request 2024 interim financials"]
  },
  "audit": {
    "timestamp": "2025-11-30T12:00:00Z",
    "triggeredBy": "staff_user_123"
  }
}
```

### 3. Document Intelligence
`POST /v1/documents/extract`

Extract structured data from a document.

**Request Body**:
```json
{
  "documentUrl": "gs://bucket/tax_return_2023.pdf",
  "documentType": "tax_return_1040", // or "bank_statement", "pfs"
  "extractConfig": {
    "pages": [1, 2],
    "format": "json"
  }
}
```

**Response**:
```json
{
  "extractionId": "ext_123",
  "status": "completed",
  "data": {
    "taxYear": 2023,
    "adjustedGrossIncome": 150000,
    "wages": 120000,
    "businessIncome": 30000
  },
  "confidence": 0.98
}
```

### 4. Autonomous Agents
`POST /v1/agents/trigger`

Trigger a background agent workflow.

**Request Body**:
```json
{
  "agentType": "document_chaser", // or "compliance_check"
  "context": {
    "loanId": "loan_98765",
    "missingDocs": ["tax_return_2023"]
  }
}
```

**Response**:
```json
{
  "workflowId": "wf_777",
  "status": "started",
  "estimatedCompletion": "2025-11-30T14:00:00Z"
}
```

### 5. Knowledge Base (RAG)
`POST /v1/knowledge/query`

Semantic search over policies and procedures.

**Request Body**:
```json
{
  "query": "What is the minimum DSCR for a gas station loan?",
  "filters": {
    "source": ["sba_sop_50_10_7", "internal_credit_policy"]
  }
}
```

**Response**:
```json
{
  "answer": "The minimum DSCR for a gas station is generally **1.25x**. However, for SBA 504 loans...",
  "citations": [
    {
      "source": "SBA SOP 50 10 7",
      "section": "Chapter 3, Pg 145",
      "text": "Debt Service Coverage Ratio (DSCR) must be..."
    }
  ]
}
```
```
