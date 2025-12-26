# Simple AI Service Deployment Script (PowerShell)
# Independent deployment - no Brain Service dependencies

Write-Host "🚀 Deploying Simple AI Service..." -ForegroundColor Green

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt

# Set environment variables if not already set
if (-not $env:SIMPLE_AI_API_KEY) {
    $env:SIMPLE_AI_API_KEY = "9dbUrc3VKS8Xr2Ho2Q4tZQ427-LuqT2cJcDMilKqw-Y"
}

if (-not $env:GROQ_API_KEY) {
    $env:GROQ_API_KEY = "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"
}

if (-not $env:PORT) {
    $env:PORT = "8080"
}

if (-not $env:HOST) {
    $env:HOST = "0.0.0.0"
}

Write-Host "✅ Configuration:" -ForegroundColor Green
Write-Host "   - Port: $env:PORT"
Write-Host "   - Host: $env:HOST"
Write-Host "   - API Key configured: $(if ($env:SIMPLE_AI_API_KEY) { 'Yes' } else { 'No' })"
Write-Host "   - Groq API Key configured: $(if ($env:GROQ_API_KEY) { 'Yes' } else { 'No' })"

# Start the service
Write-Host "🤖 Starting Simple AI Service..." -ForegroundColor Green
python main.py