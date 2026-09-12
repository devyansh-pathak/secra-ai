# Sekra AI — Frontend

**Sovereign Intelligence for Refinery Operations**

Built with React + Vite + Tailwind CSS.
All AI, RAG, OCR, auth, and document processing happens on the backend.
This README tells the backend engineer exactly where to plug things in.

---

## Quick Start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run preview    # preview production build locally
```

---

## Folder Structure


sekra-ai/
├── index.html
├── package.json
├── tailwind.config.js ← design tokens (colors, fonts, shadows)
├── postcss.config.js
├── vite.config.js
│
└── src/
├── main.jsx ← React entry point
├── App.jsx ← Router + protected route wrapper
├── index.css ← global styles, Aether dark theme base
│
├── context/
│ ├── AuthContext.jsx ← ⚡ LOGIN/LOGOUT STATE — wire here first
│ └── ThemeContext.jsx ← fixed theme stub (ignore)
│
├── data/
│ └── mockData.js ← all placeholder data — replace with API calls
│
├── services/
│ └── api.js ← ⚡ ALL HTTP CALLS GO HERE — your main file
│
├── pages/
│ ├── Login.jsx ← login form UI
│ ├── Chat.jsx ← main chat workspace
│ ├── Documents.jsx ← knowledge base / document table
│ ├── Settings.jsx ← user preferences
│ ├── AuditLog.jsx ← admin: activity log
│ └── SystemHealth.jsx ← admin: system status cards
│
└── components/
├── layout/
│ ├── Header.jsx ← top nav, user chip (reads user from AuthContext)
│ └── Sidebar.jsx ← conversation history + system logs panel
│
├── chat/
│ ├── ChatMessage.jsx ← renders user/AI/image messages
│ └── SourceCitation.jsx ← amber pill showing source doc + page
│
├── documents/
│ ├── DocumentCard.jsx ← single row in document table
│ └── DocumentUpload.jsx ← drag-drop upload modal with progress bar
│
├── common/
│ ├── SekraLogo.jsx ← logo mark
│ ├── Modal.jsx ← reusable modal wrapper
│ ├── EmptyState.jsx ← empty list placeholder
│ └── StatusBadge.jsx ← Ready / Processing / Needs attention badge
│
└── admin/
└── SystemLogsPanel.jsx ← monospace log panel in sidebar



---

## Integration Guide

### Step 1 — Set the backend URL

Open `src/services/api.js` and set your server address:

```js
const BASE_URL = 'http://your-server-ip:8000/api/v1'
```

That one line affects every API call in the app.

---

### Step 2 — Wire up Authentication

**File:** `src/services/api.js`

Uncomment and complete the `login` function:

```js
export const login = async (userId, password) => {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, password }),
  })
  return res.json()
  // Expected response shape:
  // { success: true, user: { name, role, id, lang }, token: "..." }
}

export const logout = async () => {
  return fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
  })
}
```

**File:** `src/context/AuthContext.jsx`

Replace the mock login call with the real one:

```js
import { login as apiLogin } from '../services/api'

// Inside AuthProvider:
const login = async (uid, pw, name) => {
  const res = await apiLogin(uid, pw)
  if (res.success) {
    setUser(res.user)          // backend returns the real user object
    saveToken(res.token)       // store JWT in localStorage or cookie
    return true
  }
  return false
}
```

**Expected user object shape from backend:**

```json
{
  "name": "Rajesh Kumar",
  "role": "Engineer",
  "id": "ENG-1042",
  "lang": "English"
}
```

Role controls which nav items appear (Admin sees Audit Log + System Health).
Valid role strings: `"Engineer"`, `"Manager"`, `"Safety Officer"`, `"Administrator"`

---

### Step 3 — Wire up Chat

**File:** `src/services/api.js`

```js
export const sendMessage = async (message, conversationId, imageBase64 = null) => {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ message, conversationId, imageBase64 }),
  })
  return res.json()
  // Expected response shape:
  // {
  //   text: "The recommended inspection interval...",
  //   sources: [
  //     { name: "Pump Maintenance SOP", page: "Page 14", section: "Section 4.2" }
  //   ],
  //   safety: true,        // shows amber safety warning if true
  //   uncertain: false     // shows "I couldn't find info" state if true
  // }
}
```

**File:** `src/pages/Chat.jsx`

Find the `send()` function and replace the mock timeout with your API call:

```js
// REPLACE THIS:
setThinking(true)
setTimeout(() => {
  setThinking(false)
  setMessages(p => [...p, { type: 'ai', response: pickResponse(t) }])
}, 1100)

// WITH THIS:
setThinking(true)
const res = await sendMessage(t, activeConv)
setThinking(false)
setMessages(p => [...p, { type: 'ai', response: res }])
```

For **streaming responses** (if backend uses SSE or streaming):

```js
const response = await fetch(`${BASE_URL}/chat/stream`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
  body: JSON.stringify({ message: t, conversationId: activeConv }),
})
const reader = response.body.getReader()
const decoder = new TextDecoder()
let fullText = ''

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  fullText += decoder.decode(value)
  // update message in real time:
  setMessages(p => {
    const copy = [...p]
    copy[copy.length - 1] = { type: 'ai', response: { text: fullText, sources: [], safety: false } }
    return copy
  })
}
```

---

### Step 4 — Wire up Documents

**File:** `src/services/api.js`

```js
export const getDocuments = async () => {
  const res = await fetch(`${BASE_URL}/knowledge`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  return res.json()
  // Expected: array of document objects (see shape below)
}

export const uploadDocument = async (file) => {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE_URL}/knowledge/ingest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form,
  })
  return res.json()
  // Expected: { success: true, id: "doc-123", status: "processing" }
}

