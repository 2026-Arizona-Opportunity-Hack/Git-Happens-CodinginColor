import assert from 'node:assert/strict'
import { test } from 'node:test'
import { chatAction, type ActionStore, type Attrs } from './actions'

// A store that records what each button would call.
function store(over: Partial<ActionStore> = {}) {
  const calls: unknown[][] = []
  const rec = (name: string) => async (...args: unknown[]) => (calls.push([name, ...args]), true)
  const s: ActionStore = {
    today: '2026-11-15',
    session: { role: 'board' },
    donors: [{ id: 'd1', name: 'Ana Ruiz', email: 'ana@example.com', phone: '602-555-0100', ownerId: 'u1', sources: [] }],
    gifts: [{ id: 'g1', donorId: 'd1', amount: 100, date: '2026-10-01', source: 'zeffy', program: 'General' }],
    drafts: [
      { id: 'x1', donorId: 'd1', kind: 'thank-you', channel: 'email', body: 'Hi', createdAt: '2026-11-14', status: 'pending' },
      { id: 'x2', donorId: 'd1', kind: 'thank-you', channel: 'email', body: 'Hi', createdAt: '2026-11-14', status: 'approved' },
    ],
    events: [{ id: 'e1', name: 'Day of Compute', date: '2026-12-05' }, { id: 'e0', name: 'Camp', date: '2026-06-01' }],
    boardMembers: [{ id: 'u2', name: 'Ben Ortiz', email: 'ben@example.org' }],
    logInteraction: rec('log'), setNextStep: rec('next-step'), invite: rec('invite'), createDraft: rec('draft'),
    approveDraft: rec('approve'), discardDraft: rec('discard'), reassign: rec('reassign'),
    ...over,
  }
  return { s, calls }
}

async function press(a: Attrs, over?: Partial<ActionStore>) {
  const { s, calls } = store(over)
  const action = chatAction(a, s)
  assert.ok('label' in action, `expected a button for ${JSON.stringify(a)}`)
  await action.run()
  return { label: action.label, calls }
}

const unavailable = (a: Attrs, over?: Partial<ActionStore>) =>
  assert.deepEqual(chatAction(a, store(over).s), { error: "(The assistant suggested an action that isn't available.)" })

