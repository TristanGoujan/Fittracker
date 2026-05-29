const BASE = import.meta.env.VITE_API_URL ?? ''

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

export const react          = (token, session_id, emoji)  => req('POST',   '/api/social/react',                         token, { session_id, emoji })
export const getComments    = (token, sessionId)          => req('GET',    `/api/social/session/${sessionId}/comments`, token)
export const addComment     = (token, sessionId, content) => req('POST',   `/api/social/session/${sessionId}/comment`,  token, { content })
export const deleteComment  = (token, commentId)          => req('DELETE', `/api/social/comment/${commentId}`,          token)
export const getLeaderboard       = (token)           => req('GET', '/api/leaderboard/weekly',                   token)
export const getPRLeaderboard     = (token, exercise) => req('GET', `/api/leaderboard/pr?exercise=${exercise}`,    token)
export const getGlobalLeaderboard = (token, exercise) => req('GET', `/api/leaderboard/global?exercise=${exercise}`, token)
