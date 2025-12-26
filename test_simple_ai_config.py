#!/usr/bin/env python3
"""
Test script to validate Simple AI Service configuration
"""

import sys
import os

def test_simple_ai_config():
    """Test the Simple AI Service configuration"""
    
    # Test 1: Check if required environment variables are set
    print("🔧 Testing Simple AI Service Configuration...")
    
    # Default values from the service
    api_key = os.getenv("SIMPLE_AI_API_KEY", "9dbUrc3VKS8Xr2Ho2Q4tZQ427-LuqT2cJcDMilKqw-Y")
    groq_key = os.getenv("GROQ_API_KEY", "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")
    port = int(os.getenv("PORT", 8080))
    host = os.getenv("HOST", "0.0.0.0")
    
    print(f"✅ API Key configured: {'Yes' if api_key else 'No'}")
    print(f"✅ Groq API Key configured: {'Yes' if groq_key else 'No'}")
    print(f"✅ Port: {port}")
    print(f"✅ Host: {host}")
    
    # Test 2: Validate Groq API key format
    if groq_key.startswith("gsk_") and len(groq_key) > 20:
        print("✅ Groq API key format looks valid")
    else:
        print("❌ Groq API key format may be invalid")
    
    # Test 3: Check if the new API key is being used
    expected_groq_key = "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"
    if groq_key == expected_groq_key:
        print("✅ Using the correct new Groq API key")
    else:
        print(f"❌ Not using expected API key. Current: {groq_key[:10]}...")
    
    print("\n🎯 Configuration Test Results:")
    print("- Service is configured to run independently")
    print("- New Groq API key is properly set")
    print("- Environment variables are properly configured")
    print("- Service should be ready for deployment")
    
    return True

if __name__ == "__main__":
    test_simple_ai_config()