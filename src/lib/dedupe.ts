import type { Donor, Program, RawDonorRow, Source } from '../data/types'

// Dedupe strategy, strongest signal first:
//   1. normalized email
//   2. normalized phone (last 10 digits)
//   3. normalized name + org
// Rows that share any key collapse into one cluster (union-find), so
// "J. Smith <j@x.com>" from Zeffy and "John Smith 602-555-0101" from the
// spreadsheet merge if a third row links the email and phone.

export const normEmail = (e?: string) => e?.trim().toLowerCase() || undefined

export const normPhone = (p?: string) => {
  const digits = p?.replace(/\D/g, '') ?? ''
  return digits.length >= 10 ? digits.slice(-10) : undefined
}

export const normName = (n: string) =>
  n.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()

export interface DonorCluster {
  name: string
  email?: string
  phone?: string
  org?: string
  sources: Source[]
  rows: RawDonorRow[]
  matchedOn: string[]
}

export function dedupe(rows: RawDonorRow[]): DonorCluster[] {
  const parent = rows.map((_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  const reasons = new Map<number, Set<string>>()

  const byKey = new Map<string, number>()
  rows.forEach((r, i) => {
    const keys: [string, string | undefined][] = [
      ['email', normEmail(r.email)],
      ['phone', normPhone(r.phone)],
      ['name+org', r.org ? `${normName(r.name)}|${normName(r.org)}` : undefined],
      ['name', normName(r.name)],
    ]
    for (const [kind, k] of keys) {
      if (!k) continue
      const key = `${kind}:${k}`
      const j = byKey.get(key)
      if (j === undefined) byKey.set(key, i)
      else if (find(i) !== find(j)) {
        const root = find(j)
        parent[find(i)] = root
        reasons.set(root, (reasons.get(root) ?? new Set()).add(kind))
      }
    }
  })

  const groups = new Map<number, RawDonorRow[]>()
  rows.forEach((r, i) => {
    const root = find(i)
    groups.set(root, [...(groups.get(root) ?? []), r])
  })

  return [...groups.entries()].map(([root, rs]) => ({
    // Prefer the longest name seen ("John Smith" over "J Smith").
    name: rs.map((r) => r.name).sort((a, b) => b.length - a.length)[0],
    email: rs.find((r) => r.email)?.email,
    phone: rs.find((r) => r.phone)?.phone,
    org: rs.find((r) => r.org)?.org,
    sources: [...new Set(rs.map((r) => r.source))],
    rows: rs,
    matchedOn: [...(reasons.get(root) ?? [])],
  }))
}

// A donor's notes after an import: the saved notes, plus any line from the
// file that isn't in them yet, so re-importing a file never repeats a note.
export function mergeNotes(saved: string | undefined, rows: Pick<RawDonorRow, 'notes'>[]): string {
  const lines = (saved ?? '').split('\n').map((l) => l.trim()).filter(Boolean)
  for (const r of rows) {
    const n = r.notes?.trim()
    if (n && !lines.some((l) => l.includes(n))) lines.push(n)
  }
  return lines.join('\n')
}

// An existing donor this cluster belongs to, using the same keys as dedupe().
// Shared by the server (on commit) and the Import preview, so they agree.
export function matchDonor<D extends Pick<Donor, 'name' | 'email' | 'phone'>>(c: DonorCluster, donors: D[]): D | undefined {
  return donors.find(
    (d) =>
      (c.email && normEmail(d.email) === normEmail(c.email)) ||
      (c.phone && normPhone(d.phone) === normPhone(c.phone)) ||
      normName(d.name) === normName(c.name),
  )
}

// --- Gift dedupe --------------------------------------------------------------
// The same donation often shows up twice: in Zeffy/Benevity *and* hand-entered
// in the spreadsheet, or in an export that is simply imported again. For one
// donor, a gift with the same amount and a date within SAME_GIFT_DAYS of one
// already recorded (or already kept from this import) is treated as the same
// gift. The window absorbs a payment date vs. a hand-typed date drifting by a
// day or two. Cost: two genuinely separate equal gifts that close together
// collapse into one, so skipped gifts are shown in the preview.
export const SAME_GIFT_DAYS = 3

// `id` is set on gifts already in D1, so an undated one can be given a date.
interface GiftLike { id?: string; amount: number; date?: string | null }

const dayNumber = (iso: string) => Math.round(new Date(iso.slice(0, 10) + 'T12:00:00Z').getTime() / 86_400_000)

// Undated gifts only match other undated gifts of the same amount, so
// re-importing a file without dates still adds nothing.
export const sameGift = (a: GiftLike, b: GiftLike) =>
  Math.abs(a.amount - b.amount) < 0.005 &&
  (a.date && b.date ? Math.abs(dayNumber(a.date) - dayNumber(b.date)) <= SAME_GIFT_DAYS : !a.date && !b.date)

// Splits one donor's incoming rows into gifts to record and duplicates to skip.
// Rows without an amount are neither: they carry contact info only. A gift
// without a date is still recorded (date unknown). A dated gift that matches a
// saved undated gift of the same amount gives it its date (`dated`) instead of
// being added again, so re-importing a file whose dates weren't read before
// fixes Retention and Raised YTD without doubling the money.
export function splitGifts(rows: RawDonorRow[], existing: GiftLike[]) {
  const seen: GiftLike[] = existing.map((g) => ({ ...g }))
  const keep: (RawDonorRow & GiftLike)[] = []
  const skipped: (RawDonorRow & GiftLike)[] = []
  const dated: { id: string; date: string }[] = []
  // Dated rows go first so they date saved gifts before an undated row of the
  // same amount is skipped against them; otherwise a re-import adds it again.
  for (const r of [...rows].sort((a, b) => Number(!a.date) - Number(!b.date))) {
    if (!r.amount) continue
    const g = r as RawDonorRow & GiftLike
    if (seen.some((s) => sameGift(s, g))) { skipped.push(g); continue }
    const undated = g.date ? seen.find((s) => s.id && !s.date && Math.abs(s.amount - g.amount) < 0.005) : undefined
    if (undated) { undated.date = g.date; dated.push({ id: undated.id!, date: g.date! }) }
    else { keep.push(g); seen.push(g) }
  }
  return { keep, skipped, dated }
}

// Minimal CSV parser (quoted fields, commas inside quotes). Good enough for
// Zeffy/Benevity exports; swap for papaparse if the real files get gnarly.
export function parseCsv(text: string): Record<string, string>[] {
  text = text.replace(/^\uFEFF/, '') // Excel/Sheets byte-order mark
  const lines: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); lines.push(row); row = []; field = ''
    } else field += c
  }
  if (field || row.length) { row.push(field); lines.push(row) }
  const [header, ...body] = lines.filter((l) => l.some((f) => f.trim()))
  if (!header) return []
  const keys = header.map((h) => h.trim().toLowerCase())
  return body.map((l) => Object.fromEntries(keys.map((k, i) => [k, (l[i] ?? '').trim()])))
}

