import type { BoardMember, Donor, Gift, NextStep } from '../data/types'

// Select value standing for "no board member" (Select values can't be null).
export const UNASSIGNED = '__unassigned__'

// --- Suggested owner -------------------------------------------------------
// The suggestion for a new donor is the board member with the fewest donors;
// ties break by board order. Unassigned donors don't count toward anyone.
export function nextOwner(members: BoardMember[], donors: Pick<Donor, 'ownerId'>[]): string {
  const load = new Map(members.map((m) => [m.id, 0]))
  for (const d of donors) if (d.ownerId && load.has(d.ownerId)) load.set(d.ownerId, load.get(d.ownerId)! + 1)
  return members.reduce((best, m) => (load.get(m.id)! < load.get(best.id)! ? m : best)).id
}

// Suggestions for several new donors at once, spreading them out: each pick
// counts toward the next, so three new donors don't all go to one person.
export function suggestOwners(members: BoardMember[], donors: Pick<Donor, 'ownerId'>[], donorIds: string[]): Map<string, string> {
  const load = donors.map((d) => ({ ownerId: d.ownerId }))
  const out = new Map<string, string>()
  for (const id of donorIds) {
    const owner = nextOwner(members, load)
    out.set(id, owner)
    load.push({ ownerId: owner })
  }
  return out
}

// --- Retention ------------------------------------------------------------
export type RetentionStatus = 'new' | 'increased' | 'same' | 'decreased' | 'lapsed' | 'recovered' | 'inactive'

export const yearOf = (iso: string) => Number(iso.slice(0, 4))

// Years and quarters as consecutive integers, so the previous period is always n - 1.
export type Period = 'year' | 'quarter'
export const periodOf = (iso: string, p: Period) =>
  p === 'year' ? yearOf(iso) : yearOf(iso) * 4 + Math.floor((Number(iso.slice(5, 7)) - 1) / 3)
export const periodLabel = (n: number, p: Period) => (p === 'year' ? String(n) : `Q${(n % 4) + 1} ${Math.floor(n / 4)}`)

export function totalsByPeriod(gifts: Gift[], p: Period) {
  const t = new Map<number, number>()
  for (const g of gifts) t.set(periodOf(g.date, p), (t.get(periodOf(g.date, p)) ?? 0) + g.amount)
  return t
}

export const totalsByYear = (gifts: Gift[]) => totalsByPeriod(gifts, 'year')

export function retentionStatus(gifts: Gift[], period: number, p: Period = 'year'): RetentionStatus {
  const t = totalsByPeriod(gifts, p)
  const cur = t.get(period) ?? 0
  const prev = t.get(period - 1) ?? 0
  const earlier = [...t.keys()].some((n) => n < period - 1)
  if (cur && !prev) return earlier ? 'recovered' : 'new'
  if (!cur && prev) return 'lapsed'
  if (!cur) return 'inactive'
  if (cur > prev) return 'increased'
  if (cur < prev) return 'decreased'
  return 'same'
}

// --- Follow-up cadence ----------------------------------------------------
export const QUARTER_DAYS = 90

export const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)

// An invite goes out a week before the event, or today if that's already past.
export const INVITE_LEAD_DAYS = 7

export function inviteDue(eventDate: string, today: string) {
  const d = new Date(eventDate + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() - INVITE_LEAD_DAYS)
  const due = d.toISOString().slice(0, 10)
  return due < today ? today : due
}

// A Google Calendar "new event" link for a next step: an all-day event on its
// due date, so the board member can put it on their own calendar.
export function calendarLink(step: NextStep, donor: Pick<Donor, 'id' | 'name'>, origin: string) {
  const day = step.due.replaceAll('-', '')
  const next = new Date(step.due + 'T12:00:00Z')
  next.setUTCDate(next.getUTCDate() + 1)
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${step.text} (${donor.name})`,
    dates: `${day}/${next.toISOString().slice(0, 10).replaceAll('-', '')}`,
    details: `Coding in Color next step for ${donor.name}: ${origin}/donors/${donor.id}`,
  })
  return `https://calendar.google.com/calendar/render?${q}`
}

export function quarterlyTouchDue(d: Donor, today: string) {
  return !d.lastTouchAt || daysBetween(d.lastTouchAt, today) >= QUARTER_DAYS
}

export const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export const fmtDate = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
