import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { AuthKitProvider, useAuth } from '@workos-inc/authkit-react'
import { BarChart3, Code2, Home, ListTodo, LogOut, Upload, UserCog, UserRound, Users } from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { StoreProvider, useStore } from '@/store'
import { cn } from '@/lib/utils'
import Dashboard from '@/pages/Dashboard'
import Donors from '@/pages/Donors'
import DonorDetail from '@/pages/DonorDetail'
import FollowUps from '@/pages/FollowUps'
import Retention from '@/pages/Retention'
import Import from '@/pages/Import'
import ApiDocs from '@/pages/ApiDocs'
const Members = lazy(() => import('@/pages/Members'))
const Account = lazy(() => import('@/pages/Account'))

const NAV = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/follow-ups', label: 'Follow-ups', icon: ListTodo },
  { to: '/donors', label: 'Donors', icon: Users },
  { to: '/retention', label: 'Retention', icon: BarChart3 },
  { to: '/import', label: 'Import', icon: Upload, adminOnly: true },
  { to: '/api', label: 'Read API', icon: Code2, adminOnly: true },
  { to: '/members', label: 'Board members', icon: UserCog, adminOnly: true },
  { to: '/account', label: 'My account', icon: UserRound },
]

function SignedInAs() {
  const { session, member } = useStore()
  const { signOut } = useAuth()
  return (
    <div className="text-sm">
      <div className="text-xs text-muted-foreground">Signed in as</div>
      <div className="font-medium">{member(session.memberId).name}</div>
      <div className="mb-2 text-xs text-muted-foreground">{session.role === 'admin' ? 'CIC admin' : 'Board member'}</div>
      <Button variant="outline" size="sm" className="w-full bg-white" onClick={() => signOut()}>
        <LogOut aria-hidden /> Sign out
      </Button>
    </div>
  )
}

function Shell() {
  const { session } = useStore()
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:p-2">Skip to content</a>
      <aside className="border-b border-sidebar-border bg-sidebar p-4 md:sticky md:top-0 md:h-screen md:border-r md:border-b-0">
        <div className="mb-6 flex items-center gap-2">
          <div aria-hidden className="flex size-8 items-center justify-center rounded-md bg-cic-dark text-sm font-bold text-white">
            C<span className="text-cic-green">i</span>C
          </div>
          <div className="leading-tight">
            <div className="font-bold text-cic-dark">Coding in Color</div>
            <div className="text-xs text-muted-foreground">Donor Relationships</div>
          </div>
        </div>
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto md:flex-col">
          {NAV.filter((n) => !n.adminOnly || session.role === 'admin').map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap hover:bg-muted',
                  isActive && 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground',
                )
              }
            >
              <Icon className="size-4" aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-6">
          <SignedInAs />
        </div>
      </aside>
      <main id="main" className="mx-auto w-full max-w-6xl p-4 md:p-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/follow-ups" element={<FollowUps />} />
          <Route path="/donors" element={<Donors />} />
          <Route path="/donors/:id" element={<DonorDetail />} />
          <Route path="/retention" element={<Retention />} />
          <Route path="/import" element={<Import />} />
          <Route path="/api" element={<ApiDocs />} />
          <Route path="/members" element={session.role === 'admin' && <Suspense fallback={<p role="status">Loading…</p>}><Members /></Suspense>} />
          <Route path="/account" element={<Suspense fallback={<p role="status">Loading…</p>}><Account /></Suspense>} />
        </Routes>
      </main>
      <Toaster />
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center p-4">{children}</main>
}

// Only signed-in users get past here; the Worker re-checks every request.
function SignedInApp() {
  const { user, isLoading, signIn, signOut, getAccessToken } = useAuth()
  if (isLoading) return <Centered><p role="status">Checking your sign-in…</p></Centered>
  if (!user)
    return (
      <Centered>
        <div className="max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-bold text-cic-dark">Coding in Color donor relationships</h1>
          <p className="text-muted-foreground">Sign in with your board member account.</p>
          <Button onClick={() => signIn({ state: { returnTo: location.pathname } })}>Sign in</Button>
        </div>
      </Centered>
    )
  return (
    <StoreProvider token={getAccessToken} onSignOut={() => signOut()}>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </StoreProvider>
  )
}

// Sends the user back to the page they started sign-in from. state comes back
// through the URL unprotected, so only same-origin paths are followed.
function returnTo({ state }: { state?: Record<string, unknown> | null }) {
  if (typeof state?.returnTo !== 'string') return
  const url = new URL(state.returnTo, location.origin)
  if (url.origin === location.origin) history.replaceState(null, '', url.pathname)
}

export default function App() {
  const [clientId, setClientId] = useState<string>()
  const [error, setError] = useState(false)
  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((c) => setClientId(c.workosClientId))
      .catch(() => setError(true))
  }, [])
  if (!clientId) return <Centered><p role="status">{error ? 'Could not reach the server.' : 'Loading…'}</p></Centered>
  // devMode keeps the session in localStorage; it's required without a WorkOS
  // custom domain, which costs more than this project's hosting budget.
  return (
    <AuthKitProvider clientId={clientId} redirectUri={location.origin} devMode onRedirectCallback={returnTo}>
      <SignedInApp />
    </AuthKitProvider>
  )
}