// Column mappings per source. Real exports should be checked against these
// as soon as CIC shares samples.
// --- Column mapping -----------------------------------------------------------
// Each uploaded file's columns map to a donor-database field, to a custom
// field (stored in the donor's `extra`), or to nothing. autoMapping() guesses
// from common export headers; the admin can change any of it while staging.

export const SKIP = '__skip__' // "Do not save"
export const NEW_COLUMN = 'new:' // prefix: new:<name>, "Create a new column" with a name the admin types
export const CUSTOM = 'custom:' // prefix: custom:<field name>

export const DB_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'org', label: 'Organization' },
  { key: 'amount', label: 'Gift amount' },
  { key: 'date', label: 'Gift date' },
  { key: 'program', label: 'Gift program' },
  { key: 'notes', label: 'Notes' },
] as const

// Header spellings recognized automatically (normalized: see headerKey).
const KNOWN_HEADERS: Record<string, string[]> = {
  name: ['name', 'full name', 'donor name', 'donor'],
  firstName: ['first name', 'firstname', 'first'],
  lastName: ['last name', 'lastname', 'last'],
  email: ['email', 'email address', 'donor email'],
  phone: ['phone', 'phone number', 'mobile'],
  org: ['org', 'organization', 'company', 'employer'],
  amount: ['amount', 'total amount', 'donation amount', 'gift amount'],
  date: ['date', 'payment date', 'donation date', 'gift date', 'transaction date'],
  program: ['program', 'designation', 'fund'],
  notes: ['notes', 'note', 'comments', 'comment', 'donor notes'],
}

// Lowercase, without a trailing "(America/Phoenix)" or "(USD)" and punctuation:
// "Payment Date (America/Phoenix)" -> "payment date", "E-mail" -> "e mail".
const headerKey = (h: string) => h.toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim()

