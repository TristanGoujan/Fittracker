const BASE = import.meta.env.VITE_API_URL ?? ''

async function req(method, path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')
  return data
}

export const getSchedule  = (token)       => req('GET', '/api/schedule', token)
export const saveSchedule = (token, days) => req('PUT', '/api/schedule', token, { days })
