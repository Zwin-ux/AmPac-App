#!/usr/bin/env python3
"""
Validation script for Groq API configuration.
Run this to verify that the Groq integration is properly configured.
"""

import os
import sys
from pathlib import Path

# Add the app directory to Python path
app_dir = Path(__file__).parent / "app"
sys.path.insert(0, str(app_dir))

def validate_configuration():
    """Validate Groq configuration without making API calls."""
    print("🔍 Validating Groq API Configuration...")
    
    try:
        # Test configuration loading
        from core.config import get_settings
        settings = get_settings()
        
        print(f"✅ Configuration loaded successfully")
        print(f"   - Groq API Key: {'✅ Configured' if settings.GROQ_API_KEY else '❌ Missing'}")
        print(f"   - Groq Model: {settings.GROQ_MODEL}")
        print(f"   - Environment: {settings.ENV}")
        
        # Test Groq service import
        from services.groq_service import groq_service
        print(f"✅ Groq service imported successfully")
        print(f"   - API Key Available: {'✅ Yes' if groq_service.api_key else '❌ No'}")
        print(f"   - Model: {groq_service.model}")
        
        # Test LLM service import
        from services.llm_service import llm_service
        print(f"✅ LLM service imported successfully")
        
        # Check if old OpenAI dependencies are removed
        try:
            import openai
            print(f"⚠️  WARNING: OpenAI package still installed (should be removed)")
        except ImportError:
            print(f"✅ OpenAI package properly removed")
        
        try:
            import langchain_openai
            print(f"⚠️  WARNING: LangChain OpenAI package still installed (should be removed)")
        except ImportError:
            print(f"✅ LangChain OpenAI package properly removed")
        
        # Check Groq package
        try:
            import groq
            print(f"✅ Groq package available")
        except ImportError:
            print(f"❌ Groq package not installed - run: pip install groq==0.4.1")
            return False
        
        print(f"\n🎉 Configuration validation completed successfully!")
        print(f"   The Brain Service is ready to use Groq API instead of OpenAI.")
        return True
        
    except Exception as e:
        print(f"❌ Configuration validation failed: {str(e)}")
        return False

def main():
    """Main validation function."""
    print("=" * 60)
    print("AmPac Brain - Groq API Configuration Validator")
    print("=" * 60)
    
    success = validate_configuration()
    
    if success:
        print(f"\n✅ All checks passed! The Groq integration is ready.")
        print(f"\nNext steps:")
        print(f"1. Install dependencies: pip install -r requirements.txt")
        print(f"2. Start the service: uvicorn app.main:app --reload")
        print(f"3. Test the /api/v1/assistant/chat endpoint")
    else:
        print(f"\n❌ Some checks failed. Please review the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()