# Simple AI Service - Quick Deployment Guide

## Status: READY FOR DEPLOYMENT

The simple AI service is complete and ready to replace the complex Brain API.

### Files Created:
- ✅ `main.py` - FastAPI service with Groq integration
- ✅ `requirements.txt` - Python dependencies
- ✅ `Dockerfile` - Container configuration

### Quick Deploy Options:

#### Option 1: Google Cloud Run (Recommended)
```bash
# From AmPac-App-main/simple-ai directory
gcloud run deploy simple-ai-service \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --project YOUR_PROJECT_ID
```

#### Option 2: Railway (Fastest)
1. Connect GitHub repo to Railway
2. Deploy from `AmPac-App-main/simple-ai` folder
3. Railway auto-detects Python and deploys

#### Option 3: Heroku
```bash
# From AmPac-App-main/simple-ai directory
heroku create ampac-simple-ai
git subtree push --prefix=AmPac-App-main/simple-ai heroku main
```

### Service Features:
- ✅ Simple AI chat completions via Groq
- ✅ API key authentication (same key as mobile app)
- ✅ CORS enabled for mobile app
- ✅ Graceful fallback responses
- ✅ Health check endpoints

### Mobile App Integration:
The mobile app already has the API key and fallback logic. Just update the base URL in:
- `AmPac-App-main/apps/mobile/.env.production`
- Change `BRAIN_API_BASE_URL` to new service URL

### Test Endpoint:
```bash
curl -X POST "YOUR_SERVICE_URL/api/v1/chat/completions" \
  -H "X-API-Key: 9dbUrc3VKS8Xr2Ho2Q4tZQ427-LuqT2cJcDMilKqw-Y" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

## Next Steps:
1. Deploy using any option above
2. Update mobile app environment variable
3. Test with mobile app
4. Done! ✅

**Estimated deployment time: 5-10 minutes**