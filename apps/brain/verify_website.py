import requests
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_website_generation():
    print("Testing Website Generator (RAG)...")
    
    payload = {
        "name": "EcoClean Solutions",
        "industry": "Cleaning Services",
        "zip": "90210",
        "description": "We use only organic products.",
        "phone": "555-0199",
        "email": "info@ecoclean.com",
        "hasBusinessPlan": True,
        "ownerName": "Sarah Green"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/website/generate", json=payload)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("Success! Generated HTML length:", len(data.get("html", "")))
            
            # Check if RAG context was used (heuristic: look for 'Sarah' or 'organic' in the output)
            html_content = data.get("html", "")
            if "Sarah" in html_content or "organic" in html_content:
                print("RAG Context likely used (found keywords).")
            else:
                print("Warning: RAG context keywords not found in output.")
                
            # Save to file for inspection
            with open("generated_site.html", "w", encoding="utf-8") as f:
                f.write(html_content)
            print("Saved to generated_site.html")
            return True
        else:
            print(f"Failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    test_website_generation()
