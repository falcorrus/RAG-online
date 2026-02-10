from fastapi import FastAPI, HTTPException, Depends, Header
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

load_dotenv()
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

class TenantSettings(BaseModel):
    initiallyOpen: bool
    defaultLang: str

class ChatRequest(BaseModel):
    query: str

# --- Utils ---
def get_tenants():
    with open(TENANTS_FILE, 'r') as f:
        return json.load(f)

def save_tenants(tenants):
    with open(TENANTS_FILE, 'w') as f:
        json.dump(tenants, f, indent=4)

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
        print(f"JWT Decode Error: {e}")
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
    
    tenants[auth.email] = {
        "password": pwd_context.hash(auth.password),
        "is_admin": auth.email == "ekirshin@gmail.com",
        "settings": {"initiallyOpen": True, "defaultLang": "ru"},
        "kb_file": f"kb_{uuid.uuid4().hex}.md"
    }
    save_tenants(tenants)
    return {"token": create_token(auth.email, tenants[auth.email]["is_admin"])}

@app.post("/api/auth/login")
async def login(auth: UserAuth):
    tenants = get_tenants()
    user = tenants.get(auth.email)
    if not user or not pwd_context.verify(auth.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {"token": create_token(auth.email, user.get("is_admin", False))}

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

@app.post("/api/tenant/kb")
async def upload_kb(data: dict, user=Depends(get_required_user)):
    tenants = get_tenants()
    kb_file = tenants[user["sub"]]["kb_file"]
    content = data.get("content", "")
    print(f"Uploading KB for {user['sub']}, size: {len(content)} bytes")
    with open(os.path.join(STORAGE_DIR, kb_file), 'w') as f:
        f.write(content)
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
async def get_suggestions(user=Depends(get_optional_user)):
    owner_email = user["sub"] if user else "ekirshin@gmail.com"
    tenants = get_tenants()
    
    if owner_email not in tenants:
        return {"suggestions": []}

    kb_file = tenants[owner_email]["kb_file"]
    kb_path = os.path.join(STORAGE_DIR, kb_file)
    
    if not os.path.exists(kb_path):
        return {"suggestions": []}

    try:
        with open(kb_path, 'r') as f:
            content = f.read()

        import re
        suggestions = re.findall(r'\*\*«(.*?)»\*\*', content)
        if not suggestions:
            suggestions = re.findall(r'\*\*(.*?\?)\*\*', content)
        
        return {"suggestions": [s.strip() for s in suggestions[:5]]}
    except Exception as e:
        print(f"Suggestions Error: {e}")
        return {"suggestions": []}

# --- Admin Routes ---
@app.get("/api/admin/users")
async def list_users(user=Depends(get_required_user)):
    if not user.get("admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    tenants = get_tenants()
    return [{"email": email, "is_admin": data.get("is_admin", False)} for email, data in tenants.items()]

@app.post("/api/admin/reset-password")
async def reset_password(data: dict, user=Depends(get_required_user)):
    if not user.get("admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    tenants = get_tenants()
    target_email = data.get("email")
    if target_email in tenants:
        tenants[target_email]["password"] = pwd_context.hash(data.get("new_password"))
        save_tenants(tenants)
        return {"status": "ok"}
    raise HTTPException(status_code=404, detail="User not found")

# --- AI API ---
@app.post("/api/chat")
async def chat_proxy(request: ChatRequest, user=Depends(get_optional_user)):
    if not API_KEY:
        raise HTTPException(status_code=500, detail="API Key not configured")

    owner_email = user["sub"] if user else "ekirshin@gmail.com"
    tenants = get_tenants()
    
    if owner_email not in tenants:
        return {"answer": "База знаний еще не настроена администратором."}

    kb_file = tenants[owner_email]["kb_file"]
    kb_path = os.path.join(STORAGE_DIR, kb_file)
    context = ""
    if os.path.exists(kb_path):
        with open(kb_path, 'r') as f:
            context = f.read()

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={API_KEY}"
    prompt = f"""You are a helpful assistant for a company knowledge base. Use context to answer.
    CONTEXT:
    {context}
    USER: {request.query}"""

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, json={"contents": [{"parts": [{"text": prompt}]}]}, timeout=30.0)
            if resp.status_code != 200:
                print(f"AI Error: {resp.status_code} - {resp.text}")
                return {"answer": f"AI error: {resp.status_code}"}
            data = resp.json()
            return {"answer": data['candidates'][0]['content']['parts'][0]['text']}
        except Exception as e:
            print(f"Chat error: {e}")
            return {"answer": "AI connection error"}

app.mount("/", StaticFiles(directory=".", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)