// Looser matches for headers no list above spells exactly, as real exports
// name them: Zeffy "Payment Date (America/Phoenix)", Benevity "Total Donation
// to be Acknowledged", "Donor First Name". Checked in this order.
const HEADER_RULES: [string, RegExp][] = [
  ['email', /\be ?mail\b/],
  ['phone', /\b(phone|mobile|cell)\b/],
  ['firstName', /\bfirst( name)?\b|\bgiven name\b/],
  ['lastName', /\blast( name)?\b|\bsurname\b|\bfamily name\b/],
  ['org', /\b(company|organi[sz]ation|employer|business)\b/],
  ['date', /^(?!.*\b(birth|refund|updated|modified)\b).*\b(date|paid at|donated at|created at)\b/],
  ['amount', /^(?!.*\b(count|number|fee|fees|tip|tips)\b).*\b(amount|total donation|donation total|gross|total)\b/],
  ['program', /\b(designation|fund|program|purpose)\b/],
  ['name', /^(?!.*\b(campaign|event|form|page|team|fund|program)\b).*\bname\b|^(donor|supporter|contact)$/],
]

const PROGRAMS: Program[] = ['K12', 'AI Academy', 'Summer Camp', 'Day of Compute', 'General']

export type ColumnMapping = Record<string, string> // CSV header -> target

// The header row as written (original case).
export function csvHeaders(text: string): string[] {
  const firstLine = text.replace(/^\uFEFF/, '').split(/\r?\n/).find((l) => l.trim()) ?? ''
  return parseCsvHeader(firstLine)
}

// Best guess for each header. A target is used by at most one column: exact
// spellings claim theirs first, then the looser rules fill what's left (first
// column wins). Custom fields that already exist match a header of that name.
export function autoMapping(headers: string[], customFields: string[] = []): ColumnMapping {
  const taken = new Set<string>()
  const out: ColumnMapping = Object.fromEntries(headers.map((h) => [h, SKIP]))
  const claim = (h: string, target?: string) => {
    if (!target || taken.has(target)) return
    out[h] = target
    taken.add(target)
  }
  for (const h of headers) {
    const key = headerKey(h)
    const custom = customFields.find((f) => f.trim().toLowerCase() === h.trim().toLowerCase())
    claim(h, Object.entries(KNOWN_HEADERS).find(([, names]) => names.includes(key))?.[0] ?? (custom && CUSTOM + custom))
  }
  for (const h of headers) if (out[h] === SKIP) claim(h, HEADER_RULES.find(([, re]) => re.test(headerKey(h)))?.[0])
  return out
}

// Headers only one platform's export writes, to catch a file chosen in the
// wrong slot (a Benevity report loaded as Zeffy tags every donor "zeffy").
// United Way's export has no signature: its columns are generic.
const SOURCE_SIGNS: [Source, RegExp][] = [
  ['zeffy', /\bzeffy\b|^campaign( title| name)?$|^form( name| title)?$|^payment date$|^payment method$|^refund amount$|^total amount$/],
  ['benevity', /\bbenevity\b|to be acknowledged|cause support fee|match(ed)? amount|^company$|^donation date$|^donor (first |last )?name$|^project( name)?$/],
]

// The platform a file's headers look like it came from, when two or more of
// its headers say so and no other platform's do as much; otherwise undefined.
export function detectSource(headers: string[]): Source | undefined {
  const scores = SOURCE_SIGNS.map(([src, re]) => [src, headers.filter((h) => re.test(headerKey(h))).length] as const).sort((a, b) => b[1] - a[1])
  const [best, next] = scores
  return best[1] >= 2 && best[1] > (next?.[1] ?? 0) ? best[0] : undefined
}

// What a target is called in the UI.
export function targetLabel(target: string, header: string): string {
  if (target === SKIP) return 'Do not save'
  if (target.startsWith(NEW_COLUMN)) return `New column: ${target.slice(NEW_COLUMN.length).trim() || header}`
  if (target.startsWith(CUSTOM)) return `${target.slice(CUSTOM.length)} (custom)`
  return DB_FIELDS.find((f) => f.key === target)?.label ?? target
}

// The header row as written (original case), using the same quoting rules.
function parseCsvHeader(line: string): string[] {
  const out: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { out.push(field.trim()); field = '' }
    else field += c
  }
  out.push(field.trim())
  return out.filter((h) => h)
}

