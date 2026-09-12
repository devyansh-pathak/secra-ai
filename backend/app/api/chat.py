import os
import uuid
import base64
from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from database import get_db, AuditLog, ChatMessage, ChatSession, User, Document, DocumentChunk
from app.services.ai_engine import (
    answer_query_with_rag,
    analyze_equipment_image,
    extract_text_from_file,
    chunk_pages,
    analyze_uploaded_document
)

router = APIRouter(prefix="/chat", tags=["chat"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class ChatRequest(BaseModel):
    message: Optional[str] = ""
    conversationId: Optional[Any] = None
    imageBase64: Optional[str] = None
    fileBase64: Optional[str] = None
    fileName: Optional[str] = None
    userId: Optional[str] = "Pari"
    language: Optional[str] = "English"

@router.post("")
def chat_endpoint(payload: ChatRequest, db: Session = Depends(get_db)):
    import json
    msg = (payload.message or "").strip()
    user_id = payload.userId or "Pari"
    lang = payload.language or "English"

    # Ensure conversation session exists or create one automatically
    conv_id = payload.conversationId
    session_obj = None
    if conv_id and str(conv_id).isdigit() is False:
        session_obj = db.query(ChatSession).filter(ChatSession.id == str(conv_id)).first()
    
    if not session_obj:
        owner = db.query(User).first()
        owner_id = owner.id if owner else "default_user"
        title_text = (msg[:35] + "...") if len(msg) > 35 else (msg or (payload.fileName or "New Chat"))
        session_obj = ChatSession(
            id=str(uuid.uuid4()),
            user_id=owner_id,
            title=title_text
        )
        db.add(session_obj)
        db.commit()
        conv_id = session_obj.id

    def record_chat(role: str, content_data: Any):
        try:
            db.add(ChatMessage(
                id=str(uuid.uuid4()),
                session_id=session_obj.id,
                role=role,
                content=json.dumps(content_data) if isinstance(content_data, (dict, list)) else str(content_data)
            ))
            db.commit()
        except Exception:
            db.rollback()

    # Record incoming user message
    user_record = {"type": "user", "text": msg}
    if payload.fileName:
        user_record["fileInfo"] = {"name": payload.fileName}
    if payload.imageBase64:
        user_record["imageUrl"] = payload.imageBase64
    record_chat("user", user_record)

    # 1. Handle Document Attachment in Chat (PDF, DOCX, TXT, etc.)
    if payload.fileBase64 and payload.fileName:
        filename = payload.fileName
        doc_id = str(uuid.uuid4())
        ext = filename.split(".")[-1].lower() if "." in filename else "bin"
        stored_filename = f"{doc_id}_{filename}"
        file_path = os.path.join(UPLOAD_DIR, stored_filename)

        try:
            # Strip data URL prefix if present (e.g. data:application/pdf;base64,...)
            raw_b64 = payload.fileBase64
            if "," in raw_b64:
                raw_b64 = raw_b64.split(",", 1)[1]
            file_bytes = base64.b64decode(raw_b64)
            with open(file_path, "wb") as f:
                f.write(file_bytes)

            # Extract text
            pages = extract_text_from_file(file_path)

            # Save in database for future RAG queries
            owner = db.query(User).first()
            owner_id = owner.id if owner else "default_user"
            doc_record = Document(
                id=doc_id,
                filename=filename,
                stored_filename=stored_filename,
                file_type=ext,
                checksum=f"chk_{doc_id[:10]}",
                file_size=len(file_bytes),
                department="Refinery Operations",
                classification="chat_upload",
                owner_id=owner_id,
                status="ready",
                page_count=len(pages),
                uploaded_at=datetime.utcnow(),
                indexed_at=datetime.utcnow()
            )
            db.add(doc_record)

            chunks = chunk_pages(pages)
            for c in chunks:
                db.add(DocumentChunk(
                    id=str(uuid.uuid4()),
                    document_id=doc_id,
                    chunk_index=c["chunk_index"],
                    page_number=c["page_number"],
                    text=c["text"],
                    created_at=datetime.utcnow()
                ))
            db.commit()

            # Generate deep ChatGPT-style document insights
            analysis_result = analyze_uploaded_document(filename, pages, user_prompt=msg, language=lang)

            # Log audit
            db.add(AuditLog(
                user_id=user_id,
                action=f"Analyzed document: {filename}",
                resource=f"/chat/file/{doc_id}",
                status="success",
                risk_level="low",
                details=f"File {filename} read ({len(pages)} pages) and analyzed with insights."
            ))
            db.commit()

            ai_resp = {"type": "ai", "response": analysis_result, "conversationId": conv_id}
            record_chat("ai", ai_resp)
            return ai_resp

        except Exception as e:
            db.rollback()
            err_resp = {
                "type": "ai",
                "response": {
                    "text": f"⚠️ Error processing file '{filename}': {e}. Please ensure the file is a valid PDF, DOCX, or text file.",
                    "sources": [],
                    "safety": False,
                    "uncertain": True
                },
                "conversationId": conv_id
            }
            record_chat("ai", err_resp)
            return err_resp

    # 2. Handle Equipment Image Inspection
    if payload.imageBase64:
        analysis = analyze_equipment_image(payload.imageBase64, prompt=msg, language=lang)
        try:
            db.add(AuditLog(
                user_id=user_id,
                action="Analyzed equipment image",
                resource="/chat/image",
                status="success",
                risk_level="medium",
                details=f"Visual inspection performed via OCR / vision pipeline in {lang}."
            ))
            db.commit()
        except Exception:
            db.rollback()

        img_resp = {
            "type": "img-analysis",
            "analysis": analysis,
            "conversationId": conv_id
        }
        record_chat("ai", img_resp)
        return img_resp

    # 3. Handle Standard Text / Conversational RAG Query
    rag_result = answer_query_with_rag(msg, db, language=lang)

    risk = "high" if rag_result.get("safety") else "low"
    try:
        db.add(AuditLog(
            user_id=user_id,
            action=f"Asked: {msg[:40]}...",
            resource="/chat",
            status="success",
            risk_level=risk,
            details=f"Query answered in {lang} with {len(rag_result.get('sources', []))} citations."
        ))
        db.commit()
    except Exception:
        db.rollback()

    text_resp = {
        "type": "ai",
        "response": rag_result,
        "conversationId": conv_id
    }
    record_chat("ai", text_resp)
    return text_resp

class SessionCreateRequest(BaseModel):
    title: Optional[str] = "New Conversation"
    userId: Optional[str] = "Pari"

@router.get("/sessions")
def list_sessions(userId: Optional[str] = "Pari", db: Session = Depends(get_db)):
    """List all saved chat conversations."""
    sessions = db.query(ChatSession).order_by(ChatSession.created_at.desc()).all()
    results = []
    now = datetime.utcnow()
    for s in sessions:
        diff_days = (now - s.created_at).days
        if diff_days == 0:
            group = "Today"
        elif diff_days == 1:
            group = "Yesterday"
        else:
            group = "Earlier"
        results.append({
            "id": s.id,
            "title": s.title or "Untitled Chat",
            "group": group,
            "createdAt": s.created_at.isoformat()
        })
    return results

@router.post("/sessions")
def create_session(payload: SessionCreateRequest, db: Session = Depends(get_db)):
    """Create a new chat conversation session."""
    owner = db.query(User).first()
    owner_id = owner.id if owner else "default_user"
    sess = ChatSession(
        id=str(uuid.uuid4()),
        user_id=owner_id,
        title=payload.title or "New Conversation"
    )
    db.add(sess)
    db.commit()
    return {"id": sess.id, "title": sess.title, "group": "Today"}

@router.get("/sessions/{session_id}/messages")
def get_session_messages(session_id: str, db: Session = Depends(get_db)):
    """Retrieve messages for a specific session."""
    msgs = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).all()
    out = []
    import json
    for m in msgs:
        try:
            parsed = json.loads(m.content)
            out.append(parsed)
        except Exception:
            out.append({"type": m.role, "text": m.content})
    return out

@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db)):
    """Delete a chat conversation session."""
    sess = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if sess:
        db.delete(sess)
        db.commit()
        return {"success": True}
    return {"success": False, "error": "Not found"}

