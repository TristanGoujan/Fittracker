const API = import.meta.env.VITE_API_URL ?? ''

async function handleResponse(res) {
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erreur serveur')
  return data
}

export async function getSessions(token) {
  const res = await fetch(`${API}/api/sessions`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return handleResponse(res)
}

export async function createSession(token, body) {
  const res = await fetch(`${API}/api/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  return handleResponse(res)
}

export async function getSession(token, id) {
  const res = await fetch(`${API}/api/sessions/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return handleResponse(res)
}

export async function deleteSession(token, id) {
  const res = await fetch(`${API}/api/sessions/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return handleResponse(res)
}
