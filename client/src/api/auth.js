const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function handleResponse(res) {
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erreur serveur')
  return data
}

export async function register(username, email, password) {
  const res = await fetch(`${API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  })
  return handleResponse(res)
}

export async function login(email, password) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return handleResponse(res)
}

export async function getProfile(token) {
  const res = await fetch(`${API}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return handleResponse(res)
}

export async function updateProfile(token, data) {
  const res = await fetch(`${API}/api/auth/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function uploadAvatar(token, base64) {
  const res = await fetch(`${API}/api/auth/avatar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ avatar: base64 }),
  })
  return handleResponse(res)
}

export async function changePassword(token, current_password, new_password) {
  const res = await fetch(`${API}/api/auth/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ current_password, new_password }),
  })
  return handleResponse(res)
}

export async function deleteAccount(token, password) {
  const res = await fetch(`${API}/api/auth/account`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ password }),
  })
  return handleResponse(res)
}

export async function updateProgram(token, programId) {
  const res = await fetch(`${API}/api/auth/program`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ current_program: programId }),
  })
  return handleResponse(res)
}
