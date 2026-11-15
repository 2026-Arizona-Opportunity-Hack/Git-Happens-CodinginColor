import type { BoardMember } from '../data/types'

// The parts of the Worker API that don't touch D1 or WorkOS: checking request
// bodies, and the read API's period and totals. They live here so they can be
// unit-tested; worker/index.ts calls them.

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}

// --- Input validation -------------------------------------------------------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/

export function str(v: unknown, field: string, max = 2000): string {
  if (typeof v !== 'string' || !v.trim() || v.length > max) throw new HttpError(400, `${field} must be a non-empty string up to ${max} chars`)
  return v.trim()
}
export const optStr = (v: unknown, field: string, max = 200) => (v === undefined || v === null || v === '' ? undefined : str(v, field, max))
export function oneOf<T extends string>(v: unknown, allowed: readonly T[], field: string): T {
  if (!allowed.includes(v as T)) throw new HttpError(400, `${field} must be one of ${allowed.join(', ')}`)
  return v as T
}
export function date(v: unknown, field: string): string {
  if (typeof v !== 'string' || !ISO_DATE.test(v)) throw new HttpError(400, `${field} must be an ISO date`)
  return v.slice(0, 10)
}
// Custom import fields: up to 30 short text values per row.
export function extraFields(v: unknown, field: string): Record<string, string> | undefined {
  if (v === undefined || v === null) return undefined
  if (typeof v !== 'object' || Array.isArray(v)) throw new HttpError(400, `${field} must be an object`)
  const entries = Object.entries(v as Record<string, unknown>)
  if (entries.length > 30) throw new HttpError(400, `${field} has more than 30 fields`)
  return Object.fromEntries(entries.map(([k, x]) => [str(k, `${field} key`, 60), str(x, `${field}.${k}`, 500)]))
}

// --- Read API (GET /api/v1/summary) ------------------------------------------

// period is a year (2026) or a quarter (2026-Q4), this year when missing;
// returns [start, end).
export function periodRange(v: string | null, today: string): { period: string; start: string; end: string } {
  const p = v ?? today.slice(0, 4)
  const m = p.match(/^(\d{4})(?:-Q([1-4]))?$/)
  if (!m) throw new HttpError(400, 'period must be a year (2026) or a quarter (2026-Q4)')
  const y = Number(m[1])
  if (!m[2]) return { period: p, start: `${y}-01-01`, end: `${y + 1}-01-01` }
  const q = Number(m[2])
  const month = (n: number) => String(n).padStart(2, '0')
  return { period: p, start: `${y}-${month(q * 3 - 2)}-01`, end: q === 4 ? `${y + 1}-01-01` : `${y}-${month(q * 3 + 1)}-01` }
}

// The period's gifts (newest first, with the donor's owner) and its 25 latest
// contacts, as D1 returns them.
export interface SummaryGift { amount: number; date: string; program: string; donor_id: string; owner_id: string }
export interface SummaryContact { by_id: string; channel: string; date: string }

// Totals grouped by quarter, program and board member, and the 25 latest gifts
// and contacts. Only counts, sums and who on the board did what: no donor
// names, emails or IDs.
export function summarize(gifts: SummaryGift[], contacts: SummaryContact[], members: BoardMember[]) {
  const name = (mid: string) => (mid ? members.find((mb) => mb.id === mid)?.name ?? 'Former board member' : 'Unassigned')
  const sum = (key: (g: SummaryGift) => string) =>
    gifts.reduce<Record<string, number>>((acc, g) => ({ ...acc, [key(g)]: (acc[key(g)] ?? 0) + g.amount }), {})
  const byMember = sum((g) => g.owner_id)
  return {
    totals: {
      raised: gifts.reduce((t, g) => t + g.amount, 0),
      gifts: gifts.length,
      donors: new Set(gifts.map((g) => g.donor_id)).size,
      by_quarter: Object.fromEntries(Object.entries(sum((g) => `Q${Math.floor((Number(g.date.slice(5, 7)) - 1) / 3) + 1}`)).sort()),
      by_program: sum((g) => g.program),
      by_board_member: Object.keys(byMember).map((mid) => ({ id: mid, name: name(mid), raised: byMember[mid] })),
    },
    recent_activity: [
      ...gifts.slice(0, 25).map((g) => ({ date: g.date, type: 'gift', amount: g.amount, program: g.program, board_member: name(g.owner_id) })),
      ...contacts.map((i) => ({ date: i.date, type: 'contact', channel: i.channel, board_member: name(i.by_id) })),
    ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 25),
  }
}
