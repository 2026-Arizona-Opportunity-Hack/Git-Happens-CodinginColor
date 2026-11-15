import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Donor, Gift } from '../data/types'
import { parseCsv } from './dedupe'
import { donorsCsv, donorsXlsx, download } from './export'
import { crc32 } from './xlsx'

const donors: Donor[] = [
  { id: 'd1', name: 'Smith, "Jo"', email: 'jo@x.org', ownerId: 'u1', sources: ['zeffy', 'benevity'], extra: { Campaign: 'Giving Tuesday' } },
  { id: 'd2', name: '=HYPERLINK("http://evil")', ownerId: null, sources: [] },
]
const gifts: Gift[] = [
  { id: 'g1', donorId: 'd1', amount: 100, date: '2025-03-01', source: 'zeffy', program: 'General' },
  { id: 'g2', donorId: 'd1', amount: 50.5, date: '2026-02-01', source: 'benevity', program: 'K12' },
]
const csv = donorsCsv(donors, gifts, (d) => (d.ownerId ? 'Ann' : 'Unassigned'), '2026-11-15')
const [a, b] = parseCsv(csv)

test('export has every donor column, totals and custom fields, and round-trips through a CSV parser', () => {
  assert.equal(a.name, 'Smith, "Jo"')
  assert.equal(a['board member'], 'Ann')
  assert.equal(a.sources, 'zeffy; benevity')
  assert.equal(a['lifetime giving'], '150.5')
  assert.equal(a['raised 2026'], '50.5')
  assert.equal(a['number of gifts'], '2')
  assert.equal(a['first gift'], '2025-03-01')
  assert.equal(a.campaign, 'Giving Tuesday')
  assert.equal(b['board member'], 'Unassigned')
})

test('imported text that looks like a formula is defused', () => {
  assert.equal(b.name, `'=HYPERLINK("http://evil")`)
})

// Reads back the stored (uncompressed) zip the xlsx writer produces.
function unzip(bytes: Uint8Array): Map<string, string> {
  const out = new Map<string, string>()
  const v = new DataView(bytes.buffer, bytes.byteOffset)
  let at = 0
  while (v.getUint32(at, true) === 0x04034b50) {
    const size = v.getUint32(at + 18, true), nameLen = v.getUint16(at + 26, true), extra = v.getUint16(at + 28, true)
    const name = new TextDecoder().decode(bytes.subarray(at + 30, at + 30 + nameLen))
    const data = bytes.subarray(at + 30 + nameLen + extra, at + 30 + nameLen + extra + size)
    assert.equal(crc32(data), v.getUint32(at + 14, true), `CRC of ${name}`)
    out.set(name, new TextDecoder().decode(data))
    at += 30 + nameLen + extra + size
  }
  return out
}

test('the Excel export is a valid workbook with numeric money and escaped, non-formula text', () => {
  const files = unzip(donorsXlsx(donors, gifts, (d) => (d.ownerId ? 'Ann' : 'Unassigned'), '2026-11-15'))
  assert.deepEqual([...files.keys()].sort(), ['[Content_Types].xml', '_rels/.rels', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml'])
  const sheet = files.get('xl/worksheets/sheet1.xml')!
  assert.match(sheet, /<c r="A1" s="1" t="inlineStr"><is><t xml:space="preserve">Name<\/t>/) // bold header
  assert.match(sheet, /<c r="G2"><v>150.5<\/v><\/c>/) // lifetime giving as a number
  assert.match(sheet, /Smith, &quot;Jo&quot;/)
  assert.ok(!sheet.includes('<f>'), 'no formulas')
})


test('download saves a CSV with a byte-order mark through a temporary link, then cleans up', async () => {
  const clicked: string[] = []
  const blobs: Blob[] = []
  const link = { click: () => clicked.push(link.download), remove: () => clicked.push('removed'), download: '' }
  const g = globalThis as Record<string, unknown>
  const saved = { document: g.document, create: URL.createObjectURL, revoke: URL.revokeObjectURL }
  g.document = { createElement: () => link, body: { append: () => {} } }
  URL.createObjectURL = (b: Blob) => (blobs.push(b), 'blob:1')
  URL.revokeObjectURL = (u: string) => void clicked.push(`revoked ${u}`)
  try {
    download('donors.csv', 'a,b')
    download('donors.xlsx', new Uint8Array([1, 2]))
  } finally {
    g.document = saved.document
    URL.createObjectURL = saved.create
    URL.revokeObjectURL = saved.revoke
  }
  assert.deepEqual(clicked, ['donors.csv', 'removed', 'revoked blob:1', 'donors.xlsx', 'removed', 'revoked blob:1'])
  assert.equal(blobs[0].type, 'text/csv;charset=utf-8')
  assert.deepEqual([...new Uint8Array(await blobs[0].arrayBuffer())], [0xef, 0xbb, 0xbf, ...Buffer.from('a,b')]) // UTF-8 BOM, then the CSV
  assert.match(blobs[1].type, /spreadsheetml/)
})
