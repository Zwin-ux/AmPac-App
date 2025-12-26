#!/bin/bash
# Simple AI Service Deployment Script
# Independent deployment - no Brain Service dependencies

echo "🚀 Deploying Simple AI Service..."

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Set environment variables if not already set
export SIMPLE_AI_API_KEY=${SIMPLE_AI_API_KEY:-"9dbUrc3VKS8Xr2Ho2Q4tZQ427-LuqT2cJcDMilKqw-Y"}
export GROQ_API_KEY=${GROQ_API_KEY:-"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"}
export PORT=${PORT:-8080}
export HOST=${HOST:-"0.0.0.0"}

echo "✅ Configuration:"
echo "   - Port: $PORT"
echo "   - Host: $HOST"
echo "   - API Key configured: $([ -n "$SIMPLE_AI_API_KEY" ] && echo "Yes" || echo "No")"
echo "   - Groq API Key configured: $([ -n "$GROQ_API_KEY" ] && echo "Yes" || echo "No")"

# Start the service
echo "🤖 Starting Simple AI Service..."
python main.py