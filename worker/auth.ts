import { base64url, decodeJwt, EncryptJWT, jwtDecrypt } from 'jose'
import type { Env } from './index'

// Sign-in runs here, not in the browser, so the WorkOS refresh token lives in
// an HttpOnly cookie on our own domain and no script on the page can read it.
// The page only ever holds a short-lived access token, in memory, from
// GET /auth/token. (In the browser, AuthKit would keep the session in
// localStorage unless we paid for a WorkOS custom domain; see decision 006.)
//
//   GET  /auth/login?returnTo=/path  → the hosted WorkOS sign-in page
//   GET  /auth/callback              → sets the session cookie, back to returnTo
//   GET  /auth/token                 → { accessToken, user } or 401
//   POST /auth/logout                → clears the cookie, { logoutUrl }

const SESSION = 'cic_session'
const STATE = 'cic_oauth_state'
const SESSION_DAYS = 30

interface Sealed { at: string; rt: string; user: AuthUser }
export interface AuthUser { id: string; email: string; firstName: string | null; lastName: string | null }

interface WorkOsAuth {
  access_token: string
  refresh_token: string
  user: { id: string; email: string; first_name: string | null; last_name: string | null }
}

const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } })

// `__Host-` would be stricter, but it needs Secure, which plain-http dev can't send.
function cookie(name: string, value: string, maxAge: number, secure: boolean) {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`
}

function readCookie(req: Request, name: string) {
  const c = req.headers.get('Cookie') ?? ''
  return c.split(/;\s*/).find((p) => p.startsWith(`${name}=`))?.slice(name.length + 1)
}

const key = async (env: Env) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(env.WORKOS_COOKIE_PASSWORD)))

async function seal(env: Env, s: Sealed) {
  return new EncryptJWT({ ...s }).setProtectedHeader({ alg: 'dir', enc: 'A256GCM' }).setIssuedAt().encrypt(await key(env))
}

async function unseal(env: Env, token: string): Promise<Sealed | null> {
  try {
    const { payload } = await jwtDecrypt(token, await key(env))
    return payload as unknown as Sealed
  } catch {
    return null
  }
}

async function authenticate(env: Env, grant: Record<string, string>): Promise<WorkOsAuth | null> {
  const res = await fetch('https://api.workos.com/user_management/authenticate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: env.WORKOS_CLIENT_ID, client_secret: env.WORKOS_API_KEY, ...grant }),
  })
  if (!res.ok) {
    console.error(`WorkOS authenticate (${grant.grant_type}) returned ${res.status}`)
    return null
  }
  return res.json()
}

const toUser = (u: WorkOsAuth['user']): AuthUser => ({ id: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name })

// Only same-origin paths: returnTo comes back through the URL unprotected.
const safePath = (p: string | null | undefined) => (p && p.startsWith('/') && !p.startsWith('//') && !p.startsWith('/\\') ? p : '/')

export async function handleAuth(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url)
  const secure = url.protocol === 'https:'
  const action = url.pathname.slice('/auth/'.length)

  if (req.method === 'GET' && action === 'login') {
    // The nonce in the state must match a cookie only this browser has, so
    // nobody can finish a sign-in they started on someone else's behalf.
    const nonce = base64url.encode(crypto.getRandomValues(new Uint8Array(16)))
    const state = `${nonce}.${base64url.encode(safePath(url.searchParams.get('returnTo')))}`
    const authorize = new URL('https://api.workos.com/user_management/authorize')
    authorize.search = new URLSearchParams({
      client_id: env.WORKOS_CLIENT_ID, provider: 'authkit', response_type: 'code', redirect_uri: `${url.origin}/auth/callback`, state,
    }).toString()
    return new Response(null, { status: 302, headers: { Location: authorize.toString(), 'Set-Cookie': cookie(STATE, nonce, 600, secure) } })
  }

  if (req.method === 'GET' && action === 'callback') {
    const [nonce, path] = (url.searchParams.get('state') ?? '').split('.')
    const code = url.searchParams.get('code')
    if (!code || !nonce || nonce !== readCookie(req, STATE)) return new Response('Sign-in link expired. Go back to the app and sign in again.', { status: 400 })
    const auth = await authenticate(env, { grant_type: 'authorization_code', code })
    if (!auth) return new Response('Sign-in failed. Go back to the app and try again.', { status: 502 })
    let returnTo = '/'
    try { returnTo = safePath(new TextDecoder().decode(base64url.decode(path ?? ''))) } catch { /* bad state: go home */ }
    const sealed = await seal(env, { at: auth.access_token, rt: auth.refresh_token, user: toUser(auth.user) })
    const headers = new Headers({ Location: returnTo })
    headers.append('Set-Cookie', cookie(SESSION, sealed, SESSION_DAYS * 86400, secure))
    headers.append('Set-Cookie', cookie(STATE, '', 0, secure))
    return new Response(null, { status: 302, headers })
  }

  if (req.method === 'GET' && action === 'token') {
    const raw = readCookie(req, SESSION)
    const s = raw ? await unseal(env, raw) : null
    if (!s) return json({ error: 'Sign-in required' }, 401)
    // Reuse the access token until a minute before it expires, then refresh.
    // WorkOS rotates the refresh token, so the cookie is rewritten each time.
    const exp = decodeJwt(s.at).exp ?? 0
    if (exp * 1000 - Date.now() > 60_000) return json({ accessToken: s.at, expiresAt: exp * 1000, user: s.user })
    const auth = await authenticate(env, { grant_type: 'refresh_token', refresh_token: s.rt })
    if (!auth) return json({ error: 'Session expired, sign in again' }, 401, { 'Set-Cookie': cookie(SESSION, '', 0, secure) })
    const next = { at: auth.access_token, rt: auth.refresh_token, user: toUser(auth.user) }
    return json({ accessToken: next.at, expiresAt: (decodeJwt(next.at).exp ?? 0) * 1000, user: next.user }, 200, {
      'Set-Cookie': cookie(SESSION, await seal(env, next), SESSION_DAYS * 86400, secure),
    })
  }

  if (req.method === 'POST' && action === 'logout') {
    // SameSite=Lax already keeps the cookie off cross-site POSTs; this is belt and braces.
    if (req.headers.get('Origin') !== url.origin) return json({ error: 'Cross-origin request' }, 403)
    const raw = readCookie(req, SESSION)
    const s = raw ? await unseal(env, raw) : null
    const sid = s ? decodeJwt(s.at).sid : undefined
    const logoutUrl = typeof sid === 'string'
      ? `https://api.workos.com/user_management/sessions/logout?${new URLSearchParams({ session_id: sid, return_to: url.origin })}`
      : url.origin
    return json({ logoutUrl }, 200, { 'Set-Cookie': cookie(SESSION, '', 0, secure) })
  }

  return json({ error: 'Not found' }, 404)
}
