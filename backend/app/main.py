"""
FastAPI Server for Secra AI.
Integrates RAG, OCR, Industrial Visual Inspection, Knowledge Base, and Admin Audit Logging.
"""

import os
import sys

# Ensure backend root is in sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import init_db, SessionLocal, Document, DocumentChunk, User
from app.api.auth import router as auth_router
from app.api.chat import router as chat_router
from app.api.knowledge import router as knowledge_router
from app.api.admin import router as admin_router
from datetime import datetime
import uuid

def seed_demo_knowledge():
    """Seeds baseline refinery SOPs into the knowledge base if empty."""
    db = SessionLocal()
    try:
        if db.query(Document).count() == 0:
            owner = db.query(User).first()
            owner_id = owner.id if owner else "demo_owner"

            demo_docs = [
                {
                    "title": "Pump Maintenance SOP.pdf",
                    "type": "sop",
                    "text": (
                        "Standard Operating Procedure: Rotating Equipment & Centrifugal Pumps (SOP-P-204).\n"
                        "1. Routine Inspection: Inspect rotating pumps every 3 months. Verify bearing vibration below 4.5 mm/s RMS.\n"
                        "2. Bearing Temperature: Operating temperature must remain strictly below 70°C.\n"
                        "3. Lockout/Tagout (LOTO): Prior to disassembly, isolate upstream suction valve and downstream discharge valve, bleed pressure, and attach safety lock."
                    )
                },
                {
                    "title": "Refinery Safety Manual 2024.pdf",
                    "type": "manual",
                    "text": (
                        "Refinery Plant Safety Manual (Section 8 - Critical Hazards & Evacuation).\n"
                        "1. Hazardous Atmospheres: Continuous H2S monitoring required in crude distillation unit.\n"
                        "2. Hot Work Permits: Any welding or spark-producing tool requires hot work permit signed by shift safety officer.\n"
                        "3. Evacuation Protocol: In event of gas release horn sounding (continuous tone), immediately evacuate upwind toward designated assembly point."
                    )
                },
                {
                    "title": "Compressor Inspection Guide.docx",
                    "type": "manual",
                    "text": (
                        "Compressor Inspection Protocol (CIP-702).\n"
                        "1. Check suction filter differential pressure daily; replace cartridges if dP exceeds 15 psi.\n"
                        "2. Lube oil sampling every 500 operating hours to check for particle contamination and viscosity breakdown."
                    )
                }
            ]

            for d in demo_docs:
                doc_id = str(uuid.uuid4())
                doc = Document(
                    id=doc_id,
                    filename=d["title"],
                    stored_filename=f"demo_{d['title']}",
                    file_type=d["title"].split(".")[-1],
                    checksum=f"chk_{doc_id[:10]}",
                    file_size=len(d["text"]),
                    department="Refinery Operations",
                    classification=d["type"],
                    owner_id=owner_id,
                    status="ready",
                    page_count=1,
                    uploaded_at=datetime.utcnow(),
                    indexed_at=datetime.utcnow()
                )
                db.add(doc)
                chunk = DocumentChunk(
                    id=str(uuid.uuid4()),
                    document_id=doc_id,
                    chunk_index=0,
                    page_number=1,
                    text=d["text"],
                    created_at=datetime.utcnow()
                )
                db.add(chunk)
            db.commit()
    except Exception as e:
        db.rollback()
        print(f"Warning seeding demo knowledge: {e}")
    finally:
        db.close()

# Guarantee DB initialized on import
try:
    init_db()
    seed_demo_knowledge()
except Exception as _e:
    print(f"Startup DB init: {_e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_demo_knowledge()
    yield

app = FastAPI(
    title="Secra AI API",
    version="1.0.0",
    description="Industrial Refinery Operations & Safety AI Platform",
    lifespan=lifespan
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")
app.include_router(knowledge_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")

@app.get("/")
def root():
    return {
        "name": "Secra AI API",
        "status": "online",
        "version": "1.0.0",
        "endpoints": {
            "docs": "/docs",
            "chat": "/api/v1/chat",
            "knowledge": "/api/v1/knowledge",
            "audit_logs": "/api/v1/admin/audit-logs",
            "system_health": "/api/v1/admin/system-health"
        }
    }
