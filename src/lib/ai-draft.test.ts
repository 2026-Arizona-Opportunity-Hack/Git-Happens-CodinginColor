import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cleanDraft, draftPrompt } from './ai-draft'

const donor = { id: 'd1', name: 'Ruth Alvarez', ownerId: 'bm1', sources: ['zeffy' as const] }
const owner = { id: 'bm1', name: 'Priya Shah', email: '' }
const gifts = [{ id: 'g1', donorId: 'd1', amount: 250, date: '2026-10-01', source: 'zeffy' as const, program: 'AI Academy' as const }]
const outcomes = [{ program: 'AI Academy' as const, studentsServed: 60, summary: 'Three cohorts finished.' }]

test('the prompt carries the donor\'s gifts, funded outcomes, event and the template', () => {
  const [system, user] = draftPrompt('quarterly-update', 'email', donor, gifts, owner, 'Hi Ruth, …', { id: 'e1', name: 'Day of Compute', date: '2026-12-05' }, outcomes)
  assert.match(system.content, /Never invent/)
  assert.match(system.content, /Priya Shah/)
  assert.match(user.content, /2026-10-01: \$250 to AI Academy/)
  assert.match(user.content, /AI Academy: Three cohorts finished\. \(60 students served\)/)
  assert.match(user.content, /Day of Compute on 2026-12-05/)
  assert.match(user.content, /Hi Ruth, …/)
})

test('texts are told to stay short', () => {
  assert.match(draftPrompt('thank-you', 'text', donor, gifts, owner, '')[0].content, /at most 320 characters/)
})

test('replies are cleaned, and unusable ones fall back to the template', () => {
  assert.equal(cleanDraft('```\nHi Ruth,\n\nThanks!\n```', 'email'), 'Hi Ruth,\n\nThanks!')
  assert.equal(cleanDraft('Subject: Thanks\n\nHi Ruth', 'email'), 'Hi Ruth')
  assert.equal(cleanDraft('', 'email'), null)
  assert.equal(cleanDraft('x'.repeat(400), 'text'), null)
  assert.equal(cleanDraft('Hi [Name], thanks', 'email'), null)
  assert.equal(cleanDraft('See https://example.org', 'email'), null)
})
