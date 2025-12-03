import pdfplumber
import io
from fastapi import UploadFile

class DocumentParser:
    @staticmethod
    async def parse_file(file: UploadFile) -> str:
        """
        Extracts text from PDF or Text files.
        """
        filename = file.filename.lower()
        content = await file.read()
        
        text = ""
        
        try:
            if filename.endswith(".pdf"):
                with pdfplumber.open(io.BytesIO(content)) as pdf:
                    for page in pdf.pages:
                        text += page.extract_text() or ""
                        
            elif filename.endswith(".txt") or filename.endswith(".md"):
                text = content.decode("utf-8")
                
            else:
                text = f"[Unsupported file type: {filename}]"
                
        except Exception as e:
            print(f"Error parsing {filename}: {e}")
            text = f"[Error parsing file: {e}]"
            
        return text
