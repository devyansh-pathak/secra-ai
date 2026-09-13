const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const sendMessage = async (message, userId = 'anonymous', sessionId = 'default') => {
  const res = await fetch(`${BASE_URL}/api/v1/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, user_id: userId, session_id: sessionId }),
  })
  if (!res.ok) throw new Error(`Chat failed: ${res.status}`)
  return res.json()
}

export const getDocuments = async () => {
  const res = await fetch(`${BASE_URL}/api/v1/knowledge`)
  if (!res.ok) throw new Error('Failed to fetch documents')
  return res.json()
}


export const uploadDocument = async (file) => {
  const form = new FormData()
  form.append('file', file)

  const res = await fetch(`${BASE_URL}/api/v1/knowledge/ingest`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || 'Upload failed')
  }

  const data = await res.json()

  return {
    ...data,
    id: data.id,
    name: data.filename || file.name,
    type: data.ext || 'Document',
    status: data.status || 'ready',
  }
}



export const deleteDocument = async (id) => {
  const res = await fetch(`${BASE_URL}/api/v1/knowledge/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Delete failed')
  return res.json()
}

export const getAuditLogs    = async () => { const res = await fetch(`${BASE_URL}/api/v1/admin/audit`);  return res.ok ? res.json() : [] }
export const getSystemHealth = async () => { const res = await fetch(`${BASE_URL}/api/v1/admin/health`); return res.ok ? res.json() : {} }
export const checkBackendOnline = async () => { try { const res = await fetch(`${BASE_URL}/health`); return res.ok } catch { return false } }
export const getSystemLogs = async () => {
  const res = await fetch(`${BASE_URL}/api/v1/admin/logs`)
  if (!res.ok) throw new Error('Failed to fetch system logs')
  return res.json()
}
