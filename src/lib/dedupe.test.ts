import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { RawDonorRow } from '../data/types'
import { SAMPLE_CSV } from '../data/samples'
import { autoMapping, csvHeaders, dedupe, matchDonor, mergeNotes, NEW_COLUMN, parseAmount, parseDate, rowsFromCsv, sameGift, SKIP, splitGifts } from './dedupe'

const row = (r: Partial<RawDonorRow>): RawDonorRow => ({ source: 'spreadsheet', name: 'Kevin Tran', ...r })

test('same amount within 3 days is the same gift; 4 days or a different amount is not', () => {
  assert.ok(sameGift({ amount: 500, date: '2026-06-30' }, { amount: 500, date: '2026-07-03' }))
  assert.ok(!sameGift({ amount: 500, date: '2026-06-30' }, { amount: 500, date: '2026-07-04' }))
  assert.ok(!sameGift({ amount: 500, date: '2026-06-30' }, { amount: 250, date: '2026-06-30' }))
})

test('re-importing the same file records no new gifts', () => {
  const rows = [row({ amount: 100, date: '2026-01-05' }), row({ amount: 200, date: '2026-03-05' })]
  const first = splitGifts(rows, [])
  assert.equal(first.keep.length, 2)
  const again = splitGifts(rows, first.keep)
  assert.equal(again.keep.length, 0)
  assert.equal(again.skipped.length, 2)
})

test('a donation reported by Benevity and the spreadsheet is recorded once', () => {
  const rows = [
    row({ source: 'benevity', amount: 500, date: '2026-06-30' }),
    row({ source: 'spreadsheet', amount: 500, date: '2026-07-01' }),
  ]
  const { keep, skipped } = splitGifts(rows, [])
  assert.deepEqual(keep.map((g) => g.source), ['benevity'])
  assert.deepEqual(skipped.map((g) => g.source), ['spreadsheet'])
})

test('separate gifts and contact-only rows are left alone', () => {
  const rows = [row({ amount: 50, date: '2026-01-01' }), row({ amount: 50, date: '2026-02-01' }), row({ email: 'k@example.com' })]
  const { keep, skipped } = splitGifts(rows, [])
  assert.equal(keep.length, 2)
  assert.equal(skipped.length, 0)
})

test('sample files: Kevin merges across sources and his $500 is counted once', () => {
  const rows = Object.entries(SAMPLE_CSV).flatMap(([src, text]) => rowsFromCsv(text, src as RawDonorRow['source']))
  const kevin = dedupe(rows).find((c) => c.name === 'Kevin Tran')!
  assert.deepEqual(kevin.sources.sort(), ['benevity', 'spreadsheet'])
  assert.equal(splitGifts(kevin.rows, []).keep.length, 1)
})

test('matchDonor finds an existing donor by email regardless of case', () => {
  const [c] = dedupe([row({ email: 'KTran@Example.com' })])
  const donors = [{ id: 'd1', name: 'K. Tran', email: 'ktran@example.com' }, { id: 'd2', name: 'Someone Else' }]
  assert.equal(matchDonor(c, donors)?.id, 'd1')
  assert.equal(matchDonor(dedupe([row({ name: 'Nobody' })])[0], donors), undefined)
})

test('autoMapping matches known headers and leaves the rest as Do not save', () => {
  const m = autoMapping(csvHeaders('First Name,Last Name,"Email Address",Total Amount,Campaign,Region\nA,B,a@b.c,5,X,Y'), ['Region'])
  assert.deepEqual(m, {
    'First Name': 'firstName', 'Last Name': 'lastName', 'Email Address': 'email', 'Total Amount': 'amount',
    Campaign: SKIP, Region: 'custom:Region', // an existing custom field matches by name
  })
})

test('the mapping decides what is read: remapped, skipped and new columns', () => {
  const text = 'Who,Mail,Gift,Campaign,Fund\nAda Lovelace,ada@x.org,$50,Giving Tuesday,ai academy'
  const rows = rowsFromCsv(text, 'zeffy', { Who: 'name', Mail: SKIP, Gift: 'amount', Campaign: NEW_COLUMN, Fund: 'program' })
  assert.deepEqual(rows, [{
    source: 'zeffy', name: 'Ada Lovelace', email: undefined, phone: undefined, org: undefined,
    amount: 50, date: undefined, program: 'AI Academy', notes: undefined, extra: { Campaign: 'Giving Tuesday' },
    giftIssue: 'no-date', // amount but no date column: flagged so staging can warn
  }])
})

test('a file with no name column yields no donors', () => {
  assert.equal(rowsFromCsv('Mail\na@b.c', 'zeffy', { Mail: 'email' }).length, 0)
})

test('dates in common export formats become YYYY-MM-DD; impossible ones are rejected', () => {
  const cases: [string, string | undefined][] = [
    ['2026-11-14', '2026-11-14'], ['2026-11-14T15:04:05Z', '2026-11-14'], ['2026-11-14 15:04', '2026-11-14'],
    ['11/14/2026', '2026-11-14'], ['1/5/26', '2026-01-05'], ['11-14-2026', '2026-11-14'], ['2026/11/14', '2026-11-14'],
    ['Nov 14, 2026', '2026-11-14'], ['November 14 2026', '2026-11-14'], ['14 Nov 2026', '2026-11-14'],
    ['11/14/2026, 3:04:05 PM', '2026-11-14'], ['2026-11-14, 15:04', '2026-11-14'], ['14/11/2026', '2026-11-14'],
    ['14-Nov-2026', '2026-11-14'], ['Nov-14-2026', '2026-11-14'], ['46340', '2026-11-14'],
    ['2/30/2026', undefined], ['soon', undefined], ['', undefined], ['12345', undefined],
  ]
  for (const [input, want] of cases) assert.equal(parseDate(input), want, input)
})

