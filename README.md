# Secra AI — Industrial Safety & Refinery Operations AI Assistant 🛢️⚡

> **Built for Hackathons & Industrial AI Challenges**  
> An air-gapped, verifiable AI platform connecting refinery operators, safety engineers, and maintenance teams with real-time SOP retrieval, OCR image inspection, and audit-logged decision intelligence.

---

## 🌟 Key Highlights

- **Full-Stack Monorepo**: Unified React 18 + Vite + Tailwind CSS frontend with a high-performance Python FastAPI backend.
- **RAG Architecture with Source Citations**: Every AI response cites verified document titles, page numbers, and section identifiers.
- **Visual Equipment Inspection (OCR & Vision)**: Ingests photos of pumps, valves, and flanges to detect surface oxidation, packing leakage, and structural risks.
- **Enterprise Safety Guards**: Automatic detection of safety-critical procedures (LOTO, H2S monitoring, Hot Work permits, depressurization).
- **Audit & Compliance Trail**: Full immutable logging of every document ingestion, query, and user login in SQLite via SQLAlchemy ORM.
- **Air-Gapped & Resilient**: Works offline with local Ollama (`qwen2.5:7b` / `llama3.2`) or built-in deterministic refinery safety synthesis when external models are unavailable.

---

## 🏗️ Architecture Overview

```
secra-ai/
├── backend/                  # FastAPI Python Backend
│   ├── app/
│   │   ├── main.py          # FastAPI application & route registration
│   │   ├── api/
│   │   │   ├── auth.py      # Session login & audit logging
│   │   │   ├── chat.py      # RAG query, vision inspection, & citations
│   │   │   ├── knowledge.py # Document ingestion (PDF/DOCX/TXT) & chunking
│   │   │   └── admin.py     # Live audit trail & system health metrics
│   │   └── services/
│   │       └── ai_engine.py # Text extraction, chunking, BM25 scoring & LLM router
│   ├── database.py          # SQLAlchemy models (User, Document, Chunks, AuditLog)
│   ├── config.py            # Environment & database settings
│   ├── ocr/                 # OCR extraction drivers (PyMuPDF, PyPDF, Tesseract)
│   ├── rag/                 # RAG pipeline & vector search algorithms
│   └── uploads/             # Physical storage for ingested plant documents
├── frontend/                 # React + Vite + Tailwind CSS Dashboard
│   ├── src/
│   │   ├── pages/           # Chat, Documents, AuditLog, SystemHealth, Login
│   │   ├── components/      # ChatMessage, DocumentUpload, StatusBadge, Sidebar
│   │   ├── services/api.js  # Clean async API client connected to backend
│   │   └── context/         # AuthContext & ThemeContext
│   └── vite.config.js       # Configured with proxy to http://127.0.0.1:8000
├── start_all.bat            # 1-Click Master Launcher (Backend + Frontend + Browser)
├── run_backend.bat          # Start FastAPI server on port 8000
├── run_frontend.bat         # Start Vite dev server on port 5173
└── README.md
```

---

## 🚀 Quick Start (One Click)

### For Windows:
Double-click `start_all.bat`.

It will:
1. Start the FastAPI backend server on `http://127.0.0.1:8000`.
2. Start the Vite React frontend server on `http://localhost:5173`.
3. Automatically launch your default web browser to the dashboard.

---

## 🛠️ Manual Startup Instructions

### 1. Backend Server
```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Docs & Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 2. Frontend Application
```bash
cd frontend
npm install
npm run dev
```
- Web Application: [http://localhost:5173](http://localhost:5173)

---

## 🎯 Demo Walkthrough for Hackathon Judges

1. **Sign In**: Login with demo user `Pari` (or any username). Role-based security routes into the Operations Engineer view.
2. **Knowledge Base Exploration**: Navigate to **Knowledge Base** to inspect pre-seeded SOPs (*Pump Maintenance SOP*, *Refinery Safety Manual 2024*, *Compressor Inspection Guide*).
3. **Upload New Plant SOP**: Click **+ Add Document** and drag & drop any PDF, DOCX, TXT, or equipment image. Watch live chunking and indexing in SQLite and vector store.
4. **Interactive Safety Chat**:
   - Ask: *"What is the scheduled inspection interval and vibration limit for rotating pumps?"*
   - Notice the precise citations (*Pump Maintenance SOP.pdf - Page 1*).
   - Ask: *"What are the safety requirements before disassembling high pressure valves?"*
   - Notice the highlighted **Safety-critical alert** flagging mandatory Lock-Out/Tag-Out (LOTO) procedures.
5. **Equipment Image Inspection**: Click the **Attach image** button in the chat and upload an equipment photo. The vision pipeline inspects surface oxidation, flange bolting integrity, and recommends maintenance steps.
6. **Audit Trail**: Visit **Audit Log** to show judges full enterprise governance — all queries, uploads, and logins are logged with timestamps and risk levels.
7. **System Health**: Check **System Health** for live operational diagnostics of the database, vector store, and AI engine.

---

## 🛡️ License
Built with pride for Hackathon innovation. All rights reserved.