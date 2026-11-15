import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { AuthKitProvider, useAuth } from '@workos-inc/authkit-react'
import { BarChart3, Bell, Code2, Contact, Home, ListTodo, LogOut, Menu, ShieldAlert, Upload, UserCog, UserRound, Users, Wrench, X, type LucideIcon } from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { StoreProvider, useReminders, useStore } from '@/store'
import { cn } from '@/lib/utils'
import { Assistant, ChatProvider, useChat } from '@/components/ChatWidget'
import { SiteSearch } from '@/components/SiteSearch'
import { InstallPrompt } from '@/components/InstallPrompt'
import { AppSkeleton, Logo, PageSkeleton } from '@/components/Loading'
import Dashboard from '@/pages/Dashboard'
// Other pages load when first opened; PageSkeleton shows meanwhile.
const Donors = lazy(() => import('@/pages/Donors'))
const AllDonors = lazy(() => import('@/pages/AllDonors'))
const DonorDetail = lazy(() => import('@/pages/DonorDetail'))
const FollowUps = lazy(() => import('@/pages/FollowUps'))
const Retention = lazy(() => import('@/pages/Retention'))
const Import = lazy(() => import('@/pages/Import'))
const Notifications = lazy(() => import('@/pages/Notifications'))
const DevTools = lazy(() => import('@/pages/DevTools'))
const Members = lazy(() => import('@/pages/Members'))
const Account = lazy(() => import('@/pages/Account'))
const Api = lazy(() => import('@/pages/Api'))

// `keywords` are other words people might search for to find the page.
type NavItem = { to: string; label: string; icon: LucideIcon; keywords?: string; adminOnly?: boolean; devOnly?: boolean }

// Similar pages sit together; group headings show on wide screens only.
const NAV: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: Home, keywords: 'home overview stats totals raised board member load upcoming events calendar recent activity' },
      { to: '/notifications', label: 'Notifications', icon: Bell, keywords: 'reminders alerts overdue stale imports coming up' },
      { to: '/follow-ups', label: 'Follow-ups', icon: ListTodo, keywords: 'drafts approve messages emails next steps tasks to-do quarterly updates thank-you' },
    ],
  },
  {
    heading: 'Donors',
    items: [
      { to: '/donors', label: 'My Donors', icon: Contact, keywords: 'my assigned donors list' },
      { to: '/all-donors', label: 'All Donors', icon: Users, keywords: 'every donor assign reassign unassigned board member export csv excel download filter', adminOnly: true },
      { to: '/retention', label: 'Retention', icon: BarChart3, keywords: 'lapsed lost renewed upgraded downgraded churn report quarter year compare', adminOnly: true },
      { to: '/import', label: 'Update Donors', icon: Upload, keywords: 'import upload csv file zeffy benevity spreadsheet import history map columns', adminOnly: true },
    ],
  },
  {
    heading: 'Settings',
    items: [
      { to: '/members', label: 'Board members', icon: UserCog, keywords: 'invite users people team roles admin permissions remove', adminOnly: true },
      { to: '/api', label: 'Read API', icon: Code2, keywords: 'api keys tokens integration developer org dashboard revoke', adminOnly: true },
      // DEVELOPMENT ONLY: shown while DEV_TOOLS is on; remove before launch.
      { to: '/dev', label: 'Dev tools', icon: Wrench, keywords: 'clear reset delete database', adminOnly: true, devOnly: true },
      { to: '/account', label: 'My account', icon: UserRound, keywords: 'profile name photo password two-factor 2fa mfa security sessions signed in' },
    ],
  },
]

// signOut clears the user before it navigates to WorkOS's logout URL. Without this
// flag, SignedInApp would see no user and start a sign-in that cancels the logout.
let signingOut = false
function useSignOut() {
  const { signOut } = useAuth()
  return () => {
    signingOut = true
    signOut({ returnTo: location.origin })
  }
}

function SignedInAs() {
  const { session, member } = useStore()
  const signOut = useSignOut()
  return (
    <div className="text-sm">
      <div className="text-xs text-muted-foreground">Signed in as</div>
      <div className="font-medium">{member(session.memberId).name}</div>
      <div className="mb-2 text-xs text-muted-foreground">{session.role === 'admin' ? 'CIC admin' : 'Board member'}</div>
      <Button variant="outline" size="sm" className="w-full bg-white" onClick={signOut}>
        <LogOut aria-hidden /> Sign out
      </Button>
    </div>
  )
}