test('amounts with currency symbols and separators parse; zero, negative and text do not', () => {
  assert.equal(parseAmount('$1,250.00'), 1250)
  assert.equal(parseAmount('USD 50'), 50)
  assert.equal(parseAmount('0'), undefined)
  assert.equal(parseAmount('-20'), undefined)
  assert.equal(parseAmount('n/a'), undefined)
})

test('a slashed-date export with a byte-order mark imports its gifts', () => {
  const rows = rowsFromCsv('\uFEFFName,Amount,Date\nAda,$25,11/14/2026', 'spreadsheet')
  assert.equal(rows[0].name, 'Ada')
  assert.equal(rows[0].amount, 25)
  assert.equal(rows[0].date, '2026-11-14')
  assert.equal(rows[0].giftIssue, undefined)
})

test('an unreadable date is flagged instead of silently dropping the gift', () => {
  assert.equal(rowsFromCsv('Name,Amount,Date\nAda,25,someday', 'spreadsheet')[0].giftIssue, 'bad-date')
})

test('a new column uses the name the admin typed', () => {
  const rows = rowsFromCsv('Name,Camp\nAda,Giving Tuesday', 'zeffy', { Name: 'name', Camp: NEW_COLUMN + 'Campaign 2026' })
  assert.deepEqual(rows[0].extra, { 'Campaign 2026': 'Giving Tuesday' })
})

test('a gift with no date is still recorded', () => {
  const { keep } = splitGifts([row({ amount: 75 })], [])
  assert.equal(keep.length, 1)
  assert.equal(keep[0].amount, 75)
})

test('re-importing undated gifts adds nothing; an undated and a dated gift of the same amount are both kept', () => {
  assert.equal(splitGifts([row({ amount: 75 })], [{ amount: 75, date: null }]).keep.length, 0)
  assert.equal(splitGifts([row({ amount: 75 })], [{ amount: 75, date: '2026-01-01' }]).keep.length, 1)
  assert.equal(splitGifts([row({ amount: 75, date: '2026-01-01' })], [{ amount: 75, date: null }]).keep.length, 1)
})

test('a dated re-import gives a saved undated gift its date instead of adding a second gift', () => {
  const saved = [{ id: 'g1', amount: 75, date: null }, { id: 'g2', amount: 75, date: null }]
  const r = splitGifts([row({ amount: 75, date: '2026-01-01' }), row({ amount: 75, date: '2026-03-01' }), row({ amount: 75, date: '2026-05-01' })], saved)
  assert.deepEqual(r.dated, [{ id: 'g1', date: '2026-01-01' }, { id: 'g2', date: '2026-03-01' }])
  assert.equal(r.keep.length, 1) // a third $75 gift is new
  assert.equal(saved[0].date, null) // the caller's list isn't changed
})

test('real export headers map without renaming: Zeffy, Benevity and friends', () => {
  const zeffy = autoMapping(['First Name', 'Last Name', 'Email', 'Payment Date (America/Phoenix)', 'Total Amount', 'Refund Date', 'Company Name'])
  assert.equal(zeffy['Payment Date (America/Phoenix)'], 'date')
  assert.equal(zeffy['Refund Date'], SKIP)
  assert.equal(zeffy['Total Amount'], 'amount')
  assert.equal(zeffy['Company Name'], 'org')
  const benevity = autoMapping(['Company', 'Donor First Name', 'Donor Last Name', 'Email', 'Donation Date', 'Total Donation to be Acknowledged', 'Match Amount'])
  assert.deepEqual([benevity['Donor First Name'], benevity['Donor Last Name'], benevity['Donation Date'], benevity['Total Donation to be Acknowledged']], ['firstName', 'lastName', 'date', 'amount'])
  assert.equal(benevity['Match Amount'], SKIP) // amount already taken by the first match
  assert.deepEqual(autoMapping(['Campaign Name', 'Donor Name', 'Gift Amount (USD)', 'E-mail', 'Created At']), { 'Campaign Name': SKIP, 'Donor Name': 'name', 'Gift Amount (USD)': 'amount', 'E-mail': 'email', 'Created At': 'date' })
})

test('a Notes column maps to notes, and re-imports never repeat a note', () => {
  assert.equal(autoMapping(['Name', 'Comments']).Comments, 'notes')
  assert.equal(rowsFromCsv('Name,Notes\nAda,Loves robotics\n', 'spreadsheet')[0].notes, 'Loves robotics')
  assert.equal(mergeNotes('', [{ notes: 'Loves robotics' }, { notes: ' Loves robotics ' }, {}]), 'Loves robotics')
  assert.equal(mergeNotes('Met at Day of Compute\nLoves robotics', [{ notes: 'Loves robotics' }, { notes: 'Prefers texts' }]), 'Met at Day of Compute\nLoves robotics\nPrefers texts')
})
