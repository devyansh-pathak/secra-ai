import os
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from database import get_db, Document, DocumentChunk, AuditLog, User
from app.services.ai_engine import extract_text_from_file, chunk_pages

router = APIRouter(prefix="/knowledge", tags=["knowledge"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("")
def list_documents(db: Session = Depends(get_db)):
    docs = db.query(Document).order_by(Document.uploaded_at.desc()).all()
    result = []
    for d in docs:
        ext = d.filename.split(".")[-1].lower() if "." in d.filename else "pdf"
        result.append({
            "id": d.id,
            "name": d.filename,
            "type": d.classification.upper() if d.classification else "SOP",
            "status": d.status,
            "ext": ext,
            "pageCount": d.page_count or 1,
            "uploadedAt": d.uploaded_at.isoformat() if d.uploaded_at else ""
        })
    return result

@router.post("/ingest")
async def ingest_document(
    file: UploadFile = File(...),
    doc_type: str = Form("SOP"),
    db: Session = Depends(get_db)
):
    doc_id = str(uuid.uuid4())
    filename = file.filename or f"uploaded_doc_{doc_id[:8]}"
    ext = filename.split(".")[-1].lower() if "." in filename else "bin"
    stored_filename = f"{doc_id}_{filename}"
    file_path = os.path.join(UPLOAD_DIR, stored_filename)

    # Read and save file
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Find owner (default to first user)
    owner = db.query(User).first()
    owner_id = owner.id if owner else "default_user"

    # Create document record
    doc = Document(
        id=doc_id,
        filename=filename,
        stored_filename=stored_filename,
        file_type=ext,
        checksum=f"chk_{doc_id[:12]}",
        file_size=len(content),
        department="Refinery Operations",
        classification=doc_type.lower(),
        owner_id=owner_id,
        status="processing",
        uploaded_at=datetime.utcnow()
    )
    db.add(doc)
    db.commit()

    # Process extraction & chunking
    try:
        pages = extract_text_from_file(file_path)
        chunks = chunk_pages(pages)

        for c in chunks:
            chunk_record = DocumentChunk(
                id=str(uuid.uuid4()),
                document_id=doc_id,
                chunk_index=c["chunk_index"],
                page_number=c["page_number"],
                text=c["text"],
                created_at=datetime.utcnow()
            )
            db.add(chunk_record)

        doc.page_count = len(pages)
        doc.status = "ready"
        doc.indexed_at = datetime.utcnow()
        db.commit()

        # Audit log
        db.add(AuditLog(
            user_id=owner_id,
            action=f"Uploaded {filename}",
            resource=f"/knowledge/{doc_id}",
            status="success",
            risk_level="low",
            details=f"Document ingested: {len(pages)} pages, {len(chunks)} chunks indexed."
        ))
        db.commit()

    except Exception as e:
        doc.status = "failed"
        doc.error_message = str(e)[:300]
        db.commit()
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {e}")

    return {
        "success": True,
        "id": doc_id,
        "name": filename,
        "type": doc_type,
        "status": "ready",
        "ext": ext,
        "pages": len(pages),
        "chunks": len(chunks)
    }

@router.delete("/{doc_id}")
def delete_document(doc_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter_by(id=doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove file from disk
    stored_path = os.path.join(UPLOAD_DIR, doc.stored_filename)
    if os.path.exists(stored_path):
        try:
            os.remove(stored_path)
        except Exception:
            pass

    # Delete DB records
    db.delete(doc)
    db.commit()

    return {"success": True, "id": doc_id}
