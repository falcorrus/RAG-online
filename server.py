from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import httpx
import os
import json
import uuid
from typing import Optional, List
from dotenv import load_dotenv
from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta

load_dotenv(override=True)
API_KEY = os.getenv("GEMINI_API_KEY")
SECRET_KEY = os.getenv("JWT_SECRET", "super-secret-key-change-me")
STORAGE_DIR = "storage"
TENANTS_FILE = os.path.join(STORAGE_DIR, "tenants.json")

if not os.path.exists(STORAGE_DIR):
    os.makedirs(STORAGE_DIR)

if not os.path.exists(TENANTS_FILE):
    with open(TENANTS_FILE, 'w') as f:
        json.dump({}, f)

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
        return json.load(f)

def save_tenants(tenants):
    with open(TENANTS_FILE, 'w') as f:
        json.dump(tenants, f, indent=4)

def get_tenant_by_host(host: str):
    """Identify tenant by subdomain or return default admin email."""
    if not host:
        return "ekirshin@gmail.com"
    
    parts = host.split('.')
    # Check for subdomain like tenant.rag.reloto.ru
    # parts: ['tenant', 'rag', 'reloto', 'ru']
    if len(parts) >= 4 and parts[-3] == 'rag':
        subdomain = parts[0]
        tenants = get_tenants()
        for email, data in tenants.items():
            if data.get("subdomain") == subdomain:
                return email
    
    # Check for direct subdomain like tenant.reloto.ru (if configured that way)
    if len(parts) == 3 and parts[-2] == 'reloto':
        subdomain = parts[0]
        if subdomain != 'rag':
            tenants = get_tenants()
            for email, data in tenants.items():
                if data.get("subdomain") == subdomain:
                    return email

    return "ekirshin@gmail.com"

