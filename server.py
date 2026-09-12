# server.py
import os
os.environ["AGNO_TELEMETRY"] = "false"

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
import shutil
import uuid

from main_agent import secra_team

app = FastAPI(title="SECra AI Backend")

# ── CORS — allow the React dev server ────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("knowledge_base/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ── Request / Response models ─────────────────────────────

class ChatRequest(BaseModel):
    message: str
    user_id: str = "anonymous"
    session_id: str = "default"

class ChatResponse(BaseModel):
    success: bool
    answer: str
    sources: list = []


# ── Routes ────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "model": "qwen2.5:7b"}


@app.post("/api/v1/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """
    Main chat endpoint.
    The secra_team automatically routes to:
      - rag_agent    → if message references a PDF path
      - ocr_agent    → if message references an image path
      - general_agent → everything else
    """
    try:
        # secra_team.print_response returns a RunResponse object
        # We collect the text content from it
        response = secra_team.run(
            req.message,
            user_id=req.user_id,
            session_id=req.session_id,
        )

        # Extract answer text from the response
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

        return ChatResponse(success=True, answer=answer, sources=[])

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/knowledge/ingest")
async def upload_document(file: UploadFile = File(...)):
    """
    Saves uploaded file to knowledge_base/uploads/
    Frontend can then reference it in chat messages.
    """
    try:
        ext = Path(file.filename).suffix.lower()
        allowed = {".pdf", ".docx", ".txt", ".jpg", ".jpeg", ".png", ".tiff"}

        if ext not in allowed:
            raise HTTPException(status_code=400, detail=f"File type {ext} not supported.")

        # Save with original name (or unique name to avoid collisions)
        save_path = UPLOAD_DIR / file.filename
        with save_path.open("wb") as f:
            shutil.copyfileobj(file.file, f)

        return {
            "success": True,
            "filename": file.filename,
            "path": str(save_path),
            "id": str(uuid.uuid4()),
            "status": "ready",
            "ext": ext.lstrip("."),
            "type": "Document",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/knowledge")
def list_documents():
    """Returns all uploaded files in knowledge_base/uploads/"""
    docs = []
    for i, path in enumerate(UPLOAD_DIR.iterdir()):
        if path.is_file():
            docs.append({
                "id": str(i + 1),
                "name": path.stem,
                "type": "Document",
                "status": "ready",
                "ext": path.suffix.lower().lstrip("."),
            })
    return docs


@app.delete("/api/v1/knowledge/{doc_id}")
def delete_document(doc_id: str):
    """Delete a document by name (doc_id = filename stem)."""
    for path in UPLOAD_DIR.iterdir():
        if path.stem == doc_id or path.name == doc_id:
            path.unlink()
            return {"success": True}
    raise HTTPException(status_code=404, detail="Document not found.")


@app.get("/api/v1/admin/audit")
def audit_logs():
    """Returns recent audit log entries from the DB."""
    # Audit logs are in SQLite via AuditLog model in retrieval.py
    # For now returns empty — wire to DB session when needed
    return []


@app.get("/api/v1/admin/health")
def system_health():
    return {
        "ai": "operational",
        "knowledge_base": "operational",
        "database": "operational",
        "gpu": 0,
        "response_time": 0,
        "storage": 0,
        "network": "LAN only",
        "active_users": 0,
    }
