import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Gift } from '../data/types'
import { calendarLink, cohorts, inviteDue, lapseBy, nextOwner, periodLabel, periodOf, retentionStatus, suggestOwners } from './logic'

const members = [{ id: 'a', name: 'Ann', email: '' }, { id: 'b', name: 'Ben', email: '' }, { id: 'c', name: 'Cy', email: '' }]
const owned = (...ids: (string | null)[]) => ids.map((ownerId) => ({ ownerId }))

test('the suggestion is the board member with the fewest donors; unassigned donors count for no one', () => {
  assert.equal(nextOwner(members, owned('a', 'a', 'b', null, null, null)), 'c')
  assert.equal(nextOwner(members, owned('a', 'b', 'c', 'c')), 'a') // tie between a and b: board order
})

test('several new donors are spread out instead of all going to one person', () => {
  const s = suggestOwners(members, owned('a', 'a', 'b'), ['n1', 'n2', 'n3', 'n4'])
  assert.deepEqual([...s.values()], ['c', 'b', 'c', 'a'])
})

test('an invite is due a week before the event, or today once that has passed', () => {
  assert.equal(inviteDue('2026-12-05', '2026-11-14'), '2026-11-28')
  assert.equal(inviteDue('2027-01-03', '2026-11-14'), '2026-12-27') // across a year end
  assert.equal(inviteDue('2026-11-17', '2026-11-14'), '2026-11-14')
})

test('the calendar link is an all-day event on the due date', () => {
  const url = new URL(calendarLink({ text: 'Invite to Day of Compute', due: '2026-12-31' }, { id: 'd4', name: 'Verizon Foundation' }, 'https://app.test'))
  assert.equal(url.searchParams.get('dates'), '20261231/20270101')
  assert.equal(url.searchParams.get('text'), 'Invite to Day of Compute (Verizon Foundation)')
  assert.match(url.searchParams.get('details')!, /https:\/\/app\.test\/donors\/d4$/)
})

test('undated gifts count toward lifetime giving but no year, and sort after dated ones', async () => {
  const { totalsByYear, inYear, byDateDesc, lastGiftDate, fmtDate } = await import('./logic')
  const gifts = [{ amount: 10, date: null }, { amount: 20, date: '2026-03-01' }, { amount: 5, date: '2025-01-01' }]
  assert.deepEqual([...totalsByYear(gifts as never).entries()].sort(), [[2025, 5], [2026, 20]])
  assert.equal(gifts.filter((g) => inYear(g, 2026)).length, 1)
  assert.deepEqual([...gifts].sort(byDateDesc).map((g) => g.date), ['2026-03-01', '2025-01-01', null])
  assert.equal(lastGiftDate(gifts), '2026-03-01')
  assert.equal(fmtDate(null), 'Date unknown')
})

test('quarters count across a year end, so Q1 is compared with the Q4 before it', () => {
  const qgift = (amount: number, date: string) => ({ id: date, donorId: 'd', amount, date, source: 'zeffy' as const, program: 'General' as const })
  const q1 = periodOf('2027-02-10', 'quarter')
  assert.equal(periodOf('2026-12-31', 'quarter'), q1 - 1)
  assert.equal(periodLabel(q1, 'quarter'), 'Q1 2027')
  assert.equal(retentionStatus([qgift(100, '2026-11-01'), qgift(150, '2027-02-10')], q1, 'quarter'), 'increased')
  assert.equal(retentionStatus([qgift(100, '2026-11-01')], q1, 'quarter'), 'lapsed')
  assert.equal(retentionStatus([qgift(100, '2026-02-01'), qgift(100, '2027-02-10')], q1, 'quarter'), 'recovered')
})

const gift = (donorId: string, date: string, source: Gift['source'] = 'zeffy', program: Gift['program'] = 'General'): Gift =>
  ({ id: `${donorId}-${date}`, donorId, amount: 100, date, source, program })

test('cohorts group donors by first gift and count who gave again each later year', () => {
  const gifts = [
    gift('a', '2024-03-01'), gift('a', '2025-03-01'), gift('a', '2026-03-01'),
    gift('b', '2024-06-01'), gift('b', '2026-06-01'), // skipped a year
    gift('c', '2025-01-01'),
    gift('d', '2026-01-01'),
    { ...gift('e', '2024-01-01'), date: null }, // undated gifts don't start a cohort
  ]
  assert.deepEqual(cohorts(gifts, 'year', 2026, 3), [
    { period: 2024, size: 2, gaveAgain: [1, 2] },
    { period: 2025, size: 1, gaveAgain: [0] },
    { period: 2026, size: 1, gaveAgain: [] },
  ])
})

test('lapse rate by source counts last period\'s donors who gave nothing this period', () => {
  const gifts = [
    gift('a', '2025-05-01', 'zeffy'), gift('a', '2026-05-01', 'zeffy'),
    gift('b', '2025-05-01', 'zeffy'),
    gift('c', '2025-05-01', 'benevity'), gift('c', '2026-05-01', 'spreadsheet'), // came back through another source: kept
  ]
  assert.deepEqual(lapseBy(gifts, 'year', 2026, 'source'), [
    { key: 'zeffy', gave: 2, lapsed: 1 },
    { key: 'benevity', gave: 1, lapsed: 0 },
  ])
  assert.deepEqual(lapseBy(gifts, 'year', 2026, 'program'), [{ key: 'General', gave: 3, lapsed: 1 }])
})
