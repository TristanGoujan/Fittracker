const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function handleResponse(res) {
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erreur serveur')
  return data
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` }
}

export async function getSummary(token) {
  const res = await fetch(`${API}/api/stats/summary`, { headers: authHeaders(token) })
  return handleResponse(res)
}

export async function getVolume(token, days) {
  const res = await fetch(`${API}/api/stats/volume?days=${days}`, { headers: authHeaders(token) })
  return handleResponse(res)
}

export async function getActivity(token) {
  const res = await fetch(`${API}/api/stats/activity`, { headers: authHeaders(token) })
  return handleResponse(res)
}
