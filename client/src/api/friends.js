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

export const getFriends        = (token)         => req('GET',    '/api/friends',                   token)
export const getFriendRequests = (token)          => req('GET',    '/api/friends/requests',          token)
export const getPendingOut     = (token)          => req('GET',    '/api/friends/pending',           token)
export const searchUsers       = (token, q)       => req('GET',    `/api/friends/search?q=${encodeURIComponent(q)}`, token)
export const sendRequest       = (token, userId)  => req('POST',   '/api/friends/request',           token, { user_id: userId })
export const acceptRequest     = (token, id)      => req('PUT',    `/api/friends/${id}/accept`,      token)
export const declineRequest    = (token, id)      => req('PUT',    `/api/friends/${id}/decline`,     token)
export const blockUser         = (token, userId)  => req('PUT',    `/api/friends/${userId}/block`,   token)
export const removeFriend      = (token, id)      => req('DELETE', `/api/friends/${id}`,             token)
