import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { BoardMember, Donor, Draft, RawDonorRow } from '../data/types'
import { chatAction, CHANNELS, KINDS, type ActionStore, type Attrs } from './actions'
import { cleanDraft, MAX_CHARS } from './ai-draft'
import { date, extraFields, HttpError, oneOf, periodRange, str, summarize, type SummaryGift } from './api'
import { autoMapping, csvHeaders, dedupe, matchDonor, NEW_COLUMN, normEmail, normName, normPhone, parseAmount, parseCsv, parseDate, rowsFromCsv, sameGift, splitGifts } from './dedupe'
import { donorsCsv } from './export'
import { parseIcs } from './ical'
import { colName, crc32, xlsx } from './xlsx'

// Property tests: each runs RUNS random cases from a seeded generator, so a
// failure is repeatable. A failing case prints its seed; rerun it with
// FUZZ_SEED=<seed> bun test src/lib/fuzz.test.ts.

const SEED = Number(process.env.FUZZ_SEED) || 20261115
const RUNS = 300

type Rand = ReturnType<typeof rng>
function rng(seed: number) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32
  }
  const int = (n: number) => Math.floor(next() * n)
  const pick = <T,>(xs: readonly T[]): T => xs[int(xs.length)]
  // Text weighted toward what breaks parsers: quotes, commas, line breaks,
  // a BOM, formula prefixes, brackets, digits and date separators.
  const CHARS = [...'aZ09 ,"\'\r\n\t=+-@[]:;/.$\\', '﻿', 'é', '😀', 'http://', 'BEGIN:VEVENT', 'END:VEVENT', 'DTSTART:', 'Q']
  const text = (max = 12) => Array.from({ length: int(max + 1) }, () => pick(CHARS)).join('')
  const unknown = (depth = 0): unknown =>
    pick<() => unknown>([
      () => undefined, () => null, () => int(2) === 0, () => int(1e6) - 5e5, () => NaN, () => text(),
      () => '2026-11-15' + text(3), () => ' '.repeat(int(3)),
      () => (depth > 1 ? [] : Array.from({ length: int(3) }, () => unknown(depth + 1))),
      () => (depth > 1 ? {} : Object.fromEntries(Array.from({ length: int(4) }, () => [text(5), unknown(depth + 1)]))),
    ])()
  return { next, int, pick, text, unknown }
}

function forAll(name: string, prop: (r: Rand) => void) {
  test(name, () => {
    for (let i = 0; i < RUNS; i++) {
      const seed = SEED + i
      try { prop(rng(seed)) } catch (e) {
        throw new Error(`${name}: failed with FUZZ_SEED=${seed}: ${(e as Error).message}`, { cause: e })
      }
    }
  })
}

const throws400 = <T,>(f: () => T): T | undefined => {
  try { return f() } catch (e) {
    assert.ok(e instanceof HttpError && e.status === 400, `expected HttpError 400, got ${e}`)
  }
}

// --- dedupe.ts ----------------------------------------------------------------

forAll('a donor CSV export parses back to the same cells, formulas defused', (r) => {
  const cell = () => (r.int(4) === 0 ? undefined : r.text())
  const donors: Donor[] = Array.from({ length: 1 + r.int(4) }, (_, i) => ({
    id: `d${i}`, name: r.text() || 'x', email: cell(), phone: cell(), org: cell(), ownerId: null, sources: ['spreadsheet'],
    extra: { Campaign: r.text() },
  }))
  const csv = donorsCsv(donors, [], () => r.text(), '2026-11-15')
  const parsed = parseCsv(r.int(2) ? '﻿' + csv : csv) // download() adds a BOM
  assert.equal(parsed.length, donors.length)
  // Excel shows a defused formula with its leading ', and parseCsv trims.
  const shown = (v?: string) => (v && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v ?? '').trim()
  donors.forEach((d, i) => {
    assert.equal(parsed[i].name, shown(d.name))
    assert.equal(parsed[i].email, shown(d.email))
    assert.equal(parsed[i].organization, shown(d.org))
    assert.equal(parsed[i].campaign, shown(d.extra!.Campaign))
  })
})

forAll('parseCsv never throws and every row has the header keys', (r) => {
  const rows = parseCsv(r.text(80))
  for (const row of rows) assert.equal(typeof row, 'object')
  if (rows.length > 1) assert.deepEqual(Object.keys(rows[1]), Object.keys(rows[0]))
})

