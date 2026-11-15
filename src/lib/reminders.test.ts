import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ImportRecord, Source } from '../data/types'
import { reminders } from './reminders'

const imp = (source: Source, importedAt: string): ImportRecord => ({ id: `${source}-${importedAt}`, source, rowCount: 1, importedAt, importedBy: 'u1' })
const base = { today: '2026-11-14', donors: [], gifts: [], drafts: [], events: [] }
const sheetReminders = (role: 'admin' | 'board', imports: ImportRecord[]) =>
  reminders({ ...base, role, imports }).filter((r) => r.category === 'spreadsheet')

test('admins are reminded about exports never imported or older than 30 days', () => {
  const rs = sheetReminders('admin', [
    imp('spreadsheet', '2026-11-14T10:00:00Z'), // fresh
    imp('zeffy', '2026-09-01T10:00:00Z'),
    imp('zeffy', '2026-10-01T10:00:00Z'), // newest zeffy: 44 days old
  ])
  assert.deepEqual(rs.map((r) => r.id).sort(), ['import-benevity', 'import-zeffy'])
  assert.match(rs.find((r) => r.id === 'import-zeffy')!.detail, /44 days ago/)
})

test('board members get no spreadsheet reminders', () => {
  assert.equal(sheetReminders('board', []).length, 0)
})

test('an overdue next step is overdue and sorts first', () => {
  const donor = { id: 'd1', name: 'APS', ownerId: 'u1', sources: [], lastTouchAt: '2026-11-01', nextStep: { text: 'Call', due: '2026-11-10' } }
  const [first] = reminders({ ...base, role: 'board', imports: [], donors: [donor] })
  assert.equal(first.urgency, 'overdue')
  assert.match(first.detail, /4 days overdue/)
})

test('admins are told how many donors need a board member; board members are not', () => {
  const donors = [
    { id: 'd1', name: 'A', ownerId: null, sources: [], lastTouchAt: '2026-11-01' },
    { id: 'd2', name: 'B', ownerId: null, sources: [], lastTouchAt: '2026-11-01' },
    { id: 'd3', name: 'C', ownerId: 'u1', sources: [], lastTouchAt: '2026-11-01' },
  ]
  const admin = reminders({ ...base, role: 'admin', imports: [], donors }).find((r) => r.id === 'unassigned')
  assert.equal(admin?.title, '2 donors need a board member')
  assert.equal(admin?.to, '/all-donors')
  assert.equal(reminders({ ...base, role: 'board', imports: [], donors }).some((r) => r.id === 'unassigned'), false)
})