// Pages that never show donor records, so sample mode doesn't apply to them.
const REAL_ONLY = ['/members', '/api', '/account']

function SampleToggle() {
  const { sample, setSample } = useStore()
  return (
    <label className="mb-4 flex cursor-pointer items-center justify-between gap-2 text-sm font-medium">
      Use sample data
      <input type="checkbox" role="switch" aria-label="Use sample data" className="size-4 accent-cic-dark" checked={sample} onChange={(e) => setSample(e.target.checked)} />
    </label>
  )
}

// BrowserRouter keeps the old scroll position, so a link from far down one
// page opened the next page halfway down. A link to a #section (the dashboard's
// counts) is left to that page to scroll to.
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

// The phone menu is open only on the page it was opened from, so picking a
// page closes it; Escape closes it too and puts focus back on its button.
// From md up it's always shown, so this only matters on phones.
function useMobileMenu(button: React.RefObject<HTMLButtonElement | null>) {
  const { pathname } = useLocation()
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpenOn(null)
      button.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, button])
  return { open, toggle: () => setOpenOn(open ? null : pathname) }
}

function SampleBanner() {
  const { sample, setSample } = useStore()
  const { pathname } = useLocation()
  if (!sample || REAL_ONLY.includes(pathname)) return null
  return (
    <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-cic-dark bg-cic-tint px-3 py-2 text-sm text-cic-dark">
      Showing made-up sample donors. Nothing here is saved.
      <Button variant="outline" size="sm" className="bg-white" onClick={() => setSample(false)}>Use real data</Button>
    </div>
  )
}

