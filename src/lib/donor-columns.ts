import type { Donor, Gift, Source } from '@/data/types'
import type { ColumnFilterDef } from '@/components/ui/filters'
import type { RetentionStatus } from '@/lib/logic'

// Column filters shared by My Donors and All Donors.

export const SOURCE_LABEL: Record<Source, string> = { spreadsheet: 'Spreadsheet', zeffy: 'Zeffy', benevity: 'Benevity', azgives: 'AZ Gives', unitedway: 'United Way' }

export const donorTextFilter = <R extends { d: Donor }>(): ColumnFilterDef<R> => ({
  kind: 'text',
  placeholder: 'Name, org or email',
  text: (r) => `${r.d.name} ${r.d.org ?? ''} ${r.d.email ?? ''}`,
})

// On the Last gift column: donors with any dated gift in the range, so
// "gave during Giving Tuesday" finds people who've given since, too.
export const giftDateFilter = <R extends { d: Donor }>(gifts: Gift[]): ColumnFilterDef<R> => ({
  kind: 'dateRange',
  hint: 'Donors with a gift in this range. Gifts with no date are left out.',
  match: (r, from, to) => gifts.some((g) => g.donorId === r.d.id && !!g.date && (!from || g.date >= from) && (!to || g.date <= to)),
})

export const sourceFilter = <R extends { d: Donor }>(): ColumnFilterDef<R> => ({
  kind: 'options',
  values: (r) => r.d.sources,
  label: (v) => SOURCE_LABEL[v as Source] ?? v,
})

export const STATUSES: RetentionStatus[] = ['new', 'increased', 'same', 'decreased', 'recovered', 'lapsed', 'inactive']
export const capitalize = (v: string) => v[0].toUpperCase() + v.slice(1)

// Next step, as Excel-style buckets.
export const NEXT_BUCKETS = ['overdue', 'week', 'later', 'none'] as const
const NEXT_LABEL: Record<(typeof NEXT_BUCKETS)[number], string> = { overdue: 'Overdue', week: 'Due in the next 7 days', later: 'Due later', none: 'No next step' }
export function nextBucket(d: Donor, today: string): (typeof NEXT_BUCKETS)[number] {
  const due = d.nextStep?.due
  if (!due) return 'none'
  if (due < today) return 'overdue'
  const end = new Date(today + 'T00:00:00Z')
  end.setUTCDate(end.getUTCDate() + 7)
  return due <= end.toISOString().slice(0, 10) ? 'week' : 'later'
}
export const nextStepFilter = <R extends { d: Donor }>(today: string): ColumnFilterDef<R> => ({
  kind: 'options',
  values: (r) => [nextBucket(r.d, today)],
  order: [...NEXT_BUCKETS],
  label: (v) => NEXT_LABEL[v as (typeof NEXT_BUCKETS)[number]] ?? v,
})
