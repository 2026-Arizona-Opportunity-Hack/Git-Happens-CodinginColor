import { IMPORT_SOURCES, STALE_IMPORT_DAYS } from '../data/sources'
import type { CicEvent, Donor, Draft, Gift, ImportRecord, Role, Source } from '../data/types'
import { daysBetween, fmtDate, quarterlyTouchDue, retentionStatus, yearOf } from './logic'

// Everything that needs someone's attention, computed from data the caller can
// already see. Nothing is stored: a reminder disappears once the work is done
// (the step is cleared, the donor is contacted, the file is re-imported).

export type ReminderCategory = 'donor' | 'draft' | 'spreadsheet' | 'event'
export type Urgency = 'overdue' | 'due' | 'upcoming'

export interface Reminder {
  id: string
  category: ReminderCategory
  urgency: Urgency
  title: string
  detail: string
  to: string // in-app link to where the work gets done
}

export const NEXT_STEP_SOON_DAYS = 7
export const EVENT_SOON_DAYS = 21

export const latestImport = (imports: ImportRecord[], source: Source) =>
  imports.filter((i) => i.source === source).sort((a, b) => b.importedAt.localeCompare(a.importedAt))[0]

interface Input {
  role: Role
  today: string
  donors: Donor[]
  gifts: Gift[]
  drafts: Draft[]
  events: CicEvent[]
  imports: ImportRecord[]
}

const ORDER: Record<Urgency, number> = { overdue: 0, due: 1, upcoming: 2 }

export function reminders({ role, today, donors, gifts, drafts, events, imports }: Input): Reminder[] {
  const out: Reminder[] = []
  const ids = new Set(donors.map((d) => d.id))
  const year = yearOf(today)

  for (const d of drafts)
    if (d.status === 'pending' && ids.has(d.donorId))
      out.push({
        id: `draft-${d.id}`, category: 'draft', urgency: 'due', to: '/follow-ups',
        title: `Approve ${d.kind.replace('-', ' ')} for ${donors.find((x) => x.id === d.donorId)!.name}`,
        detail: `Drafted ${fmtDate(d.createdAt)}; nothing is sent until someone approves it`,
      })

  for (const d of donors) {
    if (d.nextStep) {
      const late = daysBetween(d.nextStep.due, today)
      if (late > 0)
        out.push({ id: `step-${d.id}`, category: 'donor', urgency: 'overdue', to: `/donors/${d.id}`, title: `${d.name}: ${d.nextStep.text}`, detail: `${late} day${late === 1 ? '' : 's'} overdue` })
      else if (-late <= NEXT_STEP_SOON_DAYS)
        out.push({ id: `step-${d.id}`, category: 'donor', urgency: 'due', to: `/donors/${d.id}`, title: `${d.name}: ${d.nextStep.text}`, detail: late === 0 ? 'Due today' : `Due ${fmtDate(d.nextStep.due)}` })
    }
    if (quarterlyTouchDue(d, today))
      out.push({
        id: `touch-${d.id}`, category: 'donor', urgency: 'due', to: `/donors/${d.id}`,
        title: `Send ${d.name} a quarterly update`,
        detail: d.lastTouchAt ? `Last contact ${fmtDate(d.lastTouchAt)} (${daysBetween(d.lastTouchAt, today)} days ago)` : 'Never contacted',
      })
    if (retentionStatus(gifts.filter((g) => g.donorId === d.id), year) === 'lapsed')
      out.push({ id: `lapsed-${d.id}`, category: 'donor', urgency: 'due', to: `/donors/${d.id}`, title: `Call ${d.name} before year end`, detail: `Gave in ${year - 1}, nothing yet in ${year}` })
  }

  for (const e of events) {
    const until = daysBetween(today, e.date)
    if (until < 0 || until > EVENT_SOON_DAYS) continue
    const linked = donors.filter((d) => d.nextStep?.eventId === e.id).length
    out.push({
      id: `event-${e.id}`, category: 'event', urgency: 'upcoming', to: '/',
      title: `${e.name} is ${until === 0 ? 'today' : `in ${until} day${until === 1 ? '' : 's'}`}`,
      detail: `${fmtDate(e.date)} · ${linked} donor${linked === 1 ? ' has' : 's have'} a next step tied to it`,
    })
  }

  // Only admins can import, so only they get reminded to.
  if (role === 'admin')
    for (const s of IMPORT_SOURCES) {
      const last = latestImport(imports, s.key)
      const age = last ? daysBetween(last.importedAt.slice(0, 10), today) : undefined
      if (age === undefined)
        out.push({ id: `import-${s.key}`, category: 'spreadsheet', urgency: 'overdue', to: '/import', title: `${s.label} has never been imported`, detail: 'Never imported, so its gifts are missing from every total' })
      else if (age >= STALE_IMPORT_DAYS)
        out.push({ id: `import-${s.key}`, category: 'spreadsheet', urgency: 'due', to: '/import', title: `Re-import the ${s.label} (out of date)`, detail: `Last imported ${fmtDate(last.importedAt.slice(0, 10))} (${age} days ago)` })
    }

  return out.sort((a, b) => ORDER[a.urgency] - ORDER[b.urgency])
}
