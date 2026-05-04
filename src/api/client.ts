// api/client.ts
// All HTTP calls to the WhisperBox backend.
// Handles auth headers, token refresh, and errors.

const BASE = 'https://whisperbox.koyeb.app'

// ── Token storage — access token in memory only ───────
let accessToken: string | null = null
let refreshToken: string | null = null

export function setTokens(access: string, refresh: string) {
  accessToken = access
  refreshToken = refresh
  // Only refresh token persisted (to survive page reload)
  // Access token stays in memory only
  sessionStorage.setItem('wb_refresh', refresh)
}

export function loadPersistedRefresh(): string | null {
  return sessionStorage.getItem('wb_refresh')
}

export function clearTokens() {
  accessToken = null
  refreshToken = null
  sessionStorage.removeItem('wb_refresh')
}

export function getAccessToken() { return accessToken }

// ── Base fetch with auth + auto-refresh ───────────────
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  // Auto-refresh on 401
  if (res.status === 401 && retry && refreshToken) {
    const refreshed = await tryRefresh()
    if (refreshed) return apiFetch<T>(path, options, false)
    clearTokens()
    throw new ApiError(401, 'Session expired. Please log in again.')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body?.detail || body?.message || `Error ${res.status}`)
  }

  // Some endpoints return empty body (logout)
  const text = await res.text()
  return text ? JSON.parse(text) : ({} as T)
}

async function tryRefresh(): Promise<boolean> {
  try {
    const stored = refreshToken || loadPersistedRefresh()
    if (!stored) return false
    const data = await apiFetch<{ access_token: string; expires_in: number }>(
      '/auth/refresh',
      { method: 'POST', body: JSON.stringify({ refresh_token: stored }) },
      false
    )
    accessToken = data.access_token
    return true
  } catch {
    return false
  }
}

// ── Error class ───────────────────────────────────────
export class ApiError extends Error {
  status: number
  
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// ── Types ─────────────────────────────────────────────
export interface UserProfile {
  id: string
  username: string
  display_name: string
  public_key: string
  wrapped_private_key: string
  pbkdf2_salt: string
  created_at: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: UserProfile
}

export interface SearchUser {
  id: string
  username: string
  display_name: string
}

export interface EncryptedPayload {
  ciphertext: string
  iv: string
  encryptedKey: string
  encryptedKeyForSelf: string
}

export interface Message {
  id: string
  from_user_id: string
  to_user_id: string
  payload: EncryptedPayload
  delivered: boolean
  created_at: string
}

export interface Conversation {
  user_id: string
  display_name: string
  username: string
  last_message_at: string | null
}

// ── Auth endpoints ────────────────────────────────────
export async function apiRegister(body: {
  username: string
  display_name: string
  password: string
  public_key: string
  wrapped_private_key: string
  pbkdf2_salt: string
}): Promise<AuthResponse> {
  return apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) })
}

export async function apiLogin(body: {
  username: string
  password: string
}): Promise<AuthResponse> {
  return apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) })
}

export async function apiMe(): Promise<UserProfile> {
  return apiFetch('/auth/me')
}

export async function apiLogout(token: string): Promise<void> {
  await apiFetch('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: token }),
  })
}

// ── User endpoints ────────────────────────────────────
export async function apiSearchUsers(q: string): Promise<SearchUser[]> {
  return apiFetch(`/users/search?q=${encodeURIComponent(q)}`)
}

export async function apiGetPublicKey(userId: string): Promise<{ public_key: string }> {
  return apiFetch(`/users/${userId}/public-key`)
}

// ── Conversation endpoints ────────────────────────────
export async function apiGetConversations(): Promise<Conversation[]> {
  return apiFetch('/conversations')
}

export async function apiGetMessages(
  userId: string,
  before?: string,
  limit = 50
): Promise<Message[]> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (before) params.set('before', before)
  return apiFetch(`/conversations/${userId}/messages?${params}`)
}

// ── Message endpoints ─────────────────────────────────
export async function apiSendMessage(body: {
  to: string
  payload: EncryptedPayload
}): Promise<Message> {
  return apiFetch('/messages', { method: 'POST', body: JSON.stringify(body) })
}