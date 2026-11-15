import type { Donor, Gift } from '../data/types'
import { retentionStatus, yearOf } from './logic'

// CSV export for My Donors and All Donors: every donor field, giving totals,
// and one column per custom field created while importing.

// Quotes a cell, and defuses spreadsheet formulas: imported text starting with
// = + - @ would otherwise run as a formula when the file is opened in Excel.
function cell(v: unknown): string {
  let s = v === undefined || v === null ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

export function donorsCsv(donors: Donor[], gifts: Gift[], ownerName: (d: Donor) => string, today: string): string {
  const year = yearOf(today)
  const custom = [...new Set(donors.flatMap((d) => Object.keys(d.extra ?? {})))].sort()
  const header = [
    'Name', 'Email', 'Phone', 'Organization', 'Board member', 'Sources',
    'Lifetime giving', 'Number of gifts', 'First gift', 'Last gift', `Raised ${year}`, `Status ${year}`,
    'Next step', 'Next step due', 'Last contact', ...custom,
  ]
  const rows = donors.map((d) => {
    const gs = gifts.filter((g) => g.donorId === d.id)
    const dates = gs.map((g) => g.date).sort()
    return [
      d.name, d.email, d.phone, d.org, ownerName(d), d.sources.join('; '),
      gs.reduce((s, g) => s + g.amount, 0).toFixed(2), gs.length, dates[0], dates.at(-1),
      gs.filter((g) => yearOf(g.date) === year).reduce((s, g) => s + g.amount, 0).toFixed(2), retentionStatus(gs, year),
      d.nextStep?.text, d.nextStep?.due, d.lastTouchAt, ...custom.map((k) => d.extra?.[k]),
    ]
  })
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n'
}

// Saves text as a file in the browser. The BOM makes Excel read it as UTF-8.
export function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob(['﻿', text], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
