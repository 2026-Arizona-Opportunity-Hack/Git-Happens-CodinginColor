import type { Donor, Gift } from '../data/types'
import { inYear, retentionStatus, yearOf } from './logic'
import { xlsx, type Cell } from './xlsx'

// Exports for My Donors and All Donors: every donor field, giving totals, notes, and
// one column per custom field created while importing. One table feeds both
// the CSV and the Excel file, so they always have the same columns.

const round2 = (n: number) => Math.round(n * 100) / 100

export function donorTable(donors: Donor[], gifts: Gift[], ownerName: (d: Donor) => string, today: string) {
  const year = yearOf(today)
  const custom = [...new Set(donors.flatMap((d) => Object.keys(d.extra ?? {})))].sort()
  const header = [
    'Name', 'Email', 'Phone', 'Organization', 'Board member', 'Sources',
    'Lifetime giving', 'Number of gifts', 'First gift', 'Last gift', `Raised ${year}`, `Status ${year}`,
    'Next step', 'Next step due', 'Last contact', 'Notes', ...custom,
  ]
  const rows: Cell[][] = donors.map((d) => {
    const gs = gifts.filter((g) => g.donorId === d.id)
    const dates = gs.map((g) => g.date).filter((x): x is string => !!x).sort() // undated gifts have no first/last
    return [
      d.name, d.email, d.phone, d.org, ownerName(d), d.sources.join('; '),
      round2(gs.reduce((s, g) => s + g.amount, 0)), gs.length, dates[0], dates.at(-1),
      round2(gs.filter((g) => inYear(g, year)).reduce((s, g) => s + g.amount, 0)), retentionStatus(gs, year),
      d.nextStep?.text, d.nextStep?.due, d.lastTouchAt, d.notes, ...custom.map((k) => d.extra?.[k]),
    ]
  })
  return { header, rows }
}

// Quotes a cell, and defuses spreadsheet formulas: imported text starting with
// = + - @ would otherwise run as a formula when the CSV is opened in Excel.
function csvCell(v: Cell): string {
  let s = v === undefined || v === null ? '' : String(v)
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

export function donorsCsv(...args: Parameters<typeof donorTable>): string {
  const { header, rows } = donorTable(...args)
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

// Excel: money stays numeric so it can be summed and formatted.
export function donorsXlsx(...args: Parameters<typeof donorTable>): Uint8Array {
  const { header, rows } = donorTable(...args)
  return xlsx('Donors', header, rows)
}

const MIME = { csv: 'text/csv;charset=utf-8', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }

// Saves a file in the browser. A CSV gets a BOM so Excel reads it as UTF-8.
export function download(filename: string, data: string | Uint8Array) {
  const csv = typeof data === 'string'
  const blob = new Blob(csv ? ['﻿', data] : [data as BlobPart], { type: csv ? MIME.csv : MIME.xlsx })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
