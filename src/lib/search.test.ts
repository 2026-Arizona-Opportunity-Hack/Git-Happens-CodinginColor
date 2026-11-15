import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Donor } from '../data/types'
import { searchDonors, searchPages } from './search'

const d = (id: string, name: string, more: Partial<Donor> = {}): Donor => ({ id, name, ownerId: 'bm1', sources: [], ...more })
const donors = [
  d('d1', 'Microsoft TechSpark', { org: 'Microsoft', email: 'techspark@example.com' }),
  d('d2', 'APS Foundation', { org: 'APS', phone: '(602) 555-0142' }),
  d('d3', 'Maria Spark'),
  d('d4', 'Verizon Foundation', { org: 'Verizon' }),
  d('d5', 'Sparky Fund'),
]
const ids = (q: string) => searchDonors(donors, q).map((x) => x.id)

test('names that start with the query come first, then other name matches', () => {
  assert.deepEqual(ids('spark'), ['d5', 'd3', 'd1'])
  assert.deepEqual(ids('found'), ['d2', 'd4'])
  assert.deepEqual(ids('verizon'), ['d4'])
})

test('org, email and phone digits match too; blank finds nothing', () => {
  assert.deepEqual(ids('microsoft'), ['d1'])
  assert.deepEqual(ids('techspark@'), ['d1'])
  assert.deepEqual(ids('602-555'), ['d2'])
  assert.deepEqual(ids('  '), [])
})

test('pages match on their name or keywords, word by word', () => {
  const pages = [
    { label: 'Dashboard', keywords: 'home overview' },
    { label: 'Read API', keywords: 'api keys tokens' },
    { label: 'My account', keywords: 'password two-factor' },
    { label: 'Update Donors', keywords: 'import upload csv' },
  ]
  const labels = (q: string) => searchPages(pages, q).map((p) => p.label)
  assert.deepEqual(labels('api key'), ['Read API'])
  assert.deepEqual(labels('API Keys'), ['Read API'])
  assert.deepEqual(labels('passw'), ['My account'])
  assert.deepEqual(labels('2fa'), [])
  assert.deepEqual(labels('upload csv'), ['Update Donors'])
  assert.deepEqual(labels('dash'), ['Dashboard'])
  assert.deepEqual(labels(' '), [])
})
