import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Donor, Gift } from '../data/types'
import { parseCsv } from './dedupe'
import { donorsCsv } from './export'

const donors: Donor[] = [
  { id: 'd1', name: 'Smith, "Jo"', email: 'jo@x.org', ownerId: 'u1', sources: ['zeffy', 'benevity'], extra: { Campaign: 'Giving Tuesday' } },
  { id: 'd2', name: '=HYPERLINK("http://evil")', ownerId: null, sources: [] },
]
const gifts: Gift[] = [
  { id: 'g1', donorId: 'd1', amount: 100, date: '2025-03-01', source: 'zeffy', program: 'General' },
  { id: 'g2', donorId: 'd1', amount: 50.5, date: '2026-02-01', source: 'benevity', program: 'K12' },
]
const csv = donorsCsv(donors, gifts, (d) => (d.ownerId ? 'Ann' : 'Unassigned'), '2026-11-15')
const [a, b] = parseCsv(csv)

test('export has every donor column, totals and custom fields, and round-trips through a CSV parser', () => {
  assert.equal(a.name, 'Smith, "Jo"')
  assert.equal(a['board member'], 'Ann')
  assert.equal(a.sources, 'zeffy; benevity')
  assert.equal(a['lifetime giving'], '150.50')
  assert.equal(a['raised 2026'], '50.50')
  assert.equal(a['number of gifts'], '2')
  assert.equal(a['first gift'], '2025-03-01')
  assert.equal(a.campaign, 'Giving Tuesday')
  assert.equal(b['board member'], 'Unassigned')
})

test('imported text that looks like a formula is defused', () => {
  assert.equal(b.name, `'=HYPERLINK("http://evil")`)
})
