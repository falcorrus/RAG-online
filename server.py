from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv

# Load API key from .env file
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    print("⚠️ WARNING: GEMINI_API_KEY not found in environment variables!")

app = FastAPI()

# Enable CORS so your frontend can talk to the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with your actual domain
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    query: str
    context: str

@app.get("/api/admin")
async def admin_auth():
    return {"status": "ok"}

@app.post("/api/chat")
async def chat_proxy(request: ChatRequest):
    if not API_KEY:
        raise HTTPException(status_code=500, detail="API Key not configured on server")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={API_KEY}"
    
    prompt = f"""You are a helpful assistant for a company knowledge base. 
    Use the following documentation to answer the user's question. 
    If the answer is not in the documentation, state that clearly but politely. 
    Keep the answer concise and friendly.
    Answer in the SAME LANGUAGE as the user's question.
    
    DOCUMENTATION CONTENT:
    ---
    {request.context}
    ---
    
    USER QUESTION: {request.query}"""

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.3,
                        "maxOutputTokens": 1000,
                    }
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                return response.json()
            
            data = response.json()
            return {"answer": data['candidates'][0]['content']['parts'][0]['text']}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)
