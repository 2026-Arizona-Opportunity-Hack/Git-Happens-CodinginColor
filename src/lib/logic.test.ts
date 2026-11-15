import assert from 'node:assert/strict'
import { test } from 'node:test'
import { nextOwner, suggestOwners } from './logic'

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
