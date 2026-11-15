import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { parseIcs } from './ical'

test('reads the demo calendar: all-day, TZID and UTC times, escapes, folding, cancellations', () => {
  const events = parseIcs(readFileSync(new URL('../../public/demo-calendar.ics', import.meta.url), 'utf8'))
  assert.deepEqual(events.map((e) => [e.name, e.date]), [
    ['Giving Tuesday', '2026-12-01'],
    ['Day of Compute', '2026-12-05'],
    ['Funder breakfast', '2026-12-10'],
    ['AI Academy Showcase', '2027-01-23'],
    ['AZ Gives Day', '2027-04-06'],
    ['Summer Camp Kickoff', '2027-06-07'],
  ])
})

test('UTC times land on the Phoenix date, and CRLF and folded lines parse', () => {
  const ics = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:a\r\nDTSTART:20261206T050000Z\r\nSUMMARY:Late\\, night\r\n  show\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n'
  assert.deepEqual(parseIcs(ics), [{ uid: 'a', name: 'Late, night show', date: '2026-12-05' }])
})

test('a moved occurrence of a recurring event does not add a second event', () => {
  const ev = (extra: string) => `BEGIN:VEVENT\nUID:r\nDTSTART;VALUE=DATE:20261201\nSUMMARY:Class\n${extra}END:VEVENT\n`
  assert.equal(parseIcs(ev('RRULE:FREQ=WEEKLY\n') + ev('RECURRENCE-ID;VALUE=DATE:20261208\n')).length, 1)
})
