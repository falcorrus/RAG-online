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
import subprocess
import asyncio

load_dotenv(override=True)
API_KEY = os.getenv("GEMINI_API_KEY")
SECRET_KEY = os.getenv("JWT_SECRET", "super-secret-key-change-me")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
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
    sourceText: Optional[str] = None

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

def get_subdomain_by_email(email: str):
    tenants = get_tenants()
    tenant = tenants.get(email)
    if tenant and tenant.get("subdomain"):
        return tenant["subdomain"]
    # Fallback for new registrations or legacy
    return re.sub(r'[^a-zA-Z0-9]', '_', email.lower())

def get_tenant_dir(subdomain: str):
    """Returns the path to the tenant's private directory, creating it if needed."""
    path = os.path.join(STORAGE_DIR, subdomain)
    if not os.path.exists(path):
        os.makedirs(path, exist_ok=True)
    return path

def get_tenant_log_path(email: str):
    sub = get_subdomain_by_email(email)
    return os.path.join(get_tenant_dir(sub), "logs.json")

def load_tenant_logs(email: str) -> List[dict]:
    path = get_tenant_log_path(email)
    if os.path.exists(path):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return []
    return []

def save_tenant_logs(email: str, logs: List[dict]):
    path = get_tenant_log_path(email)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(logs, f, indent=4, ensure_ascii=False)

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
    print(f"DEBUG: Starting generate_kb_suggestions for {owner_email}", flush=True)
    lang_map = {"ru": "Russian", "en": "English", "pt": "Portuguese"}
    all_suggestions = {}
    all_names = {}
    detected_lang_code = "ru" # Default to Russian if detection fails
    
    # Heuristic for language detection of KB content
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={API_KEY}"
        prompt = f"Detect the primary language of the following text. Return ONLY the 2-letter ISO 639-1 code (e.g., 'en', 'ru', 'pt'). Text: {content[:1000]}"
        print(f"DEBUG: Sending lang detection prompt for {owner_email}", flush=True)
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json={"contents": [{"parts": [{"text": prompt}]}]}, timeout=5.0)
            if resp.status_code == 200:
                code = resp.json()['candidates'][0]['content']['parts'][0]['text'].strip().lower()
                if code in lang_map:
                    detected_lang_code = code
                    print(f"DEBUG: Detected language for {owner_email}: {detected_lang_code}", flush=True)
            else:
                print(f"ERROR: Lang detection API call failed with status {resp.status_code}: {resp.text}", flush=True)
    except Exception as e:
        print(f"ERROR: Error detecting language for {owner_email}: {e}", flush=True)

    # Simple heuristic if AI fails
    found_q = re.findall(r'\*\*(.*?\?)\*\*', content)
    
    # Clean content from HTML comments before sending to AI
    clean_content_for_ai = re.sub(r'<!--.*?-->', '', content, flags=re.DOTALL)
    
    for code, lang_name in lang_map.items():
        print(f"DEBUG: Generating suggestions for {owner_email} in language {code}", flush=True)
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={API_KEY}"
            
            # Apply token limit to content for prompt
            limited_content = limit_context_by_tokens(clean_content_for_ai, 2000) # Use 2000 tokens for suggestions/name extraction
            
            prompt = f"""Analyze this Knowledge Base. 
1. Generate 3 typical short questions in {lang_name}. The questions MUST be directly and comprehensively answerable using ONLY the provided KB text.
2. Extract the Business Name from the "## Название" section under "Общие настройки" and TRANSLATE it into {lang_name}.
3. Extract the Under-Answer Text (signature) from the "## Подпись" section under "Общие настройки". Keep it EXACTLY as it appears, but translated to {lang_name} ONLY if it contains descriptive labels (e.g., "Contact:"). 
Return ONLY a JSON object: {{"suggestions": ["q1", "q2", "q3"], "businessName": "Name", "underAnswerText": "Contact info"}}.
KB: {limited_content}"""
            
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, json={"contents": [{"parts": [{"text": prompt}]}]}, timeout=15.0)
                if resp.status_code == 200:
                    text = resp.json()['candidates'][0]['content']['parts'][0]['text']
                    clean_text = re.sub(r'```json\s*|\s*```', '', text).strip()
                    try:
                        data = json.loads(clean_text)
                        all_suggestions[code] = data.get("suggestions", [])
                        
                        b_name = data.get("businessName", "").strip()
                        # If English name still contains Cyrillic, try to strip it or use fallback
                        if code == "en" and any('\u0400' <= c <= '\u04FF' for c in b_name):
                            b_name = re.sub(r'\s*\([\u0400-\u04FF\s]+\)', '', b_name)
                            if any('\u0400' <= c <= '\u04FF' for c in b_name):
                                b_name = "AI Knowledge Base" 
                        all_names[code] = b_name
                        
                        if "under_answers" not in locals(): under_answers = {}
                        under_answers[code] = data.get("underAnswerText", "").strip()
                        
                        print(f"DEBUG: Generated for {owner_email}, {code}: suggestions={len(all_suggestions[code])}, name={all_names[code]}, underAnswer={under_answers[code]}", flush=True)
                    except json.JSONDecodeError as json_err:
                        print(f"ERROR: JSONDecodeError for {code}: {json_err}")
                        all_suggestions[code] = found_q[:3]
        except Exception as e:
            print(f"ERROR: Error generating suggestions for {code}: {e}")
    
    tenants = get_tenants()
    if owner_email in tenants:
        tenants[owner_email]["suggestions_cache"] = all_suggestions
        tenants[owner_email]["business_names_cache"] = all_names
        if "under_answers" in locals():
            tenants[owner_email]["underAnswer_cache"] = under_answers
        tenants[owner_email]["settings"]["defaultLang"] = detected_lang_code 
        save_tenants(tenants)

