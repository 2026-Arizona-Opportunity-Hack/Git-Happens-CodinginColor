import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ImportRecord, Source } from '../data/types'
import { reminders } from './reminders'

const imp = (source: Source, importedAt: string): ImportRecord => ({ id: `${source}-${importedAt}`, source, rowCount: 1, importedAt, importedBy: 'u1' })
const base = { today: '2026-11-14', donors: [], gifts: [], drafts: [], events: [] }
const sheetReminders = (role: 'admin' | 'board', imports: ImportRecord[]) =>
  reminders({ ...base, role, memberId: 'u1', imports }).filter((r) => r.category === 'spreadsheet')

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
  const [first] = reminders({ ...base, role: 'board', memberId: 'u1', imports: [], donors: [donor] })
  assert.equal(first.urgency, 'overdue')
  assert.match(first.detail, /4 days overdue/)
})

test('admins are told how many donors need a board member; board members are not', () => {
  const donors = [
    { id: 'd1', name: 'A', ownerId: null, sources: [], lastTouchAt: '2026-11-01' },
    { id: 'd2', name: 'B', ownerId: null, sources: [], lastTouchAt: '2026-11-01' },
    { id: 'd3', name: 'C', ownerId: 'u1', sources: [], lastTouchAt: '2026-11-01' },
  ]
  const admin = reminders({ ...base, role: 'admin', memberId: 'u1', imports: [], donors }).find((r) => r.id === 'unassigned')
  assert.equal(admin?.title, '2 donors need a board member')
  assert.equal(admin?.to, '/all-donors')
  assert.equal(reminders({ ...base, role: 'board', memberId: 'u1', imports: [], donors }).some((r) => r.id === 'unassigned'), false)
})

test("an admin's donor reminders only cover donors assigned to them", () => {
  const donors = [
    { id: 'mine', name: 'Mine', ownerId: 'admin1', sources: [] }, // never contacted: quarterly update due
    { id: 'theirs', name: 'Theirs', ownerId: 'u2', sources: [] },
  ]
  const ids = reminders({ ...base, role: 'admin', memberId: 'admin1', imports: [], donors }).map((r) => r.id)
  assert.ok(ids.includes('touch-mine'))
  assert.ok(!ids.includes('touch-theirs'))
})

test('a pending draft for my donor asks for approval; approved drafts and other donors do not', () => {
  const donors = [{ id: 'd1', name: 'Ana', ownerId: 'u1', sources: [], lastTouchAt: '2026-11-01' }]
  const draft = (id: string, donorId: string, status: 'pending' | 'approved') =>
    ({ id, donorId, kind: 'thank-you' as const, channel: 'email' as const, body: 'Hi', createdAt: '2026-11-13', status })
  const drafts = [draft('x1', 'd1', 'pending'), draft('x2', 'd1', 'approved'), draft('x3', 'other', 'pending')]
  const rs = reminders({ ...base, role: 'board', memberId: 'u1', imports: [], donors, drafts }).filter((r) => r.category === 'draft')
  assert.deepEqual(rs.map((r) => r.title), ['Approve thank you for Ana'])
  assert.match(rs[0].detail, /nothing is sent until someone approves it/)
})

test('a next step due within a week is due; one further out is not a reminder yet', () => {
  const donor = (id: string, due: string) => ({ id, name: id, ownerId: 'u1', sources: [], lastTouchAt: '2026-11-01', nextStep: { text: 'Call', due } })
  const rs = reminders({ ...base, role: 'board', memberId: 'u1', imports: [], donors: [donor('today', '2026-11-14'), donor('soon', '2026-11-20'), donor('later', '2026-12-30')] })
  assert.deepEqual(rs.map((r) => [r.id, r.urgency, r.detail]), [
    ['step-today', 'due', 'Due today'],
    ['step-soon', 'due', 'Due Nov 20, 2026'],
  ])
})

test('a donor not contacted in 90 days is due a quarterly update', () => {
  const donors = [
    { id: 'old', name: 'Old', ownerId: 'u1', sources: [], lastTouchAt: '2026-08-01' },
    { id: 'recent', name: 'Recent', ownerId: 'u1', sources: [], lastTouchAt: '2026-10-01' },
  ]
  const rs = reminders({ ...base, role: 'board', memberId: 'u1', imports: [], donors })
  assert.deepEqual(rs.map((r) => r.id), ['touch-old'])
  assert.match(rs[0].detail, /Last contact Aug 1, 2026 \(105 days ago\)/)
})

test('a donor who gave last year and not this year gets a call-before-year-end reminder', () => {
  const donors = [{ id: 'd1', name: 'Ana', ownerId: 'u1', sources: [], lastTouchAt: '2026-11-01' }]
  const gifts = [{ id: 'g1', donorId: 'd1', amount: 50, date: '2025-12-02', source: 'zeffy' as const, program: 'General' as const }]
  const [r] = reminders({ ...base, role: 'board', memberId: 'u1', imports: [], donors, gifts })
  assert.equal(r.id, 'lapsed-d1')
  assert.equal(r.title, 'Call Ana before year end')
  assert.equal(r.detail, 'Gave in 2025, nothing yet in 2026')
})

test('events in the next 3 weeks are upcoming and count the donors whose next step points at them', () => {
  const events = [
    { id: 'e-today', name: 'Camp', date: '2026-11-14' },
    { id: 'e-soon', name: 'Day of Compute', date: '2026-11-15' },
    { id: 'e-past', name: 'Past', date: '2026-11-01' },
    { id: 'e-far', name: 'Far', date: '2027-01-30' },
  ]
  const donors = [{ id: 'd1', name: 'Ana', ownerId: 'u1', sources: [], lastTouchAt: '2026-11-01', nextStep: { text: 'Invite', due: '2026-12-30', eventId: 'e-soon' } }]
  const rs = reminders({ ...base, role: 'board', memberId: 'u1', imports: [], donors, events }).filter((r) => r.category === 'event')
  assert.deepEqual(rs.map((r) => r.title), ['Camp is today', 'Day of Compute is in 1 day'])
  assert.match(rs[1].detail, /1 donor has a next step tied to it/)
  assert.equal(rs[1].urgency, 'upcoming')
})
