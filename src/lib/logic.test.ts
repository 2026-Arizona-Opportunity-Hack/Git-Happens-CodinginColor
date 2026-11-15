import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calendarLink, inviteDue, nextOwner, suggestOwners } from './logic'

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
