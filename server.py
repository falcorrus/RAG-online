from fastapi import FastAPI, HTTPException, Depends, Header, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import httpx
import os
import json
import uuid
import re
from typing import Optional, List
from dotenv import load_dotenv
from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta
import tiktoken # Import tiktoken

load_dotenv(override=True)
API_KEY = os.getenv("GEMINI_API_KEY")
SECRET_KEY = os.getenv("JWT_SECRET", "super-secret-key-change-me")
STORAGE_DIR = "storage"
TENANTS_FILE = os.path.join(STORAGE_DIR, "tenants.json")

# Define token limits
MAX_TOKENS = 10000
ENCODING_NAME = "cl100k_base" # This encoding works for gpt models, Gemini might use different one

def count_tokens(text: str) -> int:
    """Counts tokens using a tiktoken encoder."""
    encoding = tiktoken.get_encoding(ENCODING_NAME)
    return len(encoding.encode(text))

def limit_context_by_tokens(text: str, max_tokens: int) -> str:
    """Limits text by tokens, trying to keep whole words."""
    encoding = tiktoken.get_encoding(ENCODING_NAME)
    encoded = encoding.encode(text)
    
    if len(encoded) <= max_tokens:
        return text
    
    return encoding.decode(encoded[:max_tokens])

if not os.path.exists(STORAGE_DIR):
    os.makedirs(STORAGE_DIR)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Models ---
class UserAuth(BaseModel):
    email: str
    password: str
    subdomain: Optional[str] = None

class TenantSettings(BaseModel):
    initiallyOpen: bool
    defaultLang: str

class ChatRequest(BaseModel):
    query: str
    lang: Optional[str] = "ru"

# --- Utils ---
def get_tenants():
    if not os.path.exists(TENANTS_FILE):
        return {}
    with open(TENANTS_FILE, 'r') as f:
        try:
            return json.load(f)
        except:
            return {}

def save_tenants(tenants):
    with open(TENANTS_FILE, 'w') as f:
        json.dump(tenants, f, indent=4)

def get_tenant_by_host(host: str):
    if not host:
        return "ekirshin@gmail.com"
    parts = host.split('.')
    # Handle subdomain.rag.reloto.ru (len 4+)
    if len(parts) >= 4 and parts[-3] == 'rag':
        subdomain = parts[0]
        tenants = get_tenants()
        for email, data in tenants.items():
            if data.get("subdomain") == subdomain:
                return email
    # Handle rag.reloto.ru (len 3)
    return "ekirshin@gmail.com"

def create_token(email: str, is_admin: bool = False):
    payload = { "sub": email, "admin": is_admin, "exp": datetime.utcnow() + timedelta(days=30) }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

async def get_current_user(authorization: str = Header(None), required: bool = True):
    if not authorization or not authorization.startswith("Bearer "):
        if required: raise HTTPException(status_code=401, detail="Missing or invalid token")
        return None
    token = authorization.split(" ")[1]
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except:
        if required: raise HTTPException(status_code=401, detail="Invalid token")
        return None

