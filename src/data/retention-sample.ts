import type { Donor, Gift } from './types'

// Fake donors that show off the Retention page quarter over quarter. Part of
// the "Use sample data" set (see sample-data.ts); never saved.

const donor = (id: string, name: string, sources: Donor['sources']): Donor => ({ id, name, ownerId: null, sources })

export const sampleDonors: Donor[] = [
  donor('s1', 'Ruth Alvarez', ['zeffy']),
  donor('s2', 'Desert Bloom Fund', ['spreadsheet']),
  donor('s3', 'Omar Haddad', ['benevity']),
  donor('s4', 'Copper State Credit Union', ['spreadsheet']),
  donor('s5', 'Grace Park', ['zeffy']),
  donor('s6', 'Theo Brooks', ['azgives']),
  donor('s7', 'Linda Morales', ['zeffy']),
  donor('s8', 'Jamal Wright', ['unitedway']),
  donor('s9', 'Sonoran Tech Partners', ['spreadsheet']),
  donor('s10', 'Beth Nguyen', ['benevity']),
]

// [donorId, amount, date]
const rows: [string, number, string][] = [
  // Steady: the same every quarter
  ...['2025-01-15', '2025-04-15', '2025-07-15', '2025-10-15', '2026-01-15', '2026-04-15', '2026-07-15', '2026-10-15'].map((d): [string, number, string] => ['s1', 300, d]),
  // Growing each quarter
  ['s2', 500, '2025-08-01'], ['s2', 750, '2025-11-01'], ['s2', 1000, '2026-02-01'], ['s2', 1000, '2026-05-01'], ['s2', 1500, '2026-08-01'], ['s2', 2000, '2026-11-01'],
  // Gave every quarter, then stopped this quarter
  ...['2025-03-30', '2025-06-30', '2025-09-30', '2025-12-30', '2026-03-30', '2026-06-30', '2026-09-30'].map((d): [string, number, string] => ['s3', 150, d]),
  // Shrinking
  ['s4', 2000, '2026-05-10'], ['s4', 1200, '2026-08-10'], ['s4', 800, '2026-10-10'],
  // Brand new this quarter
  ['s5', 250, '2026-10-20'],
  // Came back after a long gap
  ['s6', 100, '2025-05-02'], ['s6', 200, '2026-11-03'],
  // Year-end giver only
  ['s7', 500, '2024-12-02'], ['s7', 500, '2025-12-02'],
  // New last quarter, gave the same again
  ['s8', 75, '2026-07-04'], ['s8', 75, '2026-10-04'],
  // Quarterly corporate grant, bigger this quarter
  ...['2025-01-05', '2025-04-05', '2025-07-05', '2025-10-05', '2026-01-05', '2026-04-05', '2026-07-05'].map((d): [string, number, string] => ['s9', 5000, d]),
  ['s9', 7500, '2026-10-05'],
  // Stopped in spring
  ['s10', 60, '2025-09-12'], ['s10', 60, '2025-12-12'], ['s10', 60, '2026-03-12'],
]

export const sampleGifts: Gift[] = rows.map(([donorId, amount, date], i) => ({
  id: `sg${i + 1}`, donorId, amount, date, source: sampleDonors.find((d) => d.id === donorId)!.sources[0], program: 'General',
}))
