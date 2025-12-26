# Ventures Integration & Mocking Plan

## Objective
To implement a robust synchronization service between AmPac's "Brain" (Firestore) and the Ventures Loan Origination System (LOS). Since production credentials are not yet available, we will implement a **Mock-First Architecture** that allows the frontend and business logic to be fully tested and demoed immediately.

## 1. Architecture

The `SyncService` will not instantiate a concrete class directly. Instead, it will rely on a configuration-driven factory pattern to choose between a `RealVenturesClient` and a `MockVenturesClient`.

```mermaid
graph TD
    SyncService -->|Uses| IVenturesClient
    IVenturesClient <|.. RealVenturesClient
    IVenturesClient <|.. MockVenturesClient
    RealVenturesClient -->|SOAP/REST| VenturesAPI
    MockVenturesClient -->|Returns| FakeData
```

### Configuration
In `apps/brain/.env`:
```bash
VENTURES_MOCK_MODE=true
```

## 2. Data Models (Internal)

We need standardized internal representations of Ventures objects to decouple our logic from their specific API schema (which is often complex SOAP XML).

### `VenturesLoan`
```python
class VenturesLoan(BaseModel):
    id: str
    status_name: str  # e.g., "Underwriting", "Approved"
    balance: Optional[float]
    officer_name: Optional[str]
```

### `VenturesCondition` (Tasks)
```python
class VenturesCondition(BaseModel):
    id: str
    description: str
    status: str       # "Open", "Waived", "Satisfied", "Received"
    category: str     # "Financials", "Legal", etc.
    due_date: Optional[datetime]
```

## 3. Implementation Steps

### Step 1: Define the Interface
Create `apps/brain/app/services/ventures/base.py`:
- Define `AbstractVenturesClient` with methods:
  - `get_loan_detail(loan_id: str) -> VenturesLoan`
  - `get_conditions(loan_id: str) -> List[VenturesCondition]`
  - `update_condition_status(condition_id: str, status: str) -> bool`

### Step 2: Implement the Mock Client
Create `apps/brain/app/services/ventures/mock.py`:
- **Stateful Mocking**: Keep a simple in-memory dictionary of loans so that updates (like "uploading a document") persist during the session.
- **Scenarios**:
  - Loan ID `1001`: "Happy Path" (Status: Underwriting, 2 Open Conditions)
  - Loan ID `1002`: "Approved" (Status: Approved, All Conditions Satisfied)
  - Loan ID `1003`: "Stuck" (Status: On Hold, 5 Critical Conditions)

### Step 3: Refactor Sync Service
Update `apps/brain/app/services/sync_service.py`:
- Remove direct dependency on the old `VenturesClient`.
- Inject the client based on `settings.VENTURES_MOCK_MODE`.
- Ensure the sync loop handles "Loan Not Found" gracefully (e.g., if a user creates a new app in Mobile that doesn't exist in Ventures yet).

### Step 4: The "Upload Loop"
To simulate the full "Borrower Uploads -> Ventures Updates" flow:
1. **Mobile**: User uploads file for Task A.
2. **Brain (API)**: Uploads to ShareFile. Updates Firestore Task A to `status: completed`.
3. **Sync Service**:
   - Reads Firestore Task A (`status: completed`).
   - Calls `ventures_client.update_condition_status(cond_id, "Received")`.
   - **Mock Client**: Updates its in-memory state for that condition to "Received".
4. **Sync Service (Next Tick)**:
   - Polls `ventures_client.get_conditions()`.
   - Sees Condition A is "Received".
   - Updates Firestore Task A (no change needed, but confirms sync).

## 4. Testing Plan

1. **Start Brain**: `VENTURES_MOCK_MODE=true uvicorn app.main:app`
2. **Mobile App**: Open Application `1001`.
3. **Verify**:
   - Status Bar shows "Underwriting".
   - Task List shows 2 items (e.g., "Tax Returns", "Org Chart").
4. **Action**: Upload a dummy PDF for "Tax Returns".
5. **Verify**:
   - Task marks as "Uploading..." -> "Completed".
   - (Wait 10s for Sync Loop)
   - Task remains "Completed" (simulating Ventures acceptance).

## 5. Future "Real" Implementation
Once keys are available:
1. Implement `apps/brain/app/services/ventures/real.py`.
2. Use `zeep` or `httpx` to hit the actual Ventures SOAP/REST endpoints.
3. Flip `VENTURES_MOCK_MODE=false`.
