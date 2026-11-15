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
