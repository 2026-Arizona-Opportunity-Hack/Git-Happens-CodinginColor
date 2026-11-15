import type { BoardMember, Donor, Gift } from '../data/types'

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

export function totalsByYear(gifts: Gift[]) {
  const t = new Map<number, number>()
  for (const g of gifts) t.set(yearOf(g.date), (t.get(yearOf(g.date)) ?? 0) + g.amount)
  return t
}

export function retentionStatus(gifts: Gift[], year: number): RetentionStatus {
  const t = totalsByYear(gifts)
  const cur = t.get(year) ?? 0
  const prev = t.get(year - 1) ?? 0
  const earlier = [...t.keys()].some((y) => y < year - 1)
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

export function quarterlyTouchDue(d: Donor, today: string) {
  return !d.lastTouchAt || daysBetween(d.lastTouchAt, today) >= QUARTER_DAYS
}

export const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export const fmtDate = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
