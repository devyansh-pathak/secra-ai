
import os
import json
import uuid
import shutil
import datetime
from pathlib import Path
from collections import deque

os.environ["AGNO_TELEMETRY"] = "false"

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    import jwt
except ImportError:
    jwt = None

from main_agent import secra_team

app = FastAPI(title="SECra AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://solid-space-disco-97457x9pxq4vhx95-5173.app.github.dev",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("knowledge_base/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

DB_DIR = Path("./db")
DB_DIR.mkdir(parents=True, exist_ok=True)
CONV_FILE = DB_DIR / "conversations.json"

SECRET_KEY = "secra-secret-change-in-production"

# ── In-memory system logs ring buffer ────────────────────
_system_logs = deque(maxlen=20)

def push_log(key, val, ok=False):
    _system_logs.appendleft({
        "key": key,
        "val": val,
        "ok":  ok,
        "ts":  datetime.datetime.utcnow().strftime("%H:%M:%S")
    })

# ── Conversation helpers ──────────────────────────────────
def load_convs():
    try:
        with open(CONV_FILE) as f:
            return json.load(f)
    except:
        return {}

def save_convs(data):
    with open(CONV_FILE, "w") as f:
        json.dump(data, f)

def get_group(ts):
    try:
        now  = datetime.datetime.utcnow()
        dt   = datetime.datetime.fromisoformat(ts)
        diff = (now - dt).days
        if diff == 0: return "Today"
        if diff == 1: return "Yesterday"
        return "Earlier"
    except:
        return "Earlier"

def get_role(uid):
    prefix = uid.upper()[:3]
    return {
        "ENG": "Engineer",
        "MAG": "Manager",
        "OFF": "Safety Officer",
        "ADM": "Administrator",
    }.get(prefix, "Engineer")


# ── Models ────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message:    str
    user_id:    str = "anonymous"
    session_id: str = "default"

class ChatResponse(BaseModel):
    success: bool
    answer:  str
    sources: list = []

class LoginRequest(BaseModel):
    user_id:  str
    password: str
    name:     str = ""

class ConversationSave(BaseModel):
    session_id: str
    title:      str
    user_id:    str


# ── AUTH ──────────────────────────────────────────────────
@app.post("/api/v1/auth/login")
def login(body: LoginRequest):
    if not body.user_id.strip():
        raise HTTPException(status_code=401, detail="Invalid credentials")

    role = get_role(body.user_id)
    user = {
        "name": body.name.strip() or body.user_id,
        "role": role,
        "id":   body.user_id,
    }

    token = ""
    if jwt:
        token = jwt.encode({
            "user_id": body.user_id,
            "name":    user["name"],
            "role":    role,
            "exp":     datetime.datetime.utcnow() + datetime.timedelta(hours=8)
        }, SECRET_KEY, algorithm="HS256")

    push_log("Auth", f"{user['name']} signed in", ok=True)
    return {"success": True, "token": token, "user": user}

@app.post("/api/v1/auth/logout")
def logout():
    return {"success": True}


# ── HEALTH ────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "model": "qwen2.5:7b"}


# ── CHAT ──────────────────────────────────────────────────
@app.post("/api/v1/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    try:
        push_log("API Call", "Received", ok=True)

        response = secra_team.run(
            req.message,
            user_id=req.user_id,
            session_id=req.session_id,
        )

        answer = ""
        if hasattr(response, "content"):
            answer = response.content or ""
        elif hasattr(response, "messages"):
            for msg in reversed(response.messages):
                if hasattr(msg, "content") and msg.content:
                    answer = msg.content
                    break

        if not answer:
            answer = "I could not generate a response. Please try again."

        push_log("Model Status", "Active",      ok=True)
        push_log("API Call",    "Successful",   ok=True)
        push_log("Agent",       "Ready",        ok=True)
        push_log("Error",       "None",         ok=False)

        return ChatResponse(success=True, answer=answer, sources=[])

    except Exception as e:
        push_log("Error", str(e)[:30], ok=False)
        raise HTTPException(status_code=500, detail=str(e))


# ── DOCUMENTS ─────────────────────────────────────────────
@app.post("/api/v1/knowledge/ingest")
async def upload_document(file: UploadFile = File(...)):
    try:
        ext     = Path(file.filename).suffix.lower()
        allowed = {".pdf",".docx",".txt",".jpg",".jpeg",".png",".tiff"}
        if ext not in allowed:
            raise HTTPException(status_code=400, detail=f"File type {ext} not supported.")
        save_path = UPLOAD_DIR / file.filename
        with save_path.open("wb") as f:
            shutil.copyfileobj(file.file, f)
        push_log("Document", f"Uploaded {file.filename[:20]}", ok=True)
        return {
            "success":  True,
            "filename": file.filename,
            "path":     str(save_path),
            "id":       str(uuid.uuid4()),
            "status":   "ready",
            "ext":      ext.lstrip("."),
            "type":     "Document",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/knowledge")
def list_documents():
    docs = []
    for i, path in enumerate(UPLOAD_DIR.iterdir()):
        if path.is_file():
            docs.append({
                "id":     str(i + 1),
                "name":   path.stem,
                "type":   "Document",
                "status": "ready",
                "ext":    path.suffix.lower().lstrip("."),
            })
    return docs

@app.delete("/api/v1/knowledge/{doc_id}")
def delete_document(doc_id: str):
    for path in UPLOAD_DIR.iterdir():
        if path.stem == doc_id or path.name == doc_id:
            path.unlink()
            return {"success": True}
    raise HTTPException(status_code=404, detail="Document not found.")


# ── CONVERSATIONS ─────────────────────────────────────────
@app.post("/api/v1/conversations")
def save_conversation(data: ConversationSave):
    convs = load_convs()
    uid   = data.user_id
    if uid not in convs:
        convs[uid] = []
    # avoid duplicates
    convs[uid] = [c for c in convs[uid] if c["id"] != data.session_id]
    convs[uid].insert(0, {
        "id":    data.session_id,
        "title": data.title[:42],
        "ts":    datetime.datetime.utcnow().isoformat(),
    })
    convs[uid] = convs[uid][:50]
    save_convs(convs)
    return {"success": True, "id": data.session_id}

@app.get("/api/v1/conversations/{user_id}")
def get_conversations(user_id: str):
    convs = load_convs().get(user_id, [])
    return [
        {"id": c["id"], "title": c["title"], "group": get_group(c["ts"])}
        for c in convs
    ]


# ── ADMIN ────────────────────────────────────────────

@app.get("/api/v1/admin/logs")
def get_logs():
    return list(_system_logs)

@app.get("/api/v1/admin/audit")
def audit_logs():
    return []

@app.get("/api/v1/admin/health")
def system_health():
    return {
        "ai":           "operational",
        "knowledge_base":"operational",
        "database":     "operational",
        "gpu":          0,
        "response_time":0,
        "storage":      0,
        "network":      "LAN only",
        "active_users": 0,
    }