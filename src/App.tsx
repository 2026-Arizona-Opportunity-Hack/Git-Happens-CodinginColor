import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { AuthKitProvider, useAuth } from '@workos-inc/authkit-react'
import { BarChart3, Bell, Code2, Contact, Home, ListTodo, LogOut, MessageCircle, ShieldAlert, Upload, UserCog, UserRound, Users, type LucideIcon } from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { StoreProvider, useReminders, useStore } from '@/store'
import { cn } from '@/lib/utils'
import { ChatPanel, useChat, useWide } from '@/components/ChatWidget'
import { DonorSearch } from '@/components/DonorSearch'
import { InstallPrompt } from '@/components/InstallPrompt'
import Dashboard from '@/pages/Dashboard'
import Donors from '@/pages/Donors'
import AllDonors from '@/pages/AllDonors'
import DonorDetail from '@/pages/DonorDetail'
import FollowUps from '@/pages/FollowUps'
import Retention from '@/pages/Retention'
import Import from '@/pages/Import'
import Notifications from '@/pages/Notifications'
const Members = lazy(() => import('@/pages/Members'))
const Account = lazy(() => import('@/pages/Account'))
const Api = lazy(() => import('@/pages/Api'))

type NavItem = { to: string; label: string; icon: LucideIcon; adminOnly?: boolean; narrowOnly?: boolean }

// Similar pages sit together; group headings show on wide screens only.
const NAV: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: Home },
      { to: '/notifications', label: 'Notifications', icon: Bell },
      { to: '/follow-ups', label: 'Follow-ups', icon: ListTodo },
      // On wide screens the assistant is a column beside every page instead.
      { to: '/assistant', label: 'Assistant', icon: MessageCircle, narrowOnly: true },
    ],
  },
  {
    heading: 'Donors',
    items: [
      { to: '/donors', label: 'My Donors', icon: Contact },
      { to: '/all-donors', label: 'All Donors', icon: Users, adminOnly: true },
      { to: '/retention', label: 'Retention', icon: BarChart3, adminOnly: true },
      { to: '/import', label: 'Update Donors', icon: Upload, adminOnly: true },
    ],
  },
  {
    heading: 'Settings',
    items: [
      { to: '/members', label: 'Board members', icon: UserCog, adminOnly: true },
      { to: '/api', label: 'Read API', icon: Code2, adminOnly: true },
      { to: '/account', label: 'My account', icon: UserRound },
    ],
  },
]

function SignedInAs() {
  const { session, member } = useStore()
  const { signOut } = useAuth()
  return (
    <div className="text-sm">
      <div className="text-xs text-muted-foreground">Signed in as</div>
      <div className="font-medium">{member(session.memberId).name}</div>
      <div className="mb-2 text-xs text-muted-foreground">{session.role === 'admin' ? 'CIC admin' : 'Board member'}</div>
      <Button variant="outline" size="sm" className="w-full bg-white" onClick={() => signOut({ returnTo: location.origin })}>
        <LogOut aria-hidden /> Sign out
      </Button>
    </div>
  )
}

function Shell() {
  const { session } = useStore()
  // Admin pages: the Worker enforces it too; this keeps board members off them.
  const admin = (el: React.ReactNode) => (session.role === 'admin' ? el : <Navigate to="/" replace />)
  // Badge counts what needs action now; "coming up" items don't nag.
  const actionable = useReminders().filter((r) => r.urgency !== 'upcoming').length
  const chat = useChat()
  const wide = useWide()
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr] lg:grid-cols-[240px_1fr_22rem]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:p-2">Skip to content</a>
      <aside className="border-b border-sidebar-border bg-sidebar p-4 md:sticky md:top-0 md:flex md:h-screen md:flex-col md:overflow-y-auto md:border-r md:border-b-0">
        <div className="mb-6 flex items-center gap-2">
          <div aria-hidden className="flex size-8 items-center justify-center rounded-md bg-cic-dark text-sm font-bold text-white">
            C<span className="text-cic-green">i</span>C
          </div>
          <div className="leading-tight">
            <div className="font-bold text-cic-dark">Coding in Color</div>
            <div className="text-xs text-muted-foreground">Donor Relationships</div>
          </div>
        </div>
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto md:flex-col md:gap-4">
          {NAV.map(({ heading, items }) => {
            const shown = items.filter((n) => (!n.adminOnly || session.role === 'admin') && !(n.narrowOnly && wide))
            if (!shown.length) return null
            const id = `nav-${heading.toLowerCase()}`
            // `contents` keeps the phone layout one scrolling row of links.
            return (
              <div key={heading} role="group" aria-labelledby={id} className="contents md:flex md:flex-col md:gap-1">
                <div id={id} className="hidden px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase md:block">
                  {heading}
                </div>
                {shown.map(({ to, label, icon: Icon }) => (
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
                    {to === '/notifications' && actionable > 0 && (
                      <span className="ml-auto rounded-full bg-cic-dark px-1.5 text-xs font-semibold text-white">
                        {actionable}<span className="sr-only"> need action</span>
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            )
          })}
        </nav>
        <div className="mt-6 md:mt-auto md:pt-6">
          <DonorSearch />
          <SignedInAs />
        </div>
      </aside>
      <main id="main" className="mx-auto w-full max-w-6xl p-4 md:p-8">
        <InstallPrompt />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/follow-ups" element={<FollowUps />} />
          <Route path="/donors" element={<Donors />} />
          <Route path="/donors/:id" element={<DonorDetail />} />
          <Route path="/all-donors" element={admin(<AllDonors />)} />
          <Route path="/retention" element={admin(<Retention />)} />
          <Route path="/import" element={admin(<Import />)} />
          <Route path="/members" element={session.role === 'admin' && <Suspense fallback={<p role="status">Loading…</p>}><Members /></Suspense>} />
          <Route path="/api" element={session.role === 'admin' && <Suspense fallback={<p role="status">Loading…</p>}><Api /></Suspense>} />
          <Route path="/assistant" element={wide ? <Navigate to="/" replace /> : <ChatPanel chat={chat} variant="page" />} />
          <Route path="/account" element={<Suspense fallback={<p role="status">Loading…</p>}><Account /></Suspense>} />
        </Routes>
      </main>
      {wide && <ChatPanel chat={chat} variant="column" />}
      <Toaster />
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center p-4">{children}</main>
}

// Signed in with WorkOS, but not in the CIC organization the Worker checks.
function NotAMember() {
  const { user, signOut } = useAuth()
  return (
    <Centered>
      <div className="max-w-sm space-y-4 text-center">
        <ShieldAlert className="mx-auto size-10 text-cic-dark" aria-hidden />
        <h1 className="text-2xl font-bold text-cic-dark">You don't have access</h1>
        <p className="text-muted-foreground">
          You're signed in as <strong className="text-foreground">{user?.email}</strong>, but this account isn't a Coding in Color board member.
          Contact your system admin to be added, then sign in again.
        </p>
        <Button variant="outline" onClick={() => signOut({ returnTo: location.origin })}>
          <LogOut aria-hidden /> Sign out
        </Button>
      </div>
    </Centered>
  )
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
    <StoreProvider token={getAccessToken} onSignOut={() => signOut({ returnTo: location.origin })} denied={<NotAMember />}>
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