async def generate_kb_suggestions(owner_email: str, content: str):
    """Automatically generate suggested questions and business name from KB content using AI."""
    lang_map = {"ru": "Russian", "en": "English", "pt": "Portuguese"}
    all_suggestions = {}
    all_names = {}
    
    # Simple heuristic if AI fails
    found_q = re.findall(r'\*\*(.*?\?)\*\*', content)
    
    for code, lang_name in lang_map.items():
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={API_KEY}"
            
            # Apply token limit to content for prompt
            limited_content = limit_context_by_tokens(content, 2000) # Use 2000 tokens for suggestions/name extraction
            
            prompt = f"""Analyze this Knowledge Base. 
1. Generate 3 typical short questions in {lang_name}.
2. Extract or translate the Business/Company name into {lang_name}.
Return ONLY a JSON object: {{"suggestions": ["q1", "q2", "q3"], "businessName": "Name"}}.
KB: {limited_content}"""
            
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, json={"contents": [{"parts": [{"text": prompt}]}]}, timeout=15.0)
                if resp.status_code == 200:
                    text = resp.json()['candidates'][0]['content']['parts'][0]['text']
                    # Remove markdown blocks if present
                    clean_text = re.sub(r'```json\s*|\s*```', '', text).strip()
                    data = json.loads(clean_text)
                    all_suggestions[code] = data.get("suggestions", [])
                    
                    b_name = data.get("businessName", "").strip()
                    # Final safety check for English translation
                    if code == "en" and any('\u0400' <= c <= '\u04FF' for c in b_name):
                        b_name = "AI Knowledge Base" # Fallback or retry
                    
                    all_names[code] = b_name
                else:
                    all_suggestions[code] = found_q[:3]
        except Exception as e:
            print(f"Error generating suggestions for {code}: {e}", flush=True)
            all_suggestions[code] = found_q[:3]
    
    tenants = get_tenants()
    if owner_email in tenants:
        tenants[owner_email]["suggestions_cache"] = all_suggestions
        tenants[owner_email]["business_names_cache"] = all_names
        save_tenants(tenants)

# --- Routes ---
@app.post("/api/auth/register")
async def register(auth: UserAuth):
    tenants = get_tenants()
    if auth.email in tenants: raise HTTPException(status_code=400, detail="User already exists")
    sub = auth.subdomain or auth.email.split('@')[0]
    tenants[auth.email] = {
        "password": pwd_context.hash(auth.password),
        "is_admin": auth.email == "ekirshin@gmail.com",
        "subdomain": sub,
        "settings": {"initiallyOpen": True, "defaultLang": "ru"},
        "kb_file": f"kb_{uuid.uuid4().hex}.md",
        "suggestions_cache": {}
    }
    save_tenants(tenants)
    return { "token": create_token(auth.email, tenants[auth.email]["is_admin"]), "subdomain": sub }

@app.get("/api/settings")
async def get_public_settings(request: Request, lang: str = "ru"):
    owner_email = get_tenant_by_host(request.headers.get("host"))
    tenants = get_tenants()
    if owner_email in tenants:
        tenant = tenants[owner_email]
        settings = tenant.get("settings", {}).copy()
        
        # Priority 1: Use cached translated business name from KB
        kb_name = tenant.get("business_names_cache", {}).get(lang)
        if kb_name:
            settings["businessName"] = kb_name
            
        kb_path = os.path.join(STORAGE_DIR, tenant["kb_file"])
        settings["kb_exists"] = os.path.exists(kb_path) and os.path.getsize(kb_path) > 0
        return settings
    return {"initiallyOpen": True, "defaultLang": "ru", "businessName": "AI Knowledge Base", "kb_exists": False}

@app.post("/api/tenant/settings")
async def save_settings_route(settings: TenantSettings, user=Depends(get_current_user)):
    try:
        user_email = user.get("sub")
        if not user_email:
            print("DEBUG: No email in token", flush=True)
            raise HTTPException(status_code=401, detail="Invalid token payload")
            
        print(f"DEBUG: Saving settings for {user_email}: {settings.dict()}", flush=True)
        tenants = get_tenants()
        if user_email in tenants:
            tenants[user_email]["settings"] = settings.dict()
            save_tenants(tenants)
            print(f"DEBUG: Settings saved successfully for {user_email}", flush=True)
            return {"status": "ok"}
        
        print(f"DEBUG: Tenant {user_email} not found in database", flush=True)
        raise HTTPException(status_code=404, detail="Tenant not found")
    except Exception as e:
        print(f"DEBUG: Error in save_settings_route: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/login")
