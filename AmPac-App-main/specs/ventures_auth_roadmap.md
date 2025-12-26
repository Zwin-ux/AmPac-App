# Ventures Integration: User-Managed Authentication

## Overview
Currently, Ventures API credentials are hardcoded in the backend configuration. To make this "customer-facing" for the AmPac Business Capital team, we need to move credential management into the Console UI. This allows Admins to connect/disconnect the integration without developer support.

## User Flow
1.  **Navigate**: Admin goes to `Console > Admin > Integrations` or `Console > Ventures Dashboard`.
2.  **Status Check**: System shows "Ventures: Disconnected" or "Connected as api_user".
3.  **Connect**:
    *   User clicks "Connect Ventures".
    *   A modal appears asking for:
        *   **Username**
        *   **Password**
        *   **Site Name** (e.g., `test_integration` or `production`)
4.  **Validation**:
    *   Frontend sends credentials to Backend (`POST /api/v1/ventures/configure`).
    *   Backend attempts to log in to Ventures API immediately.
    *   If successful, Backend saves the credentials securely.
5.  **Usage**: Subsequent sync operations use these stored credentials.

## Technical Architecture

### 1. Database Schema (Firestore)
We need a protected collection to store these secrets. It must **NOT** be readable by the frontend Client SDK, only by the Backend Admin SDK.

**Collection**: `system_secrets` (Restricted via Firestore Rules)
**Document**: `ventures_config`
```json
{
  "username": "api_user",
  "encrypted_password": "gAAAAABl...", // Fernet encrypted string
  "site_name": "test_integration",
  "base_url": "https://api.venturesgo.com/api/v4",
  "updated_at": "2025-12-01T10:00:00Z",
  "updated_by": "admin_uid"
}
```

### 2. Backend API (`apps/brain`)
New endpoints in `routers/ventures.py`:

*   `POST /ventures/configure`:
    *   Input: `{ username, password, site }`
    *   Action: 
        1. Instantiate `VenturesClient` with provided creds.
        2. Call `login()` to verify.
        3. If valid, `EncryptionService.encrypt(password)`.
        4. Save to Firestore `system_secrets/ventures_config`.
    *   Output: `{ success: true, message: "Connected to Ventures" }`
*   `GET /ventures/config/status`:
    *   Action: Check if config exists in Firestore.
    *   Output: `{ configured: true, username: "api_user", site: "test_integration" }` (Never return password).
*   `POST /ventures/disconnect`:
    *   Action: Delete `system_secrets/ventures_config`.

### 3. Security Implementation
*   **Encryption**: The Python backend uses `cryptography.fernet`.
*   **Key Management**: The `SECRET_KEY` in `.env` is used to derive the encryption key.
*   **Decryption**: When `ventures_client.py` needs to call the API:
    1. Fetch `system_secrets/ventures_config`.
    2. Decrypt password.
    3. Acquire Bearer token.

## Implementation Plan

### Phase 1: Backend Infrastructure
- [ ] Add `cryptography` to `requirements.txt`.
- [ ] Create `EncryptionService` in `apps/brain/app/services/encryption_service.py`.
- [ ] Update `VenturesClient` to support dynamic credentials and Firestore loading.

### Phase 2: API Endpoints
- [ ] Implement `POST /configure` to validate and save.
- [ ] Implement `GET /status` for UI state.

### Phase 3: Frontend UI
- [ ] Create `VenturesConnectionModal.tsx`.
- [ ] Update `VenturesDashboard` to show connection status.
- [ ] Add "Integrations" section to `AdminPage`.

## Security Note
Since Ventures API v4 uses simple Username/Password, we are essentially storing a service account password.
*   **Recommendation**: Create a dedicated Ventures user for this integration (e.g., `api_bot@ampac.com`) rather than using a real staff member's personal credentials. This prevents the integration from breaking if a staff member changes their password.
