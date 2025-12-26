# 🚨 Brain API Emergency Fix - Service Down

## Current Status: CRITICAL
**Service State**: 🔴 **DOWN** - All revisions failing to start  
**Impact**: Complete AI functionality outage in mobile app  
**Root Cause**: Multiple configuration and permission issues  
**Immediate Action Required**: Emergency service restoration  

## Issues Identified

### 1. 🚨 Container Startup Failures
**Problem**: All recent revisions failing with "container failed to start and listen on port 8080"  
**Evidence**: 
- Revision `ampac-brain-00003-gt9`: Failed deployment
- Revision `ampac-brain-00004-2g2`: Failed deployment  
**Impact**: Service completely unavailable

### 2. 🚨 Firebase Permission Errors
**Problem**: Service account lacks Firestore permissions  
**Evidence**: Logs show "403 Missing or insufficient permissions" for:
- Sync events
- Loan status updates  
- Task synchronization
- Upload operations
**Impact**: Core functionality broken even if container starts

### 3. 🚨 Environment Variable Mismatch
**Problem**: Used `API_KEY` instead of `BRAIN_API_KEY`  
**Evidence**: Code expects `BRAIN_API_KEY` in `config.py`  
**Impact**: API key authentication not working

## Emergency Recovery Plan

### Step 1: Immediate Service Restoration (5 minutes)
```bash
# Revert to last known working revision (if exists)
gcloud run revisions list --service=ampac-brain --region=us-central1

# If no working revision exists, deploy minimal working version
gcloud run deploy ampac-brain \
  --source AmPac-App-main/apps/brain \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="SKIP_SYNC_LOOP=true,AUTH_DISABLED=true,ENV=development" \
  --memory=1Gi \
  --timeout=300 \
  --max-instances=3
```

### Step 2: Fix Service Account Permissions (10 minutes)
```bash
# Grant Firestore permissions to the service account
gcloud projects add-iam-policy-binding ampac-database \
  --member="serviceAccount:381306899120-compute@developer.gserviceaccount.com" \
  --role="roles/datastore.user"

# Grant Firebase Admin permissions
gcloud projects add-iam-policy-binding ampac-database \
  --member="serviceAccount:381306899120-compute@developer.gserviceaccount.com" \
  --role="roles/firebase.admin"
```

### Step 3: Deploy with Correct Configuration (15 minutes)
```bash
# Deploy with all required environment variables
gcloud run deploy ampac-brain \
  --source AmPac-App-main/apps/brain \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="BRAIN_API_KEY=9dbUrc3VKS8Xr2Ho2Q4tZQ427-LuqT2cJcDMilKqw-Y,GROQ_API_KEY=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,LLM_PROVIDER=groq,ENV=production,SKIP_SYNC_LOOP=false" \
  --memory=1Gi \
  --timeout=300 \
  --max-instances=3
```

## Alternative Quick Fix: Disable Problematic Features

If the above fails, deploy with minimal functionality:

```bash
# Deploy with sync disabled to avoid Firebase permission issues
gcloud run deploy ampac-brain \
  --source AmPac-App-main/apps/brain \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="BRAIN_API_KEY=9dbUrc3VKS8Xr2Ho2Q4tZQ427-LuqT2cJcDMilKqw-Y,GROQ_API_KEY=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,LLM_PROVIDER=groq,SKIP_SYNC_LOOP=true,AUTH_DISABLED=false,ENV=production" \
  --memory=512Mi \
  --timeout=300
```

## Mobile App Fallback Verification

While fixing the Brain API, verify the mobile app fallbacks are working:

### Test AI Assistant Fallback
1. Open mobile app
2. Navigate to AI Assistant
3. Ask: "What documents do I need for a loan?"
4. **Expected**: Fallback response about loan documents
5. **Should NOT see**: "I'm having trouble connecting" error

### Test Configuration Validator
The mobile app should log configuration status:
```
🔧 Configuration Validation Results:
Environment: production
Brain API URL: https://ampac-brain-381306899120.us-central1.run.app/api/v1
Brain API Key: Set ✅
✅ Configuration is valid!
```

## Post-Recovery Actions

### 1. Verify Service Health
```bash
# Test health endpoint
curl https://ampac-brain-381306899120.us-central1.run.app/health

# Test with API key
curl -H "X-API-Key: 9dbUrc3VKS8Xr2Ho2Q4tZQ427-LuqT2cJcDMilKqw-Y" \
     https://ampac-brain-381306899120.us-central1.run.app/api/v1/health/
```

### 2. Run Postman Collection
Execute the updated Postman collection to verify all endpoints

### 3. Test Mobile App AI
- Open mobile app AI assistant
- Verify real AI responses (not fallbacks)
- Test loan application processing

## Long-term Fixes Required

### 1. Proper Service Account Setup
- Create dedicated service account for Brain API
- Grant minimal required permissions
- Use service account key for authentication

### 2. Environment Configuration Management
- Standardize environment variable names
- Add configuration validation on startup
- Document all required environment variables

### 3. Deployment Pipeline
- Add health checks before traffic routing
- Implement blue-green deployments
- Add automated rollback on failure

### 4. Monitoring and Alerting
- Set up service health monitoring
- Add alerts for service failures
- Monitor API response times and error rates

## Current Service Information

**Service URL**: https://ampac-brain-381306899120.us-central1.run.app  
**Project**: ampac-database  
**Region**: us-central1  
**Service Account**: 381306899120-compute@developer.gserviceaccount.com  

**Required Environment Variables**:
- `BRAIN_API_KEY`: 9dbUrc3VKS8Xr2Ho2Q4tZQ427-LuqT2cJcDMilKqw-Y
- `GROQ_API_KEY`: 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  
- `LLM_PROVIDER`: groq
- `ENV`: production

## Mobile App Impact

**Current State**: AI features showing fallback responses  
**User Experience**: Degraded but functional  
**Critical Features Affected**:
- AI Chat Assistant (fallback responses working)
- Document Analysis (not available)
- Loan Application AI Processing (may be impacted)

**Fallback Mechanisms Working**:
- ✅ AI Assistant shows helpful fallback responses
- ✅ App doesn't crash when Brain API unavailable  
- ✅ Configuration validator identifies issues
- ✅ Error handling prevents user-facing failures

---

**Next Action**: Execute emergency recovery plan immediately  
**Owner**: DevOps Team  
**Priority**: P0 - Service restoration required  
**Timeline**: 30 minutes maximum