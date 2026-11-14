import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { BarChart3, Code2, Home, ListTodo, Upload, Users } from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StoreProvider, useStore } from '@/store'
import { cn } from '@/lib/utils'
import Dashboard from '@/pages/Dashboard'
import Donors from '@/pages/Donors'
import DonorDetail from '@/pages/DonorDetail'
import FollowUps from '@/pages/FollowUps'
import Retention from '@/pages/Retention'
import Import from '@/pages/Import'
import ApiDocs from '@/pages/ApiDocs'

const NAV = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/follow-ups', label: 'Follow-ups', icon: ListTodo },
  { to: '/donors', label: 'Donors', icon: Users },
  { to: '/retention', label: 'Retention', icon: BarChart3 },
  { to: '/import', label: 'Import', icon: Upload, adminOnly: true },
  { to: '/api', label: 'Read API', icon: Code2, adminOnly: true },
]

// Demo-only identity switcher. Replaced by Supabase Auth; role comes from the
// user's profile row, never from the client.
function RoleSwitcher() {
  const { session, setSession, boardMembers } = useStore()
  const items = [
    { value: 'admin', label: 'CIC admin (Founder)' },
    ...boardMembers.map((m) => ({ value: m.id, label: `Board: ${m.name}` })),
  ]
  const value = session.role === 'admin' ? 'admin' : session.memberId
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(v) =>
        v === 'admin' ? setSession({ role: 'admin', memberId: 'bm1' }) : setSession({ role: 'board', memberId: v as string })
      }
    >
      <SelectTrigger aria-label="Viewing as" className="w-full bg-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function Shell() {
  const { session } = useStore()
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:p-2">Skip to content</a>
      <aside className="border-b border-sidebar-border bg-sidebar p-4 md:sticky md:top-0 md:h-screen md:border-r md:border-b-0">
        <div className="mb-6 flex items-center gap-2">
          <img
            src="/cic-logo.png"
            alt="Coding in Color"
            className="size-8 object-contain"
          />
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
          <div className="mb-1 text-xs text-muted-foreground">Viewing as (demo)</div>
          <RoleSwitcher />
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
        </Routes>
      </main>
      <Toaster />
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </StoreProvider>
  )
}