// "$1,250.00", "1250", "USD 50" -> number; anything else (or <= 0) -> undefined.
export function parseAmount(v?: string): number | undefined {
  const n = Number((v ?? '').replace(/[^0-9.-]/g, ''))
  return v && /\d/.test(v) && Number.isFinite(n) && n > 0 ? n : undefined
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

// Dates as exports write them -> YYYY-MM-DD, or undefined when unreadable.
// Accepts 2026-11-14 (with any time after it), 11/14/2026, "11/14/2026, 3:04 PM",
// 11-14-26, 2026/11/14, Nov 14, 2026, 14 Nov 2026, 14-Nov-2026 and Excel date
// serials (46340). Slashed dates are US order unless the first part can't be
// a month (14/11/2026).
export function parseDate(v?: string): string | undefined {
  const s = v?.trim().toLowerCase()
  if (!s) return undefined
  const out = (y: number, m: number, d: number) => {
    if (y < 100) y += 2000
    const t = new Date(Date.UTC(y, m - 1, d))
    return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? t.toISOString().slice(0, 10) : undefined
  }
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:$|[t\s,])/)
  if (m) return out(+m[1], +m[2], +m[3])
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?:$|[\s,t])/)
  if (m) return +m[1] > 12 ? out(+m[3], +m[2], +m[1]) : out(+m[3], +m[1], +m[2])
  m = s.match(/^([a-z]{3})[a-z]*\.?[\s-]+(\d{1,2}),?[\s-]+(\d{4})/)
  if (m && MONTHS.includes(m[1])) return out(+m[3], MONTHS.indexOf(m[1]) + 1, +m[2])
  m = s.match(/^(\d{1,2})[\s-]+([a-z]{3})[a-z]*\.?,?[\s-]+(\d{2}|\d{4})(?:$|[\s,t])/)
  if (m && MONTHS.includes(m[2])) return out(+m[3], MONTHS.indexOf(m[2]) + 1, +m[1])
  // Excel stores dates as days since 1899-12-30; a CSV saved from it can too.
  m = s.match(/^(\d{5})(?:\.\d+)?$/)
  if (m && +m[1] >= 30000 && +m[1] <= 70000) return new Date(Date.UTC(1899, 11, 30) + +m[1] * 86_400_000).toISOString().slice(0, 10)
  return undefined
}

// Rows from a CSV using the given mapping (auto-detected when omitted).
export function rowsFromCsv(text: string, source: Source, mapping: ColumnMapping = autoMapping(csvHeaders(text))): RawDonorRow[] {
  const entries = Object.entries(mapping).filter(([, t]) => t !== SKIP)
  const col = (target: string) => entries.find(([, t]) => t === target)?.[0]
  const val = (rec: Record<string, string>, target: string) => {
    const h = col(target)
    return (h && rec[h.trim().toLowerCase()]) || undefined
  }
  const customs = entries
    .filter(([, t]) => t.startsWith(NEW_COLUMN) || t.startsWith(CUSTOM))
    .map(([h, t]) => ({
      key: h.trim().toLowerCase(),
      name: t.startsWith(NEW_COLUMN) ? t.slice(NEW_COLUMN.length).trim() || h.trim() : t.slice(CUSTOM.length),
    }))
  return parseCsv(text)
    .map((rec): RawDonorRow => {
      const name = val(rec, 'name') ?? [val(rec, 'firstName'), val(rec, 'lastName')].filter(Boolean).join(' ')
      const rawAmount = val(rec, 'amount'), rawDate = val(rec, 'date')
      const amount = parseAmount(rawAmount)
      const date = parseDate(rawDate)
      const giftIssue = rawAmount && amount === undefined ? 'bad-amount' as const
        : amount !== undefined && !rawDate ? 'no-date' as const
        : amount !== undefined && !date ? 'bad-date' as const
        : undefined
      const program = PROGRAMS.find((p) => p.toLowerCase() === val(rec, 'program')?.toLowerCase())
      const extra = Object.fromEntries(customs.filter((c) => rec[c.key]).map((c) => [c.name, rec[c.key]]))
      return {
        source,
        name,
        email: val(rec, 'email'),
        phone: val(rec, 'phone'),
        org: val(rec, 'org'),
        amount,
        date,
        program,
        notes: val(rec, 'notes'),
        extra: Object.keys(extra).length ? extra : undefined,
        ...(giftIssue && { giftIssue }),
      }
    })
    .filter((r) => r.name)
}