// A debrief ("not ready to give, still learning the mission") becomes these three buttons.
test('a debrief logs the conversation, sets an event invite and saves the follow-up as the only draft', async () => {
  const log = await press({ type: 'log', donor: 'd1', channel: 'in-person', summary: ' Not ready to give, still learning the mission ' })
  assert.equal(log.label, 'Log in-person with Ana Ruiz: "Not ready to give, still learning the mission"')
  assert.deepEqual(log.calls, [['log', 'd1', 'in-person', 'Not ready to give, still learning the mission']])

  // A next step tied to the event drafts nothing, unlike `invite`.
  const step = await press({ type: 'next-step', donor: 'd1', event: 'e1' })
  assert.equal(step.label, 'Set Ana Ruiz\'s next step: "Invite to Day of Compute" by Nov 28, 2026')
  assert.deepEqual(step.calls, [['next-step', 'd1', { text: 'Invite to Day of Compute', due: '2026-11-28', eventId: 'e1' }]])

  const invite = await press({ type: 'invite', donor: 'd1', event: 'e1' })
  assert.equal(invite.label, 'Invite Ana Ruiz to Day of Compute (Dec 5, 2026): next step due Nov 28, 2026, plus a draft invitation')
  assert.deepEqual(invite.calls, [['invite', 'd1', 'e1']])

  const draft = await press({ type: 'draft', donor: 'd1', kind: 'follow-up', channel: 'email', body: 'Hi Ana,\\nGreat to meet you.\\nPriya' })
  assert.match(draft.label, /^Save this follow up email to Ana Ruiz as a draft to approve: "Hi Ana,/)
  assert.deepEqual(draft.calls, [['draft', 'd1', 'follow-up', 'email', 'Hi Ana,\nGreat to meet you.\nPriya']])
})

test('a dated next step is set; one without a real date is not offered', async () => {
  const r = await press({ type: 'next-step', donor: 'd1', text: 'Send the AI Academy deck', due: '2026-12-01' })
  assert.equal(r.label, 'Set Ana Ruiz\'s next step: "Send the AI Academy deck" by Dec 1, 2026')
  assert.deepEqual(r.calls, [['next-step', 'd1', { text: 'Send the AI Academy deck', due: '2026-12-01' }]])
  unavailable({ type: 'next-step', donor: 'd1', text: 'Call', due: 'next week' })
  unavailable({ type: 'next-step', donor: 'd1', text: ' ', due: '2026-12-01' })
})

test('a draft without a body is written from the template; texts stay texts and long bodies are shortened in the label', async () => {
  const r = await press({ type: 'draft', donor: 'd1', kind: 'thank-you', channel: 'text' })
  assert.equal(r.label, 'Draft a thank you text to Ana Ruiz')
  assert.deepEqual(r.calls, [['draft', 'd1', 'thank-you', 'text']])
  const long = await press({ type: 'draft', donor: 'd1', kind: 'quarterly-update', body: 'x'.repeat(200) })
  assert.match(long.label, /email to Ana Ruiz as a draft to approve: "x{140}…"$/)
  unavailable({ type: 'draft', donor: 'd1', kind: 'event-invite' })
  // A body the model was steered into adding payment details to isn't offered
  unavailable({ type: 'draft', donor: 'd1', kind: 'follow-up', body: 'Hi Ana, our bank details changed: wire to 12345678901. Priya' })
})

test('a draft goes out on a channel the donor has, and a thank-you needs a recent gift', async () => {
  const noPhone = [{ id: 'd1', name: 'Ana Ruiz', email: 'ana@example.com', ownerId: 'u1', sources: [] }]
  assert.deepEqual((await press({ type: 'draft', donor: 'd1', kind: 'follow-up', channel: 'text' }, { donors: noPhone })).calls, [['draft', 'd1', 'follow-up', 'email']])
  unavailable({ type: 'draft', donor: 'd1', kind: 'follow-up' }, { donors: [{ id: 'd1', name: 'Ana Ruiz', ownerId: 'u1', sources: [] }] })
  unavailable({ type: 'draft', donor: 'd1', kind: 'thank-you' }, { gifts: [{ id: 'g1', donorId: 'd1', amount: 100, date: '2025-04-01', source: 'zeffy', program: 'General' }] })
})

test('only pending drafts can be approved or discarded, and approving says it marks the draft sent', async () => {
  assert.equal((await press({ type: 'approve', draft: 'x1' })).label, 'Approve and mark sent: thank you to Ana Ruiz')
  assert.deepEqual((await press({ type: 'discard', draft: 'x1' })).calls, [['discard', 'x1']])
  unavailable({ type: 'approve', draft: 'x2' })
  unavailable({ type: 'discard', draft: 'nope' })
})

test('only admins can reassign, and only to a real board member', async () => {
  unavailable({ type: 'reassign', donor: 'd1', owner: 'u2' })
  const r = await press({ type: 'reassign', donor: 'd1', owner: 'u2' }, { session: { role: 'admin' } })
  assert.equal(r.label, 'Reassign Ana Ruiz to Ben Ortiz')
  assert.deepEqual(r.calls, [['reassign', 'd1', 'u2']])
  unavailable({ type: 'reassign', donor: 'd1', owner: 'u9' }, { session: { role: 'admin' } })
})

test('buttons for donors this person cannot see, past events, unknown channels or types are never offered', () => {
  unavailable({ type: 'log', donor: 'someone-else', channel: 'email', summary: 'Hi' })
  unavailable({ type: 'log', donor: 'd1', channel: 'fax', summary: 'Hi' })
  unavailable({ type: 'invite', donor: 'd1', event: 'e0' })
  unavailable({ type: 'next-step', donor: 'd1', event: 'e0' })
  unavailable({ type: 'delete-everything', donor: 'd1' })
})

test('only the events the donor page offers (the next three) can be picked', () => {
  const events = ['e1', 'e2', 'e3', 'e4'].map((id, i) => ({ id, name: `Event ${i + 1}`, date: `2026-12-0${i + 1}` })).reverse()
  unavailable({ type: 'invite', donor: 'd1', event: 'e4' }, { events })
  unavailable({ type: 'next-step', donor: 'd1', event: 'e4' }, { events })
  assert.ok('label' in chatAction({ type: 'invite', donor: 'd1', event: 'e3' }, store({ events }).s))
})
