import assert from 'node:assert/strict'
import { test } from 'node:test'
import { contactFields, date, extraFields, HttpError, oneOf, optStr, periodRange, str, summarize } from './api'

const rejects = (fn: () => unknown, message: RegExp) =>
  assert.throws(fn, (e: unknown) => e instanceof HttpError && e.status === 400 && message.test(e.message))

test('strings are trimmed; blank, non-string or too long is a 400', () => {
  assert.equal(str('  Call Ana ', 'text'), 'Call Ana')
  rejects(() => str('   ', 'text'), /text must be a non-empty string up to 2000 chars/)
  rejects(() => str(42, 'text'), /text must be/)
  rejects(() => str('x'.repeat(11), 'text', 10), /up to 10 chars/)
  assert.equal(optStr('', 'org'), undefined)
  assert.equal(optStr(null, 'org'), undefined)
  assert.equal(optStr(' APS ', 'org'), 'APS')
})

test('contact edits check email and phone, and blank clears a field', () => {
  assert.deepEqual(contactFields({ email: ' ana@example.org ' }), { email: 'ana@example.org' })
  assert.deepEqual(contactFields({ email: '', phone: '(520) 555-0106' }), { email: null, phone: '(520) 555-0106' })
  assert.deepEqual(contactFields({ phone: null }), { phone: null })
  for (const bad of [{}, null, { email: 'not-an-email' }, { email: 'a@b' }, { phone: '123' }, { phone: '555-CALL-NOW' }, { phone: '1'.repeat(16) }, { email: 'x'.repeat(195) + '@b.org' }, { email: 5 }])
    assert.throws(() => contactFields(bad), HttpError)
})

test('enums and dates only accept what the API allows', () => {
  assert.equal(oneOf('text', ['email', 'text'], 'channel'), 'text')
  rejects(() => oneOf('fax', ['email', 'text'], 'channel'), /channel must be one of email, text/)
  assert.equal(date('2026-11-15T10:00:00Z', 'due'), '2026-11-15')
  rejects(() => date('11/15/2026', 'due'), /due must be an ISO date/)
  rejects(() => date(undefined, 'due'), /ISO date/)
})

test('custom import fields are up to 30 short strings', () => {
  assert.equal(extraFields(undefined, 'extra'), undefined)
  assert.deepEqual(extraFields({ ' Campaign ': ' Giving Tuesday ' }, 'extra'), { Campaign: 'Giving Tuesday' })
  rejects(() => extraFields(['a'], 'extra'), /extra must be an object/)
  rejects(() => extraFields('a', 'extra'), /extra must be an object/)
  rejects(() => extraFields(Object.fromEntries(Array.from({ length: 31 }, (_, i) => [`f${i}`, 'x'])), 'extra'), /more than 30 fields/)
  rejects(() => extraFields({ Notes: 'x'.repeat(501) }, 'extra'), /extra\.Notes must be/)
})

test('a period is a year or a quarter, this year when missing, as [start, end)', () => {
  assert.deepEqual(periodRange(null, '2026-11-15'), { period: '2026', start: '2026-01-01', end: '2027-01-01' })
  assert.deepEqual(periodRange('2026-Q1', '2026-11-15'), { period: '2026-Q1', start: '2026-01-01', end: '2026-04-01' })
  assert.deepEqual(periodRange('2026-Q3', '2026-11-15'), { period: '2026-Q3', start: '2026-07-01', end: '2026-10-01' })
  assert.deepEqual(periodRange('2026-Q4', '2026-11-15'), { period: '2026-Q4', start: '2026-10-01', end: '2027-01-01' })
  rejects(() => periodRange('2026-Q5', '2026-11-15'), /period must be a year \(2026\) or a quarter \(2026-Q4\)/)
  rejects(() => periodRange('last year', '2026-11-15'), /period must be/)
})

test('the read API totals by quarter, program and board member, and names no donors', () => {
  const members = [{ id: 'u1', name: 'Priya Shah', email: 'priya@example.org' }]
  const gifts = [
    { amount: 500, date: '2026-11-02', program: 'AI Academy', donor_id: 'd1', owner_id: 'u1' },
    { amount: 100, date: '2026-05-10', program: 'K12', donor_id: 'd1', owner_id: 'gone' },
    { amount: 50, date: '2026-02-01', program: 'K12', donor_id: 'd2', owner_id: '' },
  ]
  const contacts = [{ by_id: 'u1', channel: 'text', date: '2026-11-03' }]
  const { totals, recent_activity } = summarize(gifts, contacts, members)

  assert.deepEqual(totals, {
    raised: 650, gifts: 3, donors: 2,
    by_quarter: { Q1: 50, Q2: 100, Q4: 500 },
    by_program: { 'AI Academy': 500, K12: 150 },
    by_board_member: [
      { id: 'u1', name: 'Priya Shah', raised: 500 },
      { id: 'gone', name: 'Former board member', raised: 100 },
      { id: '', name: 'Unassigned', raised: 50 },
    ],
  })
  assert.deepEqual(recent_activity.map((a) => [a.date, a.type, a.board_member]), [
    ['2026-11-03', 'contact', 'Priya Shah'],
    ['2026-11-02', 'gift', 'Priya Shah'],
    ['2026-05-10', 'gift', 'Former board member'],
    ['2026-02-01', 'gift', 'Unassigned'],
  ])
  assert.doesNotMatch(JSON.stringify(recent_activity), /d1|d2|donor/)
})

test('recent activity is the 25 newest gifts and contacts together', () => {
  const gifts = Array.from({ length: 30 }, (_, i) => ({ amount: 1, date: `2026-01-${String(i + 1).padStart(2, '0')}`, program: 'General', donor_id: `d${i}`, owner_id: '' })).reverse()
  const contacts = [{ by_id: '', channel: 'call', date: '2026-02-01' }]
  const { recent_activity } = summarize(gifts, contacts, [])
  assert.equal(recent_activity.length, 25)
  assert.equal(recent_activity[0].type, 'contact')
  assert.equal(recent_activity.at(-1)!.date, '2026-01-07')
})
