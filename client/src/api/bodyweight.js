const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

async function request(method, path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')
  return data
}

export const getBodyWeight    = (token)                => request('GET',    '/api/bodyweight',      token)
export const addBodyWeight    = (token, { weight_kg, entry_date }) => request('POST', '/api/bodyweight', token, { weight_kg, entry_date })
export const deleteBodyWeight = (token, id)            => request('DELETE', `/api/bodyweight/${id}`, token)
