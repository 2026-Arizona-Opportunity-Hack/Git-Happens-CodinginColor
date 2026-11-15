import { useState } from 'react'
import type { Donor, Gift } from '@/data/types'

// Filters shared by My Donors and All Donors: name/org/email text and a
// donation date range (donors with at least one dated gift in it). See DonorFilterBar.
export function useDonorFilters(gifts: Gift[]) {
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const needle = q.trim().toLowerCase()
  const match = (d: Donor) =>
    `${d.name} ${d.org ?? ''} ${d.email ?? ''}`.toLowerCase().includes(needle) &&
    (!from && !to || gifts.some((g) => g.donorId === d.id && !!g.date && (!from || g.date >= from) && (!to || g.date <= to)))
  return { q, setQ, from, setFrom, to, setTo, match, active: !!(q || from || to), clear: () => { setQ(''); setFrom(''); setTo('') } }
}
