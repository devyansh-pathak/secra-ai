// services/api.js
// All backend API calls go here.
// Currently returns mock data; swap BASE_URL and uncomment fetch calls when backend is ready.

const BASE_URL = '/api/v1'  // TODO: set to real backend URL

// ── AUTH ──────────────────────────────────────────────────
export const login = async (userId, password) => {
  // TODO: return fetch(`${BASE_URL}/auth/login`, { method:'POST', body: JSON.stringify({userId,password}) }).then(r=>r.json())
  return { success: true, user: { name:'Pari', role:'Engineer', id: userId } }
}

export const logout = async () => {
  // TODO: return fetch(`${BASE_URL}/auth/logout`, { method:'POST' })
  return { success: true }
}

// ── CHAT ──────────────────────────────────────────────────
export const sendMessage = async (message, conversationId, imageBase64 = null) => {
  // TODO: return fetch(`${BASE_URL}/chat`, { method:'POST', body: JSON.stringify({message,conversationId,imageBase64}) }).then(r=>r.json())
  return null // mock handled in component
}

// ── DOCUMENTS ─────────────────────────────────────────────
export const getDocuments = async () => {
  // TODO: return fetch(`${BASE_URL}/knowledge`).then(r=>r.json())
  return []
}

export const uploadDocument = async (file) => {
  // TODO:
  // const form = new FormData(); form.append('file', file)
  // return fetch(`${BASE_URL}/knowledge/ingest`, { method:'POST', body: form }).then(r=>r.json())
  return { success: true, id: Date.now() }
}

export const deleteDocument = async (id) => {
  // TODO: return fetch(`${BASE_URL}/knowledge/${id}`, { method:'DELETE' })
  return { success: true }
}

// ── ADMIN ─────────────────────────────────────────────────
export const getAuditLogs  = async () => { return [] }
export const getSystemHealth = async () => { return {} }
