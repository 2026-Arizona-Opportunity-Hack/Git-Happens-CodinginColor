import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { RawDonorRow } from '../data/types'
import { SAMPLE_CSV } from '../data/samples'
import { csvColumns, dedupe, matchDonor, rowsFromCsv, sameGift, splitGifts } from './dedupe'

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

test('csvColumns lists every column and flags the ones the donor database has no field for', () => {
  const cols = csvColumns('First Name,Last Name,"Email Address",Total Amount,Campaign\nA,B,a@b.c,5,X')
  assert.deepEqual(cols, [
    { column: 'First Name', field: 'Name' },
    { column: 'Last Name', field: 'Name' },
    { column: 'Email Address', field: 'Email' },
    { column: 'Total Amount', field: 'Gift amount' },
    { column: 'Campaign', field: undefined },
  ])
})