async def send_telegram_notification(message: str):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("DEBUG: Telegram notification skipped (missing config)", flush=True)
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "Markdown"}
    async with httpx.AsyncClient() as client:
        try:
            await client.post(url, json=payload, timeout=5.0)
        except Exception as e:
            print(f"ERROR: Failed to send Telegram notification: {e}", flush=True)

async def run_ssl_setup(subdomain: str):
    """Runs the SSL setup script for a new subdomain."""
    try:
        script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "setup_ssl.sh")
        if os.path.exists(script_path):
            print(f"DEBUG: Starting SSL setup for {subdomain}...", flush=True)
            # Run the script. It requires sudo, so ensure the server process has rights or script handles it.
            # In your setup_ssl.sh, there is a check for EUID -ne 0.
            process = await asyncio.create_subprocess_exec(
                "bash", script_path, subdomain,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                print(f"DEBUG: SSL setup successful for {subdomain}", flush=True)
            else:
                print(f"ERROR: SSL setup failed for {subdomain}: {stderr.decode()}", flush=True)
        else:
            print(f"ERROR: setup_ssl.sh not found at {script_path}", flush=True)
    except Exception as e:
        print(f"ERROR: Exception during SSL setup for {subdomain}: {e}", flush=True)

# --- Routes ---
@app.post("/api/auth/register")
async def register(auth: UserAuth, background_tasks: BackgroundTasks):
    email = auth.email.strip().lower() if auth.email else ""
    password = auth.password if auth.password else ""
    subdomain = auth.subdomain.strip().lower() if auth.subdomain else ""

    print(f"DEBUG: Registration attempt for email: '{email}', subdomain: '{subdomain}'", flush=True)

    if not email or not password or not subdomain:
        print(f"DEBUG: Registration failed - missing required fields", flush=True)
        raise HTTPException(status_code=400, detail="Email, password, and subdomain are required")

    tenants = get_tenants()
    if email in tenants:
        print(f"DEBUG: Registration failed - user '{email}' already exists", flush=True)
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Cleanup subdomain (alphanumeric and hyphens only)
    sub = re.sub(r'[^a-zA-Z0-9-]', '', subdomain)
    
    if not sub:
        raise HTTPException(status_code=400, detail="Invalid subdomain format")
    
    # Check for subdomain uniqueness
    for existing_email, data in tenants.items():
        if data.get("subdomain") == sub:
            print(f"DEBUG: Registration failed - subdomain '{sub}' taken", flush=True)
            raise HTTPException(status_code=400, detail=f"Subdomain '{sub}' is already taken")
    
    # Create directory immediately
    get_tenant_dir(sub)
    
    tenants[email] = {
        "password": pwd_context.hash(auth.password),
        "is_admin": email == "ekirshin@gmail.com",
        "subdomain": sub,
        "settings": {"initiallyOpen": True},
        "suggestions_cache": {}
    }
    save_tenants(tenants)
    
    # Send notification
    now = datetime.now().strftime("%d.%m.%Y %H:%M")
    notif_msg = f"🚀 *Новая регистрация в RAG-online!*\n\n📧 *Email:* `{email}`\n🌐 *Поддомен:* `{sub}`\n⏰ *Время:* {now}"
    background_tasks.add_task(send_telegram_notification, notif_msg)
    background_tasks.add_task(run_ssl_setup, sub)
    
    print(f"DEBUG: Registration successful for '{email}'", flush=True)
    return { "token": create_token(email, tenants[email]["is_admin"]), "subdomain": sub }

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
            
        # Use automated under-answer text from KB
        settings["underAnswerText"] = tenant.get("underAnswer_cache", {}).get(lang)
        if not settings["underAnswerText"]:
             settings["underAnswerText"] = ""
            
        sub = tenant.get("subdomain", get_subdomain_by_email(owner_email))
        settings["subdomain"] = sub
        kb_path = os.path.join(get_tenant_dir(sub), "base.md")
        settings["kb_exists"] = os.path.exists(kb_path) and os.path.getsize(kb_path) > 0
        return settings
    return {"initiallyOpen": True, "businessName": "AI Knowledge Base", "kb_exists": False, "subdomain": ""}

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
            # Only update initiallyOpen, defaultLang and businessName are handled by KB logic
            tenants[user_email]["settings"]["initiallyOpen"] = settings.initiallyOpen
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
    email = auth.email.strip().lower()
    print(f"DEBUG: Login attempt for email: '{email}'", flush=True)
    tenants = get_tenants()
    user = tenants.get(email)
    if not user:
        print(f"DEBUG: Login failed - user '{email}' not found in tenants", flush=True)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not pwd_context.verify(auth.password, user["password"]):
        print(f"DEBUG: Login failed - password mismatch for '{email}'", flush=True)
        raise HTTPException(status_code=401, detail="Invalid credentials")
        
    print(f"DEBUG: Login successful for '{email}'", flush=True)
    return { "token": create_token(email, user.get("is_admin", False)), "subdomain": user.get("subdomain") }

@app.post("/api/tenant/kb")
async def upload_kb(data: dict, background_tasks: BackgroundTasks, user=Depends(get_current_user)):
    owner_email = user["sub"]
    tenants = get_tenants()
    print(f"DEBUG: upload_kb attempt for {owner_email}. Tenants keys: {list(tenants.keys())}", flush=True)
    if owner_email not in tenants:
        print(f"ERROR: Tenant {owner_email} not found in tenants list!", flush=True)
        raise HTTPException(status_code=404, detail="Tenant not found")

    content = data.get("content", "")
    sub = get_subdomain_by_email(owner_email)
    kb_path = os.path.join(get_tenant_dir(sub), "base.md")

    print(f"DEBUG: Attempting to save KB for {owner_email} to {kb_path} (content length: {len(content)})", flush=True)
    try:
        with open(kb_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"DEBUG: KB file saved successfully: {kb_path}", flush=True)
    except Exception as e:
        print(f"ERROR: Failed to write KB file {kb_path}: {e}", flush=True)
        raise HTTPException(status_code=500, detail=f"Failed to save knowledge base file: {e}")

    # Generate new suggestions in background
    background_tasks.add_task(generate_kb_suggestions, owner_email, content)
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
    
    sub = get_subdomain_by_email(owner_email)
    kb_path = os.path.join(get_tenant_dir(sub), "base.md")
    context = ""
    if os.path.exists(kb_path):
        with open(kb_path, 'r', encoding='utf-8') as f: 
            context = f.read()
            
    # CRITICAL: Remove General Settings section from AI context to prevent duplication
    context = re.sub(r'(?i)#\s*(Общие настройки|General Settings|Configurações|Служебная информация).*?(?=#|\Z)', '', context, flags=re.DOTALL)
    
    # Remove HTML comments to keep them hidden from AI
    context = re.sub(r'<!--.*?-->', '', context, flags=re.DOTALL)

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={API_KEY}"
    
    # Ultra-strict prompt for language enforcement
    system_content = f"""You are a helpful and professional Knowledge Base assistant.
Your goal is to provide accurate information based on the provided context.

MANDATORY RULES:
1. You MUST answer EXCLUSIVELY in {target_lang}.
2. If the user question or the context is in a different language, you MUST TRANSLATE the information and your response into {target_lang} naturally.
3. NEVER output text in any language other than {target_lang}.
4. EXCLUDE SIGNATURES: Do NOT include contact info, telegram handles, or "General Settings" data from the context in your answer. This info is already displayed in the UI.
5. Maintain a helpful and professional tone.

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
            
            # Save to individual conversation log
            logs = load_tenant_logs(owner_email)
            logs.append({
                "timestamp": datetime.now().isoformat(),
                "lang": request.lang,
                "query": request.query,
                "answer": answer
            })
            save_tenant_logs(owner_email, logs)

            print(f"AI response received ({len(answer)} chars) for {target_lang}", flush=True)
            return {"answer": answer}
        except Exception as e:
            print(f"Chat error: {e}", flush=True)
            return {"answer": "AI connection error"}

@app.get("/api/tenant/logs")
async def get_conversation_logs(user=Depends(get_current_user)):
    owner_email = user["sub"]
    return {"logs": load_tenant_logs(owner_email)}

@app.delete("/api/tenant/logs")
async def clear_conversation_logs(user=Depends(get_current_user)):
    owner_email = user["sub"]
    save_tenant_logs(owner_email, [])
    return {"status": "ok"}

# Proxy other tenant routes
@app.get("/api/tenant/settings")
async def get_settings(user=Depends(get_current_user)):
    return get_tenants().get(user["sub"], {}).get("settings", {})

@app.get("/api/tenant/kb")
async def get_kb(user=Depends(get_current_user)):
    owner_email = user["sub"]
    sub = get_subdomain_by_email(owner_email)
    kb_path = os.path.join(get_tenant_dir(sub), "base.md")
    if os.path.exists(kb_path):
        try:
            with open(kb_path, 'r', encoding='utf-8') as f:
                return {"content": f.read()}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read KB: {e}")
    return {"content": ""}

app.mount("/", StaticFiles(directory=".", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)
