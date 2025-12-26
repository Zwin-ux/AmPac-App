from app.core.config import get_settings
import os

settings = get_settings()
print(f"GROQ_API_KEY from settings: {'[PRESENT]' if settings.GROQ_API_KEY else '[MISSING]'}")
print(f"Current Working Directory: {os.getcwd()}")
print(f"Env file path expected: {os.path.join(os.getcwd(), '.env')}")
if os.path.exists(os.path.join(os.getcwd(), '.env')):
    print(".env file FOUND")
else:
    print(".env file NOT FOUND")
