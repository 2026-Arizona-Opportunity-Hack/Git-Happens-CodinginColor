import { lazy, Suspense, type ComponentType, useEffect, useRef, useState } from 'react'
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/auth'
import { BarChart3, Bell, Code2, Contact, Home, ListTodo, LogOut, Menu, ShieldAlert, Upload, UserCog, UserRound, Users, X, type LucideIcon } from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { StoreProvider, useReminders, useStore } from '@/store'
import { cn } from '@/lib/utils'
import { Assistant, ChatProvider, useChat } from '@/components/ChatWidget'
import { SiteSearch } from '@/components/SiteSearch'
import { InstallPrompt } from '@/components/InstallPrompt'
import { AppSkeleton, Logo, PageSkeleton } from '@/components/Loading'
import Dashboard from '@/pages/Dashboard'
// Other pages load when first opened; PageSkeleton shows meanwhile. A deploy
// replaces those files, so a tab opened before it would fail to load one and
// go blank; reload once to pick up the new build instead.
function page<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(() => load().catch((err) => {
    let last = 0
    try { last = Number(sessionStorage.getItem('page-reload')) } catch { /* no storage */ }
    if (Date.now() - last < 10_000) throw err
    try { sessionStorage.setItem('page-reload', String(Date.now())) } catch { /* no storage */ }
    location.reload()
    return new Promise<never>(() => {})
  }))
}
const Donors = page(() => import('@/pages/Donors'))
const AllDonors = page(() => import('@/pages/AllDonors'))
const DonorDetail = page(() => import('@/pages/DonorDetail'))
const FollowUps = page(() => import('@/pages/FollowUps'))
const Retention = page(() => import('@/pages/Retention'))
const Import = page(() => import('@/pages/Import'))
const Notifications = page(() => import('@/pages/Notifications'))
const Members = page(() => import('@/pages/Members'))
const Account = page(() => import('@/pages/Account'))
const Api = page(() => import('@/pages/Api'))

// `keywords` are other words people might search for to find the page.
type NavItem = { to: string; label: string; icon: LucideIcon; keywords?: string; adminOnly?: boolean }

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
      { to: '/account', label: 'My account', icon: UserRound, keywords: 'profile name photo password two-factor 2fa mfa security sessions signed in' },
    ],
  },
]

function useSignOut() {
  return useAuth().signOut
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

function Shell() {
  const { session, donors } = useStore()
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
  const canSee = (n: NavItem) => !n.adminOnly || session.role === 'admin'
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
          <SiteSearch pages={NAV.flatMap((g) => g.items).filter(canSee)} />
          <SignedInAs />
        </div>
        </div>
      </aside>
      <main id="main" className="mx-auto w-full max-w-screen-2xl min-w-0 p-4 pb-24 md:p-8 md:pb-24 lg:pb-8">
        <InstallPrompt />
        <ScrollToTop />
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
    if (!isLoading && !user) signIn()
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

// Sign-in runs in the Worker (worker/auth.ts), which keeps the session in an
// HttpOnly cookie; see docs/decisions/006-session-cookie.md.
export default function App() {
  return (
    <AuthProvider>
      <SignedInApp />
    </AuthProvider>
  )
}
