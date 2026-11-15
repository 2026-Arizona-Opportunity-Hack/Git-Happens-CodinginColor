import assert from 'node:assert/strict'
import { test } from 'node:test'
import { draftBody } from './drafts'

const donor = { id: 'd1', name: 'Ana Ruiz', email: 'ana@example.com', ownerId: 'bm1', sources: [] }
const owner = { id: 'bm1', name: 'Priya Shah', email: 'priya@example.org' }
const event = { id: 'cal-1', name: 'Day of Compute', date: '2026-12-05' }

test('an invitation names the event and its date', () => {
  const body = draftBody('event-invite', donor, [], owner, event)
  assert.match(body, /^Hi Ana,/)
  assert.match(body, /Day of Compute on Dec 5\./)
  assert.match(body, /Priya Shah$/)
})

test('updates and nudges mention the next event only when there is one', () => {
  assert.match(draftBody('quarterly-update', donor, [], owner, event), /Day of Compute on Dec 5 is coming up/)
  assert.doesNotMatch(draftBody('lapsed-nudge', donor, [], owner), /Dec|undefined/)
})