forAll('parseAmount is a positive number or undefined', (r) => {
  const n = parseAmount(r.pick([r.text(), `$${r.int(1e5)}.${r.int(100)}`, `-${r.int(100)}`, `${r.text(3)}${r.int(9)}`]))
  assert.ok(n === undefined || (Number.isFinite(n) && n > 0), String(n))
})

forAll('parseDate is a real YYYY-MM-DD or undefined', (r) => {
  const sep = () => r.pick(['-', '/', '.', ' ', ''])
  const v = r.pick([
    r.text(),
    `${r.int(10000)}${sep()}${r.int(15)}${sep()}${r.int(40)}${r.pick(['', 'T10:00', ' x', 'x'])}`,
    `${r.int(15)}${sep()}${r.int(40)}${sep()}${r.int(3000)}`,
    `${r.pick(['Feb', 'feb.', 'Sept', 'Foo', 'Nov'])} ${r.int(40)}, ${r.int(3000)}`,
    `${r.int(40)} ${r.pick(['Feb', 'Dec', 'Xyz'])} ${r.int(3000)}`,
  ])
  const d = parseDate(v)
  if (d === undefined) return
  assert.match(d, /^\d{4}-\d{2}-\d{2}$/, v)
  assert.equal(new Date(d + 'T00:00:00Z').toISOString().slice(0, 10), d, v) // no Feb 30
})

forAll('dedupe puts every row in one cluster, and rows sharing a key together', (r) => {
  const small = <T,>(xs: T[]) => () => (r.int(3) === 0 ? undefined : r.pick(xs))
  const email = small(['a@x.org', ' A@X.org', 'b@x.org', 'c@y.com'])
  const phone = small(['602-555-0101', '(602) 555 0101', '480-555-0199', '1'])
  const rows: RawDonorRow[] = Array.from({ length: r.int(12) }, () => ({
    source: r.pick(['spreadsheet', 'zeffy', 'benevity'] as const),
    name: r.pick(['Ana Ruiz', 'ana ruiz!', 'Ben Ortiz', 'B. Ortiz', '']), email: email(), phone: phone(), org: small(['CIC', 'cic', 'Intel'])(),
  }))
  const clusters = dedupe(rows)
  const home = new Map<RawDonorRow, number>()
  clusters.forEach((c, i) => c.rows.forEach((row) => { assert.ok(!home.has(row)); home.set(row, i) }))
  assert.equal(home.size, rows.length)
  for (const a of rows) for (const b of rows) {
    const shared = (normEmail(a.email) && normEmail(a.email) === normEmail(b.email)) ||
      (normPhone(a.phone) && normPhone(a.phone) === normPhone(b.phone)) || (normName(a.name) && normName(a.name) === normName(b.name))
    if (shared) assert.equal(home.get(a), home.get(b))
  }
  for (const c of clusters) {
    assert.ok(c.rows.some((row) => row.email === c.email))
    assert.ok(c.rows.some((row) => row.name === c.name))
  }
  // Running it again on the merged donors merges nothing more.
  const again = dedupe(clusters.map((c) => ({ source: c.sources[0], name: c.name, email: c.email, phone: c.phone, org: c.org })))
  assert.equal(again.length, clusters.length)
})

