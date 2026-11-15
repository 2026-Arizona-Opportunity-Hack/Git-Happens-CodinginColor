import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, FileSpreadsheet, MailCheck, UserRound, type LucideIcon } from 'lucide-react'
import { PageHeader, Paged, SectionTitle } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { ReminderCategory, Urgency } from '@/lib/reminders'
import { useReminders, useStore } from '@/store'

const CATEGORIES: { key: ReminderCategory; label: string; icon: LucideIcon }[] = [
  { key: 'donor', label: 'Donor follow-ups', icon: UserRound },
  { key: 'draft', label: 'Drafts to approve', icon: MailCheck },
  { key: 'spreadsheet', label: 'Spreadsheets', icon: FileSpreadsheet },
  { key: 'event', label: 'Events', icon: CalendarDays },
]

const URGENCY: { key: Urgency; label: string; badge: string }[] = [
  { key: 'overdue', label: 'Overdue', badge: 'bg-red-100 text-red-900' },
  { key: 'due', label: 'Needs doing', badge: 'bg-amber-100 text-amber-900' },
  { key: 'upcoming', label: 'Coming up', badge: 'bg-cic-tint text-cic-dark' },
]

// One inbox for everything the app would otherwise make you go looking for.
export default function Notifications() {
  const { session } = useStore()
  const all = useReminders()
  const [filter, setFilter] = useState<ReminderCategory | 'all'>('all')
  const shown = filter === 'all' ? all : all.filter((r) => r.category === filter)
  // Spreadsheet reminders only exist for admins, so don't offer the filter to board members.
  const categories = CATEGORIES.filter((c) => c.key !== 'spreadsheet' || session.role === 'admin')

  return (
    <>
      <PageHeader
        title="Notifications"
      />

      <div role="group" aria-label="Filter reminders" className="mb-6 flex flex-wrap gap-2">
        {[{ key: 'all' as const, label: 'All' }, ...categories].map((c) => {
          const n = c.key === 'all' ? all.length : all.filter((r) => r.category === c.key).length
          return (
            <Button key={c.key} size="sm" variant={filter === c.key ? 'default' : 'outline'} aria-pressed={filter === c.key} onClick={() => setFilter(c.key)}>
              {c.label} ({n})
            </Button>
          )
        })}
      </div>

      {shown.length === 0 && (
        <Card>
          <CardContent>
            <p role="status" className="text-muted-foreground">You're all caught up.</p>
          </CardContent>
        </Card>
      )}

      {URGENCY.map((u) => {
        const items = shown.filter((r) => r.urgency === u.key)
        if (items.length === 0) return null
        return (
          <section key={u.key} className="mb-8">
            <SectionTitle>{u.label} ({items.length})</SectionTitle>
            <Card className="gap-0 py-0">
              <Paged items={items} label={u.label} className="px-4 py-3">{(page) => (
              <ul className="divide-y">
                {page.map((r) => {
                  const cat = CATEGORIES.find((c) => c.key === r.category)!
                  return (
                    <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                      <cat.icon aria-hidden className="mt-0.5 size-5 shrink-0 text-cic-dark" />
                      <div className="min-w-0 flex-1">
                        <Link to={r.to} className="font-medium text-cic-dark underline">{r.title}</Link>
                        <div className="text-sm text-muted-foreground">{r.detail}</div>
                      </div>
                      <Badge className={u.badge}>
                        <span className="sr-only">{cat.label}, </span>{u.label}
                      </Badge>
                    </li>
                  )
                })}
              </ul>
              )}</Paged>
            </Card>
          </section>
        )
      })}
    </>
  )
}
