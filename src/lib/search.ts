import type { Donor } from '../data/types'

export const MAX_RESULTS = 8

// Name matches first, names that start with the query before the rest. Only
// the donors in the store, so a board member finds only their own.
export function searchDonors(donors: Donor[], query: string): Donor[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const digits = q.replace(/\D/g, '')
  const rank = (d: Donor) => {
    const name = d.name.toLowerCase()
    if (name.startsWith(q)) return 0
    if (name.includes(q)) return 1
    if ([d.org, d.email].some((f) => f?.toLowerCase().includes(q))) return 2
    if (digits.length >= 3 && d.phone?.replace(/\D/g, '').includes(digits)) return 2
    return -1
  }
  return donors
    .map((d) => ({ d, r: rank(d) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r || a.d.name.localeCompare(b.d.name))
    .slice(0, MAX_RESULTS)
    .map((x) => x.d)
}

// Pages whose name or keywords cover every word typed, so "api key" finds
// Read API. A word matches the start of a page word, and "keys" matches
// "key", so plurals and half-typed words both work. Name matches first.
export function searchPages<P extends { label: string; keywords?: string }>(pages: P[], query: string): P[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return []
  const covers = (text: string) => {
    const have = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
    return words.every((w) => have.some((h) => h.startsWith(w) || (h.length >= 3 && w.startsWith(h))))
  }
  return pages
    .map((p) => ({ p, r: covers(p.label) ? 0 : covers(`${p.label} ${p.keywords ?? ''}`) ? 1 : -1 }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r)
    .map((x) => x.p)
}