const csvQuote = (s: string) => (/[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s)
const realDate = (d?: string) => d === undefined || (/^\d{4}-\d{2}-\d{2}$/.test(d) && new Date(d + 'T00:00:00Z').toISOString().startsWith(d))

forAll('an uploaded file becomes rows with a name, a real amount and date, or a gift warning', (r) => {
  const headers = [r.pick(['Name', 'Donor Name', 'Full name']), r.pick(['Email', 'E-mail']), r.pick(['Amount', 'Total Amount', 'Gift']), r.pick(['Date', 'Payment Date', 'When']), 'Shirt size']
  const records = Array.from({ length: r.int(8) }, () => headers.map(() => r.pick([r.text(), '', `$${r.int(500)}`, `${1 + r.int(12)}/${1 + r.int(28)}/2026`, 'a@x.org'])))
  const text = [headers, ...records].map((l) => l.map(csvQuote).join(',')).join(r.pick(['\n', '\r\n']))
  const mapping = { ...autoMapping(csvHeaders(text)), 'Shirt size': NEW_COLUMN }
  const rows = rowsFromCsv(text, 'spreadsheet', mapping)
  assert.equal(rows.length, records.filter((l) => l[0].trim()).length) // rows without a name are dropped
  rows.forEach((row) => {
    assert.ok(row.name.trim())
    assert.ok(row.amount === undefined || (Number.isFinite(row.amount) && row.amount > 0))
    assert.ok(realDate(row.date), row.date)
    // A gift that can't be saved as it is always says why.
    if (row.amount !== undefined && !row.date) assert.ok(row.giftIssue === 'no-date' || row.giftIssue === 'bad-date')
    for (const v of Object.values(row.extra ?? {})) assert.ok(v.trim())
  })
})

forAll('importing the same gifts again adds none, and every gift is kept or skipped', (r) => {
  const amount = () => r.pick([25, 50, 50, 100])
  const day = () => r.int(2) ? `2026-03-${String(1 + r.int(20)).padStart(2, '0')}` : undefined
  const existing = Array.from({ length: r.int(4) }, (_, i) => ({ id: `g${i}`, amount: amount(), date: day() ?? null }))
  const before = JSON.stringify(existing)
  const rows: RawDonorRow[] = Array.from({ length: r.int(10) }, () => ({ source: 'zeffy', name: 'Ana', amount: r.int(5) ? amount() : undefined, date: day() }))
  const first = splitGifts(rows, existing)
  assert.equal(JSON.stringify(existing), before) // the caller's list isn't changed
  // A gift either becomes new, is a duplicate, or (develop) dates a saved undated gift.
  const dated = 'dated' in first ? (first.dated as { id: string; date: string }[]) : []
  assert.equal(first.keep.length + first.skipped.length + dated.length, rows.filter((g) => g.amount).length)
  for (const [i, a] of first.keep.entries()) for (const b of first.keep.slice(i + 1)) assert.ok(!sameGift(a, b))
  const saved = [...existing.map((g) => ({ ...g, date: dated.find((d) => d.id === g.id)?.date ?? g.date })), ...first.keep]
  assert.equal(splitGifts(rows, saved).keep.length, 0)
})

forAll('matchDonor only picks a donor that shares an email, phone or name', (r) => {
  const pick = <T,>(xs: T[]) => (r.int(3) ? r.pick(xs) : undefined)
  const person = () => ({ name: r.pick(['Ana Ruiz', 'ANA RUIZ', 'Ben Ortiz', 'Cy']), email: pick(['a@x.org', 'A@x.org ', 'b@x.org']), phone: pick(['602-555-0101', '6025550101', '480-555-0199']) })
  const donors = Array.from({ length: r.int(4) }, person)
  for (const c of dedupe(Array.from({ length: 1 + r.int(4) }, () => ({ source: 'spreadsheet' as const, ...person() })))) {
    const d = matchDonor(c, donors)
    const shares = (x: (typeof donors)[number]) => (!!c.email && normEmail(x.email) === normEmail(c.email)) ||
      (!!c.phone && normPhone(x.phone) === normPhone(c.phone)) || normName(x.name) === normName(c.name)
    if (d) assert.ok(shares(d))
    else assert.ok(!donors.some(shares))
  }
})

// --- api.ts -------------------------------------------------------------------

forAll('request checks return valid values or a 400, never anything else', (r) => {
  const v = r.unknown()
  const s = throws400(() => str(v, 'f', 20))
  if (s !== undefined) assert.ok(typeof s === 'string' && s.length > 0 && s.length <= 20 && s === s.trim())
  const o = throws400(() => oneOf(v, CHANNELS, 'f'))
  if (o !== undefined) assert.ok(CHANNELS.includes(o))
  const d = throws400(() => date(v, 'f'))
  if (d !== undefined) assert.match(d, /^\d{4}-\d{2}-\d{2}$/)
  const x = throws400(() => extraFields(v, 'f'))
  if (x) for (const [k, val] of Object.entries(x)) assert.ok(k && k.length <= 60 && val && val.length <= 500)
})

forAll('periodRange is a 400 or a start before its end', (r) => {
  const v = r.pick([null, r.text(6), `${1000 + r.int(9000)}`, `${1000 + r.int(9000)}-Q${r.int(7)}`, `2026-q4`, ` 2026`])
  const p = throws400(() => periodRange(v, '2026-11-15'))
  if (!p) return
  assert.match(p.start, /^\d{4}-\d{2}-01$/)
  assert.match(p.end, /^\d{4}-\d{2}-01$/)
  assert.ok(p.start < p.end)
})

forAll('summary totals add up and never name a donor', (r) => {
  const members: BoardMember[] = [{ id: 'u1', name: 'Ana', email: 'a@x.org' }]
  const gifts: SummaryGift[] = Array.from({ length: r.int(40) }, () => ({
    amount: r.int(100_000) / 100, date: `2026-${String(1 + r.int(12)).padStart(2, '0')}-0${1 + r.int(9)}`,
    program: r.pick(['camp', 'academy', 'general']), donor_id: `donor-${r.int(8)}`, owner_id: r.pick(['u1', 'u9', '']),
  }))
  const s = summarize(gifts, [{ by_id: 'u1', channel: 'call', date: '2026-02-01' }], members)
  const cents = (n: number) => Math.round(n * 100)
  const total = gifts.reduce((t, g) => t + cents(g.amount), 0)
  assert.equal(cents(s.totals.raised), total)
  for (const by of [s.totals.by_quarter, s.totals.by_program]) assert.equal(Object.values(by).reduce((t, n) => t + cents(n), 0), total)
  assert.equal(s.totals.by_board_member.reduce((t, m) => t + cents(m.raised), 0), total)
  assert.ok(Object.keys(s.totals.by_quarter).every((q) => /^Q[1-4]$/.test(q)))
  assert.doesNotMatch(JSON.stringify(s), /donor-/)
})

// --- ical.ts ------------------------------------------------------------------

const ICS = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:a@cic\r\nSUMMARY:Day of\r\n  Compute\\, fall\r\nDTSTART;TZID=America/Phoenix:20261205T170000\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:b@cic\r\nSUMMARY:Camp\r\nDTSTART:20270110T050000Z\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n'

forAll('parseIcs never throws on garbage or a cut-off calendar', (r) => {
  const input = r.pick([r.text(200), ICS.slice(0, r.int(ICS.length)), ICS.replace(/\d/g, () => String(r.int(10)))])
  for (const e of parseIcs(input)) {
    assert.ok(e.uid && e.name.length <= 200)
    assert.match(e.date, /^\d{4}-\d{2}-\d{2}$/)
  }
})

// --- ai-draft.ts --------------------------------------------------------------

forAll('cleanDraft never returns links, [placeholders] or an over-long draft', (r) => {
  const channel = r.pick(['email', 'text'] as const)
  const reply = r.pick([r.text(40), '```\n' + r.text(40) + '\n```', 'Subject: ' + r.text(5) + '\n\n' + r.text(40), 'x'.repeat(MAX_CHARS[channel] - 5 + r.int(10))])
  const s = cleanDraft(reply, channel)
  if (s === null) return
  assert.ok(s.length > 0 && s.length <= MAX_CHARS[channel])
  assert.doesNotMatch(s, /\[[^\]]*\]|https?:\/\//i)
})

// --- actions.ts ---------------------------------------------------------------

forAll("the assistant's buttons only touch the person's donors and pending drafts", (r) => {
  const donors: Donor[] = [{ id: 'd1', name: 'Ana Ruiz', ownerId: 'u1', sources: [] }]
  const drafts: Draft[] = [
    { id: 'x1', donorId: 'd1', kind: 'thank-you', channel: 'email', body: 'Hi', createdAt: '2026-11-14', status: 'pending' },
    { id: 'x2', donorId: 'd1', kind: 'thank-you', channel: 'email', body: 'Hi', createdAt: '2026-11-14', status: 'approved' },
    { id: 'x3', donorId: 'gone', kind: 'thank-you', channel: 'email', body: 'Hi', createdAt: '2026-11-14', status: 'pending' },
  ]
  const calls: unknown[][] = []
  const rec = (name: string) => async (...args: unknown[]) => calls.push([name, ...args])
  const role = r.pick(['admin', 'board'] as const)
  const store: ActionStore = {
    today: '2026-11-15', session: { role }, donors, drafts,
    gifts: [{ id: 'g1', donorId: 'd1', amount: 100, date: '2026-10-01', source: 'zeffy', program: 'General' }],
    events: [{ id: 'e1', name: 'Day of Compute', date: '2026-12-05' }, { id: 'e0', name: 'Camp', date: '2026-06-01' }],
    boardMembers: [{ id: 'u2', name: 'Ben Ortiz', email: 'ben@example.org' }],
    logInteraction: rec('log'), setNextStep: rec('next-step'), invite: rec('invite'), createDraft: rec('draft'),
    approveDraft: rec('approve'), discardDraft: rec('discard'), reassign: rec('reassign'),
  }
  const maybe = (xs: string[]) => (r.int(4) === 0 ? r.text(4) : r.pick(xs))
  const a: Attrs = {
    type: maybe(['log', 'next-step', 'invite', 'draft', 'approve', 'discard', 'reassign']),
    donor: maybe(['d1', 'd2', 'gone']), draft: maybe(['x1', 'x2', 'x3']), event: maybe(['e1', 'e0', 'e9']),
    owner: maybe(['u2', 'u1']), channel: maybe([...CHANNELS]), kind: maybe([...KINDS]),
    summary: r.text(), text: r.text(), due: maybe(['2026-12-01', '12/01/2026']), body: r.text(),
  }
  const action = chatAction(a, store)
  if ('error' in action) return
  action.run()
  const [name, id, arg] = calls[0]
  if (name === 'approve' || name === 'discard') assert.equal(id, 'x1')
  else assert.equal(id, 'd1')
  if (name === 'reassign') assert.ok(role === 'admin' && arg === 'u2')
  if (name === 'invite') assert.equal(arg, 'e1')
  if (name === 'log') assert.ok(CHANNELS.includes(arg as never))
})

// --- xlsx.ts ------------------------------------------------------------------

test('crc32 matches the standard check values', () => {
  const enc = new TextEncoder()
  assert.equal(crc32(new Uint8Array()), 0)
  assert.equal(crc32(enc.encode('123456789')), 0xcbf43926)
  assert.equal(crc32(enc.encode('The quick brown fox jumps over the lazy dog')), 0x414fa339)
})

test('colName gives every column its own letters, in spreadsheet order', () => {
  assert.deepEqual([0, 25, 26, 51, 52, 701, 702, 16383].map(colName), ['A', 'Z', 'AA', 'AZ', 'BA', 'ZZ', 'AAA', 'XFD'])
  const seen = new Set<string>()
  for (let i = 0; i < 20000; i++) {
    const c = colName(i)
    assert.match(c, /^[A-Z]+$/)
    assert.ok(!seen.has(c), c)
    seen.add(c)
    // Read it back as bijective base 26.
    assert.equal([...c].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1, i)
  }
})

// The stored zip entries of an .xlsx, read back by their local headers.
function unzip(file: Uint8Array) {
  const view = new DataView(file.buffer, file.byteOffset)
  const out = new Map<string, Uint8Array>()
  for (let at = 0; view.getUint32(at, true) === 0x04034b50;) {
    const size = view.getUint32(at + 18, true), nameLen = view.getUint16(at + 26, true)
    const name = new TextDecoder().decode(file.subarray(at + 30, at + 30 + nameLen))
    const data = file.subarray(at + 30 + nameLen, at + 30 + nameLen + size)
    assert.equal(crc32(data), view.getUint32(at + 14, true), name)
    out.set(name, data)
    at += 30 + nameLen + size
  }
  return out
}

forAll('an Excel export is valid XML holding the same text, whatever the cells contain', (r) => {
  const cell = () => r.pick<() => string | number | undefined>([() => r.text(), () => r.int(1e6) / 100, () => undefined, () => '￾￿\u0001\u007f' + r.text(3), () => '😀'.slice(0, 1)])()
  const header = Array.from({ length: 1 + r.int(4) }, () => r.text(6))
  const rows = Array.from({ length: r.int(5) }, () => header.map(cell))
  const sheet = unzip(xlsx(r.text(40), header, rows)).get('xl/worksheets/sheet1.xml')!
  const xml = new TextDecoder('utf-8', { fatal: true }).decode(sheet)
  // Only characters XML 1.0 allows, and no bare & or < inside text.
  // eslint-disable-next-line no-control-regex -- the characters XML 1.0 can't contain
  assert.doesNotMatch(xml, /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/)
  const texts = [...xml.matchAll(/<t xml:space="preserve">([^<]*)<\/t>/g)].map((m) => m[1])
  for (const t of texts) assert.doesNotMatch(t, /&(?!amp;|lt;|gt;|quot;)/)
  const cells = [header, ...rows].flat().filter((v): v is string => typeof v === 'string' && v !== '')
  assert.equal(texts.length, cells.length)
})
