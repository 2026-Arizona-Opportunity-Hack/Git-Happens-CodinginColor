import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyFilters, describeFilter } from '../components/ui/filters'
import { nextBucket } from './donor-columns'
import type { Donor } from '../data/types'

type R = { name: string; status: string; tags: string[]; last?: string }
const rows: R[] = [
  { name: 'Ada Lovelace', status: 'new', tags: ['zeffy'], last: '2026-02-01' },
  { name: 'Grace Hopper', status: 'lapsed', tags: ['zeffy', 'benevity'], last: '2025-06-01' },
  { name: 'Alan Turing', status: 'same', tags: ['spreadsheet'] },
]
const columns = [
  { id: 'name', header: 'Donor', accessorFn: (r: R) => r.name, meta: { filter: { kind: 'text' as const } } },
  { id: 'status', header: 'Status', accessorFn: (r: R) => r.status, meta: { filter: { kind: 'options' as const, values: (r: R) => [r.status] } } },
  { id: 'tags', header: 'Sources', meta: { filter: { kind: 'options' as const, values: (r: R) => r.tags } } },
  { id: 'last', header: 'Last gift', accessorFn: (r: R) => r.last, meta: { filter: { kind: 'dateRange' as const } } },
  { id: 'plain', header: 'No filter', accessorFn: (r: R) => r.name },
]
const names = (f: Parameters<typeof applyFilters>[2]) => applyFilters(rows, columns, f).map((r) => r.name)

test('column filters combine: text contains, checklist, and date range', () => {
  assert.deepEqual(names({}), ['Ada Lovelace', 'Grace Hopper', 'Alan Turing'])
  assert.deepEqual(names({ name: ' TUR ' }), ['Alan Turing']) // trimmed, any case
  assert.deepEqual(names({ status: ['new', 'same'] }), ['Ada Lovelace', 'Alan Turing'])
  assert.deepEqual(names({ tags: ['benevity'] }), ['Grace Hopper']) // a row with several values matches any of them
  assert.deepEqual(names({ last: { from: '2026-01-01', to: '' } }), ['Ada Lovelace']) // no date never matches
  assert.deepEqual(names({ status: ['new', 'lapsed'], last: { from: '', to: '2025-12-31' } }), ['Grace Hopper'])
  assert.deepEqual(names({ plain: 'zzz' }), ['Ada Lovelace', 'Grace Hopper', 'Alan Turing']) // only columns with a filter count
})

test('active filters read as short labels', () => {
  assert.equal(describeFilter(columns[1], ['new', 'same', 'lapsed']), 'Status: new, same +1')
  assert.equal(describeFilter(columns[0], 'ada '), 'Donor contains “ada”')
})

test('next steps fall in Excel-style buckets', () => {
  const d = (due?: string) => ({ id: 'd', name: 'x', sources: [], ownerId: null, nextStep: due ? { text: 't', due } : undefined }) as Donor
  assert.equal(nextBucket(d(), '2026-11-15'), 'none')
  assert.equal(nextBucket(d('2026-11-14'), '2026-11-15'), 'overdue')
  assert.equal(nextBucket(d('2026-11-22'), '2026-11-15'), 'week')
  assert.equal(nextBucket(d('2026-11-23'), '2026-11-15'), 'later')
})