def create_token(email: str, is_admin: bool = False):
    payload = {
        "sub": email,
        "admin": is_admin,
        "exp": datetime.utcnow() + timedelta(days=30)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

async def get_current_user(authorization: str = Header(None), required: bool = True):
    if not authorization or not authorization.startswith("Bearer "):
        if required:
            raise HTTPException(status_code=401, detail="Missing or invalid token")
        return None
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except Exception as e:
        if required:
            raise HTTPException(status_code=401, detail="Invalid token")
        return None

# Helpers for Dependency Injection
async def get_required_user(authorization: str = Header(None)):
    return await get_current_user(authorization, required=True)

async def get_optional_user(authorization: str = Header(None)):
    return await get_current_user(authorization, required=False)

# --- Auth Routes ---
@app.post("/api/auth/register")
async def register(auth: UserAuth):
    tenants = get_tenants()
    if auth.email in tenants:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # If subdomain not provided, use email prefix
    sub = auth.subdomain or auth.email.split('@')[0]
    
    tenants[auth.email] = {
        "password": pwd_context.hash(auth.password),
        "is_admin": auth.email == "ekirshin@gmail.com",
        "subdomain": sub,
        "settings": {"initiallyOpen": True, "defaultLang": "ru"},
        "kb_file": f"kb_{uuid.uuid4().hex}.md"
    }
    save_tenants(tenants)
    return {"token": create_token(auth.email, tenants[auth.email]["is_admin"]), "subdomain": sub}

@app.post("/api/auth/login")
async def login(auth: UserAuth):
    tenants = get_tenants()
    user = tenants.get(auth.email)
    if not user or not pwd_context.verify(auth.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {"token": create_token(auth.email, user.get("is_admin", False)), "subdomain": user.get("subdomain")}

# --- Tenant Routes ---
@app.get("/api/tenant/settings")
async def get_settings(user=Depends(get_required_user)):
    tenants = get_tenants()
    return tenants[user["sub"]]["settings"]

@app.post("/api/tenant/settings")
async def save_settings(settings: TenantSettings, user=Depends(get_required_user)):
    tenants = get_tenants()
    tenants[user["sub"]]["settings"] = settings.dict()
    save_tenants(tenants)
    return {"status": "ok"}

async def generate_all_suggestions(owner_email: str, content: str):
    lang_map = {"ru": "Russian", "en": "English", "pt": "Portuguese"}
    all_suggestions = {}
    for code, name in lang_map.items():
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={API_KEY}"
            prompt = f"Based on content, generate 3 typical questions in {name}. Return ONLY JSON list of strings. CONTENT: {content[:5000]}"
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, json={"contents": [{"parts": [{"text": prompt}]}]}, timeout=10.0)
                if resp.status_code == 200:
                    data = resp.json()
                    text = data['candidates'][0]['content']['parts'][0]['text']
                    cleaned_text = text.replace('```json', '').replace('```', '').strip()
                    all_suggestions[code] = json.loads(cleaned_text)
        except:
            all_suggestions[code] = []
    
    tenants = get_tenants()
    if owner_email in tenants:
        tenants[owner_email]["suggestions_cache"] = all_suggestions
        save_tenants(tenants)

@app.post("/api/tenant/kb")
async def upload_kb(data: dict, user=Depends(get_required_user)):
    tenants = get_tenants()
    kb_file = tenants[user["sub"]]["kb_file"]
    with open(os.path.join(STORAGE_DIR, kb_file), 'w') as f:
        f.write(data.get("content", ""))
    await generate_all_suggestions(user["sub"], data.get("content", ""))
    return {"status": "ok"}

@app.get("/api/tenant/kb")
async def get_kb(user=Depends(get_required_user)):
    tenants = get_tenants()
    kb_file = tenants[user["sub"]]["kb_file"]
    path = os.path.join(STORAGE_DIR, kb_file)
    if os.path.exists(path):
        with open(path, 'r') as f:
            return {"content": f.read()}
    return {"content": ""}

@app.get("/api/suggestions")
async def get_suggestions(request: Request, lang: str = "ru", user=Depends(get_optional_user)):
    host = request.headers.get("host", "")
    owner_email = user["sub"] if user else get_tenant_by_host(host)
    tenants = get_tenants()
    
    if owner_email not in tenants:
        return {"suggestions": []}

    cache = tenants[owner_email].get("suggestions_cache", {})
    if lang in cache and cache[lang]:
        return {"suggestions": cache[lang]}

    fallback = {"ru": ["Как оформить отпуск?", "График работы"], "en": ["Work schedule", "HR Contacts"]}
    return {"suggestions": fallback.get(lang, fallback["ru"])}

# --- Admin Routes ---
@app.get("/api/admin/users")
async def list_users(user=Depends(get_required_user)):
    if not user.get("admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    tenants = get_tenants()
    return [{"email": email, "subdomain": data.get("subdomain"), "is_admin": data.get("is_admin", False)} for email, data in tenants.items()]

# --- AI API ---
@app.post("/api/chat")
async def chat_proxy(request: ChatRequest, req: Request, user=Depends(get_optional_user)):
    if not API_KEY:
        raise HTTPException(status_code=500, detail="API Key not configured")

    host = req.headers.get("host", "")
    owner_email = user["sub"] if user else get_tenant_by_host(host)
    tenants = get_tenants()
    
    if owner_email not in tenants:
        return {"answer": "База знаний еще не настроена."}

    kb_file = tenants[owner_email]["kb_file"]
    kb_path = os.path.join(STORAGE_DIR, kb_file)
    context = ""
    if os.path.exists(kb_path):
        with open(kb_path, 'r') as f:
            context = f.read()

    lang_map = {"ru": "Russian", "en": "English", "pt": "Portuguese"}
    target_lang = lang_map.get(request.lang, "Russian")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={API_KEY}"
    prompt = f"""You are a specialized Knowledge Base assistant. Use ONLY the provided CONTEXT.
    If answer is not in CONTEXT, say you don't know. Answer in {target_lang}.
    CONTEXT: {context}
    USER: {request.query}"""

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, json={"contents": [{"parts": [{"text": prompt}]}]}, timeout=30.0)
            data = resp.json()
            return {"answer": data['candidates'][0]['content']['parts'][0]['text']}
        except:
            return {"answer": "AI connection error"}

app.mount("/", StaticFiles(directory=".", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)