function Shell() {
  const { session, devTools, donors } = useStore()
  // A donor page lives under /donors/:id, so NavLink alone would light up My
  // Donors for anyone's donor. Light it only for your own, All Donors otherwise.
  const { pathname } = useLocation()
  const donorId = pathname.match(/^\/donors\/([^/]+)/)?.[1]
  const mineOpen = !!donorId && donors.find((d) => d.id === decodeURIComponent(donorId))?.ownerId === session.memberId
  const navActive = (to: string, isActive: boolean) =>
    !donorId ? isActive : to === '/donors' ? mineOpen : to === '/all-donors' ? !mineOpen : isActive
  // Admin pages: the Worker enforces it too; this keeps board members off them.
  const admin = (el: React.ReactNode) => (session.role === 'admin' ? el : <Navigate to="/" replace />)
  // Badge counts what needs action now; "coming up" items don't nag.
  const actionable = useReminders().filter((r) => r.urgency !== 'upcoming').length
  const chat = useChat()
  const canSee = (n: NavItem) => (!n.adminOnly || session.role === 'admin') && (!n.devOnly || devTools)
  const menuButton = useRef<HTMLButtonElement>(null)
  const menu = useMobileMenu(menuButton)
  return (
    <ChatProvider value={chat}>
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr] lg:grid-cols-[240px_1fr_auto]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:p-2">Skip to content</a>
      <aside className="sticky top-0 z-30 border-b border-sidebar-border bg-sidebar p-4 md:flex md:h-screen md:flex-col md:overflow-y-auto md:border-r md:border-b-0">
        <div className="flex items-center gap-2 md:mb-6">
          <Logo />
          <div className="leading-tight">
            <div className="font-bold text-cic-dark">Coding in Color</div>
            <div className="text-xs text-muted-foreground">Donor Relationships</div>
          </div>
          <Button
            ref={menuButton}
            variant="outline"
            size="icon"
            className="ml-auto bg-white md:hidden"
            aria-label="Menu"
            aria-expanded={menu.open}
            aria-controls="site-menu"
            onClick={menu.toggle}
          >
            {menu.open ? <X aria-hidden /> : <Menu aria-hidden />}
          </Button>
        </div>
        {/* Phones: a panel under the bar that the menu button opens.
            Wider screens: `contents`, so these sit in the sidebar column. */}
        <div id="site-menu" className={cn('mt-4 max-h-[calc(100dvh-5rem)] overflow-y-auto md:contents', !menu.open && 'hidden')}>
        <nav aria-label="Main" className="flex flex-col gap-4">
          {NAV.map(({ heading, items }) => {
            const shown = items.filter(canSee)
            if (!shown.length) return null
            const id = `nav-${heading.toLowerCase()}`
            return (
              <div key={heading} role="group" aria-labelledby={id} className="flex flex-col gap-1">
                <div id={id} className="px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {heading}
                </div>
                {shown.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/' || to === '/donors'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cic-dark',
                        navActive(to, isActive) && 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground',
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
          <SampleToggle />
          <SiteSearch pages={NAV.flatMap((g) => g.items).filter(canSee)} />
          <SignedInAs />
        </div>
        </div>
      </aside>
      <main id="main" className="mx-auto w-full max-w-6xl min-w-0 p-4 pb-24 md:p-8 md:pb-24 lg:pb-8">
        <InstallPrompt />
        <ScrollToTop />
        <SampleBanner />
        <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/follow-ups" element={<FollowUps />} />
          <Route path="/donors" element={<Donors />} />
          <Route path="/donors/:id" element={<DonorDetail />} />
          <Route path="/all-donors" element={admin(<AllDonors />)} />
          <Route path="/retention" element={admin(<Retention />)} />
          <Route path="/import" element={admin(<Import />)} />
          <Route path="/members" element={session.role === 'admin' && <Members />} />
          <Route path="/api" element={session.role === 'admin' && <Api />} />
          {/* The assistant sits beside every page now; old links land on the Dashboard. */}
          <Route path="/assistant" element={<Navigate to="/" replace />} />
          <Route path="/dev" element={devTools ? admin(<DevTools />) : <Navigate to="/" replace />} />
          <Route path="/account" element={<Account />} />
        </Routes>
        </Suspense>
      </main>
      <Assistant chat={chat} />
      {/* Bottom center: bottom-right covered the docked assistant's text box, top center covered page buttons like Export CSV and Debrief. */}
      <Toaster position="bottom-center" />
    </div>
    </ChatProvider>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center p-4">{children}</main>
}

// Signed in with WorkOS, but not in the CIC organization the Worker checks.
function NotAMember() {
  const { user } = useAuth()
  const signOut = useSignOut()
  return (
    <Centered>
      <div className="max-w-sm space-y-4 text-center">
        <ShieldAlert className="mx-auto size-10 text-cic-dark" aria-hidden />
        <h1 className="text-2xl font-bold text-cic-dark">You don't have access</h1>
        <p className="text-muted-foreground">
          You're signed in as <strong className="text-foreground">{user?.email}</strong>, but this account isn't a Coding in Color board member.
          Contact your system admin to be added, then sign in again.
        </p>
        <Button variant="outline" onClick={signOut}>
          <LogOut aria-hidden /> Sign out
        </Button>
      </div>
    </Centered>
  )
}

// Only signed-in users get past here; the Worker re-checks every request.
function SignedInApp() {
  const { user, isLoading, signIn, getAccessToken } = useAuth()
  const signOut = useSignOut()
  // Signed-out visitors go straight to the WorkOS sign-in page; there's nothing to see here without it.
  useEffect(() => {
    if (!isLoading && !user && !signingOut) signIn({ state: { returnTo: location.pathname } })
  }, [isLoading, user, signIn])
  if (isLoading) return <AppSkeleton label="Checking your sign-in…" />
  if (!user) return <AppSkeleton label="Taking you to sign in…" />

  return (
    <StoreProvider token={getAccessToken} onSignOut={signOut} denied={<NotAMember />}>
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
  if (error) return <Centered><p role="alert">Could not reach the server. Check your connection and refresh.</p></Centered>
  if (!clientId) return <AppSkeleton label="Loading…" />
  // devMode keeps the session in localStorage; it's required without a WorkOS
  // custom domain, which costs more than this project's hosting budget.
  return (
    <AuthKitProvider clientId={clientId} redirectUri={location.origin} devMode onRedirectCallback={returnTo}>
      <SignedInApp />
    </AuthKitProvider>
  )
}