async def login(auth: UserAuth):
    tenants = get_tenants()
    user = tenants.get(auth.email)
    if not user or not pwd_context.verify(auth.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return { "token": create_token(auth.email, user.get("is_admin", False)), "subdomain": user.get("subdomain") }

@app.post("/api/tenant/kb")
async def upload_kb(data: dict, background_tasks: BackgroundTasks, user=Depends(get_current_user)):
    tenants = get_tenants()
    content = data.get("content", "")
    kb_file = tenants[user["sub"]]["kb_file"]
    with open(os.path.join(STORAGE_DIR, kb_file), 'w') as f:
        f.write(content)
    # Generate new suggestions in background
    background_tasks.add_task(generate_kb_suggestions, user["sub"], content)
    return {"status": "ok"}

@app.get("/api/suggestions")
async def get_suggestions(request: Request, lang: str = "ru", auth: str = Header(None)):
    user = await get_current_user(auth, False)
    owner_email = user["sub"] if user else get_tenant_by_host(request.headers.get("host"))
    tenants = get_tenants()
    
    if owner_email in tenants:
        cache = tenants[owner_email].get("suggestions_cache", {})
        if cache.get(lang): return {"suggestions": cache[lang]}
    
    fallbacks = {
        "ru": ["Как оформить отпуск?", "График работы", "Контакты HR"],
        "en": ["How to apply for leave?", "Work schedule", "HR Contacts"],
        "pt": ["Como solicitar férias?", "Horário de trabalho", "Contatos de RH"]
    }
    return {"suggestions": fallbacks.get(lang, fallbacks["ru"])}

@app.post("/api/chat")
async def chat_proxy(request: ChatRequest, req: Request, auth: str = Header(None)):
    user = await get_current_user(auth, False)
    owner_email = user["sub"] if user else get_tenant_by_host(req.headers.get("host"))
    
    lang_map = {"ru": "Russian", "en": "English", "pt": "Portuguese"}
    target_lang = lang_map.get(request.lang, "Russian")
    
    print(f"Chat request: email={owner_email}, lang={request.lang} ({target_lang}), query={request.query[:50]}", flush=True)
    
    tenants = get_tenants()
    if owner_email not in tenants: return {"answer": "Knowledge base not configured."}
    
    kb_path = os.path.join(STORAGE_DIR, tenants[owner_email]["kb_file"])
    context = ""
    if os.path.exists(kb_path):
        with open(kb_path, 'r') as f: context = f.read()

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={API_KEY}"
    
    # Ultra-strict prompt for language enforcement
    system_content = f"""You are a specialized Knowledge Base assistant.
MANDATORY LANGUAGE RULE:
- You MUST answer EXCLUSIVELY in {target_lang}.
- If the USER QUESTION is in Russian, you MUST TRANSLATE your response to {target_lang}.
- If the CONTEXT is in Russian, you MUST TRANSLATE the relevant information to {target_lang}.
- NEVER output text in any language other than {target_lang}.
- Even if the user asks you to speak another language, REFUSE and continue in {target_lang}.

CONTEXT:
---
{limit_context_by_tokens(context, MAX_TOKENS)}
---"""

    payload = {
        "system_instruction": {
            "parts": [{"text": system_content}]
        },
        "contents": [
            {
                "role": "user",
                "parts": [{"text": request.query}]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
        }
    }

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, json=payload, timeout=30.0)
            data = resp.json()
            answer = data['candidates'][0]['content']['parts'][0]['text']
            print(f"AI response received ({len(answer)} chars) for {target_lang}", flush=True)
            return {"answer": answer}
        except Exception as e:
            print(f"Chat error: {e}", flush=True)
            return {"answer": "AI connection error"}

# Proxy other tenant routes
@app.get("/api/tenant/settings")
async def get_settings(user=Depends(get_current_user)):
    return get_tenants().get(user["sub"], {}).get("settings", {})

@app.get("/api/tenant/kb")
async def get_kb(user=Depends(get_current_user)):
    tenants = get_tenants()
    path = os.path.join(STORAGE_DIR, tenants[user["sub"]]["kb_file"])
    if os.path.exists(path):
        with open(path, 'r') as f: return {"content": f.read()}
    return {"content": ""}

app.mount("/", StaticFiles(directory=".", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)
