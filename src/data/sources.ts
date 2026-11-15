import type { Source } from './types'

// The exports CIC loads on the Import page, in display order.
export const IMPORT_SOURCES: { key: Source; label: string; hint: string }[] = [
  { key: 'unitedway', label: 'United Way export', hint: 'Export the United Way donor report as CSV' },
  { key: 'zeffy', label: 'Zeffy export', hint: 'Zeffy → Payments → Export' },
  { key: 'benevity', label: 'Benevity export', hint: 'Benevity Causes Portal → Donations report' },
]

// An import older than this shows as stale and raises a reminder.
export const STALE_IMPORT_DAYS = 30
