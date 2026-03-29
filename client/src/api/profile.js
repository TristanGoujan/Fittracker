const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

async function req(method, path, token, body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, opts)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erreur serveur')
  return data
}

export const getPublicProfile = (token, userId) => req('GET', `/api/profile/${userId}`, token)