export const deleteDocument = async (id) => {
  return fetch(`${BASE_URL}/knowledge/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  })
}
```

**File:** `src/pages/Documents.jsx`

Replace `useState(MOCK_DOCS)` with a real fetch:

```js
import { getDocuments, deleteDocument } from '../services/api'

// Replace:
const [docs, setDocs] = useState(MOCK_DOCS)

// With:
const [docs, setDocs]     = useState([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  getDocuments().then(data => {
    setDocs(data)
    setLoading(false)
  })
}, [])
```

**Expected document object shape from backend:**

```json
{
  "id": "doc-001",
  "name": "Pump Maintenance SOP",
  "type": "SOP",
  "status": "ready",
  "ext": "pdf"
}
```

Valid status values: `"ready"` | `"processing"` | `"warn"`

---

### Step 5 — Wire up Conversation History

**File:** `src/components/layout/Sidebar.jsx`

Currently uses `MOCK_CONVERSATIONS` from mockData. Replace with:

```js
import { useEffect, useState } from 'react'
// Add this service function in api.js first:
// export const getConversations = async () => fetch(`${BASE_URL}/conversations`, ...).then(r => r.json())

import { getConversations } from '../../services/api'

// Inside Sidebar component:
const [conversations, setConversations] = useState([])
useEffect(() => {
  getConversations().then(setConversations)
}, [])
```

**Expected conversation object shape:**

```json
{
  "id": "conv-abc123",
  "title": "Pump vibration analysis",
  "group": "Today"
}
```

Valid group values: `"Today"` | `"Yesterday"` | `"Earlier"`

---

### Step 6 — Wire up Admin Pages

**Audit Log** — `src/pages/AuditLog.jsx`

```js
import { getAuditLogs } from '../services/api'

// In api.js:
export const getAuditLogs = async () => {
  const res = await fetch(`${BASE_URL}/admin/audit`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  return res.json()
}

// Expected log object shape:
// { time: "10:42", user: "Engineer 1042", activity: "Asked about pump maintenance", role: "Engineer" }
```

**System Health** — `src/pages/SystemHealth.jsx`

```js
// In api.js:
export const getSystemHealth = async () => {
  const res = await fetch(`${BASE_URL}/admin/health`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  return res.json()
}

// Expected shape:
// { gpu: 72, storage: 64, responsetime: 1.8, models: "operational", vectordb: "operational", ... }
```

---

## Token / Auth Helper

Add this to `src/services/api.js` to manage JWT across all requests:

```js
// Token helpers
const getToken  = () => localStorage.getItem('sekra_token')
const saveToken = (t) => localStorage.setItem('sekra_token', t)
const clearToken = () => localStorage.removeItem('sekra_token')

// Authenticated fetch wrapper — use instead of raw fetch
const authFetch = (url, options = {}) =>
  fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...options.headers,
    },
  })
```

Then replace every `fetch(...)` call in this file with `authFetch(...)`.

---

## CORS

Your FastAPI backend needs to allow requests from the frontend dev server.
Add this to your FastAPI `main.py`:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
  CORSMiddleware,
  allow_origins=["http://localhost:5173", "http://your-production-domain"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)
```

---

## Environment Variables

Create a `.env` file in the project root (already gitignored):



Then in `src/services/api.js`:

```js
const BASE_URL = import.meta.env.VITE_API_URL
```

Vite exposes any variable prefixed with `VITE_` to the frontend automatically.

---

## API Endpoint Summary

| Method | Endpoint | Used by |
|--------|----------|---------|
| POST | `/api/v1/auth/login` | Login page |
| POST | `/api/v1/auth/logout` | Header dropdown |
| POST | `/api/v1/chat` | Chat send message |
| GET | `/api/v1/conversations` | Sidebar history |
| GET | `/api/v1/knowledge` | Documents page |
| POST | `/api/v1/knowledge/ingest` | Upload modal |
| DELETE | `/api/v1/knowledge/:id` | Documents page delete |
| GET | `/api/v1/admin/audit` | Audit Log page |
| GET | `/api/v1/admin/health` | System Health page |

---

## Role → UID Prefix Mapping

The frontend derives the user's role from their User ID prefix.
Make sure the backend issues User IDs following this convention:

| Prefix | Role |
|--------|------|
| `ENG-` | Engineer |
| `MAG-` | Manager |
| `OFF-` | Safety Officer |
| `ADM-` | Administrator |

Example valid IDs: `ENG-1042`, `MAG-301`, `OFF-2041`, `ADM-001`

---

## What's Mock vs Real

| Location | Currently mock | Replace with |
|----------|---------------|--------------|
| `src/data/mockData.js` | All static data | Delete file once APIs work |
| `src/context/AuthContext.jsx` | Hardcoded login | Call `api.login()` |
| `src/pages/Chat.jsx` | setTimeout response | Call `api.sendMessage()` |
| `src/pages/Documents.jsx` | `useState(MOCK_DOCS)` | `useEffect → getDocuments()` |
| `src/components/layout/Sidebar.jsx` | `MOCK_CONVERSATIONS` | `getConversations()` |
| `src/components/admin/SystemLogsPanel.jsx` | Static log entries | Poll `/admin/logs` or use WebSocket |
| `src/pages/AuditLog.jsx` | `AUDIT_LOGS` array | Call `getAuditLogs()` |
| `src/pages/SystemHealth.jsx` | Hardcoded percentages | Call `getSystemHealth()` |





