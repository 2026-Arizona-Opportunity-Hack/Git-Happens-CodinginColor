import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

// The signed-in user, from the Worker's /auth routes (worker/auth.ts). The
// session itself is an HttpOnly cookie this code can't see; all the page gets
// is a short-lived access token, kept in memory and never in storage.

export interface User { id: string; email: string; firstName: string | null; lastName: string | null }
interface Token { accessToken: string; expiresAt: number; user: User }

interface Auth {
  user: User | null
  isLoading: boolean
  getAccessToken: () => Promise<string>
  signIn: (returnTo?: string) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setLoading] = useState(true)
  const current = useRef<Token | null>(null)
  // One request at a time: WorkOS rotates the refresh token, so two refreshes
  // racing would sign the second one out.
  const inflight = useRef<Promise<Token | null> | null>(null)

  const fetchToken = useCallback(() => {
    inflight.current ??= fetch('/auth/token', { credentials: 'same-origin' })
      .then((r) => (r.ok ? (r.json() as Promise<Token>) : null))
      .catch(() => null)
      .then((t) => {
        current.current = t
        setUser(t?.user ?? null)
        return t
      })
      .finally(() => { inflight.current = null })
    return inflight.current
  }, [])

  useEffect(() => { fetchToken().finally(() => setLoading(false)) }, [fetchToken])

  // Stable, so the store doesn't reload when the user object changes.
  const getAccessToken = useCallback(async () => {
    const t = current.current
    if (t && t.expiresAt - Date.now() > 30_000) return t.accessToken
    const next = await fetchToken()
    if (!next) throw new Error('Signed out')
    return next.accessToken
  }, [fetchToken])

  const auth = useMemo<Auth>(() => ({
    user,
    isLoading,
    getAccessToken,
    signIn: (returnTo = location.pathname) => location.assign(`/auth/login?${new URLSearchParams({ returnTo })}`),
    signOut: async () => {
      const res = await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' })
      const { logoutUrl } = await res.json().catch(() => ({ logoutUrl: '/' }))
      current.current = null
      location.assign(logoutUrl)
    },
  }), [user, isLoading, getAccessToken])

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth needs an AuthProvider')
  return auth
}
