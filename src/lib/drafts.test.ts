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

test('a quarterly update names the programs the donor funded, but not General', () => {
  const g = (program: 'Day of Compute' | 'General') => ({ id: program, donorId: 'd1', amount: 100, date: '2026-03-01', source: 'zeffy' as const, program })
  assert.match(draftBody('quarterly-update', donor, [g('Day of Compute'), g('General')], owner), /Your support went to Day of Compute\. /)
  assert.doesNotMatch(draftBody('quarterly-update', donor, [g('General')], owner), /\[|support went/)
})

test('updates and nudges mention the next event only when there is one', () => {
  assert.match(draftBody('quarterly-update', donor, [], owner, event), /Day of Compute on Dec 5 is coming up/)
  assert.doesNotMatch(draftBody('lapsed-nudge', donor, [], owner), /Dec|undefined/)
})

const gift = { id: 'g1', donorId: 'd1', amount: 250, date: '2025-06-01', source: 'zeffy' as const, program: 'AI Academy' as const }

test('a thank-you names the last gift and its program, signed by the board member', () => {
  const body = draftBody('thank-you', donor, [gift], owner)
  assert.match(body, /Thank you for your \$250 gift to Coding in Color for AI Academy\./)
  assert.match(body, /Priya Shah$/)
  assert.match(draftBody('thank-you', donor, [], owner), /Thank you for your gift to Coding in Color\. It goes/)
})

test('an organization whose email is not the person is greeted as a team', () => {
  assert.match(draftBody('thank-you', { ...donor, name: 'APS Foundation', org: 'APS', email: 'grants@example.org' }, [], owner), /^Hi team,/)
})

test('a lapsed nudge quotes the last gift and year, and names the next event', () => {
  const body = draftBody('lapsed-nudge', donor, [gift], owner, event)
  assert.match(body, /Your past support \(\$250 in 2025\)/)
  assert.match(body, /Day of Compute on Dec 5 is coming up\. Would you consider joining us again\?/)
})

test('a follow-up repeats the next step; an invite with no event asks to send details', () => {
  assert.match(draftBody('follow-up', { ...donor, nextStep: { text: 'send the AI Academy deck', due: '2026-12-01' } }, [], owner), /Following up on: send the AI Academy deck\./)
  assert.match(draftBody('event-invite', donor, [], owner), /our next Coding in Color event\. Can I send you the details\?/)
})
