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

interface GiftLike { amount: number; date: string }

const dayNumber = (iso: string) => Math.round(new Date(iso.slice(0, 10) + 'T12:00:00Z').getTime() / 86_400_000)

export const sameGift = (a: GiftLike, b: GiftLike) =>
  Math.abs(a.amount - b.amount) < 0.005 && Math.abs(dayNumber(a.date) - dayNumber(b.date)) <= SAME_GIFT_DAYS

// Splits one donor's incoming rows into gifts to record and duplicates to skip.
// Rows without an amount and date are neither: they carry contact info only.
export function splitGifts(rows: RawDonorRow[], existing: GiftLike[]) {
  const seen: GiftLike[] = [...existing]
  const keep: (RawDonorRow & GiftLike)[] = []
  const skipped: (RawDonorRow & GiftLike)[] = []
  for (const r of rows) {
    if (!r.amount || !r.date) continue
    const g = r as RawDonorRow & GiftLike
    if (seen.some((s) => sameGift(s, g))) skipped.push(g)
    else { keep.push(g); seen.push(g) }
  }
  return { keep, skipped }
}

// Minimal CSV parser (quoted fields, commas inside quotes). Good enough for
// Zeffy/Benevity exports; swap for papaparse if the real files get gnarly.
export function parseCsv(text: string): Record<string, string>[] {
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
export const NEW_COLUMN = '__new__' // "Create a new column" named after the CSV header
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
] as const

// Header spellings recognized automatically (lowercased).
const KNOWN_HEADERS: Record<string, string[]> = {
  name: ['name', 'full name', 'donor name', 'donor'],
  firstName: ['first name', 'firstname', 'first'],
  lastName: ['last name', 'lastname', 'last'],
  email: ['email', 'email address', 'donor email'],
  phone: ['phone', 'phone number', 'mobile'],
  org: ['org', 'organization', 'company', 'employer'],
  amount: ['amount', 'total amount', 'donation amount', 'gift amount'],
  date: ['date', 'payment date', 'donation date', 'gift date'],
  program: ['program', 'designation', 'fund'],
}

const PROGRAMS: Program[] = ['K12', 'AI Academy', 'Summer Camp', 'Day of Compute', 'General']

export type ColumnMapping = Record<string, string> // CSV header -> target

// The header row as written (original case).
export function csvHeaders(text: string): string[] {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim()) ?? ''
  return parseCsvHeader(firstLine)
}

// Best guess for each header. A target is used by at most one column; custom
// fields that already exist match a header with the same name.
export function autoMapping(headers: string[], customFields: string[] = []): ColumnMapping {
  const taken = new Set<string>()
  const out: ColumnMapping = {}
  for (const h of headers) {
    const key = h.trim().toLowerCase()
    const custom = customFields.find((f) => f.toLowerCase() === key)
    const field = Object.entries(KNOWN_HEADERS).find(([, names]) => names.includes(key))?.[0]
    const target = field ?? (custom ? CUSTOM + custom : SKIP)
    out[h] = target !== SKIP && taken.has(target) ? SKIP : target
    taken.add(out[h])
  }
  return out
}

// What a target is called in the UI.
export function targetLabel(target: string, header: string): string {
  if (target === SKIP) return 'Do not save'
  if (target === NEW_COLUMN) return `New column: ${header}`
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

// Rows from a CSV using the given mapping (auto-detected when omitted).
export function rowsFromCsv(text: string, source: Source, mapping: ColumnMapping = autoMapping(csvHeaders(text))): RawDonorRow[] {
  const entries = Object.entries(mapping).filter(([, t]) => t !== SKIP)
  const col = (target: string) => entries.find(([, t]) => t === target)?.[0]
  const val = (rec: Record<string, string>, target: string) => {
    const h = col(target)
    return (h && rec[h.trim().toLowerCase()]) || undefined
  }
  const customs = entries
    .filter(([, t]) => t === NEW_COLUMN || t.startsWith(CUSTOM))
    .map(([h, t]) => ({ key: h.trim().toLowerCase(), name: t === NEW_COLUMN ? h.trim() : t.slice(CUSTOM.length) }))
  return parseCsv(text)
    .map((rec): RawDonorRow => {
      const name = val(rec, 'name') ?? [val(rec, 'firstName'), val(rec, 'lastName')].filter(Boolean).join(' ')
      const amount = Number((val(rec, 'amount') ?? '').replace(/[$,]/g, ''))
      const program = PROGRAMS.find((p) => p.toLowerCase() === val(rec, 'program')?.toLowerCase())
      const extra = Object.fromEntries(customs.filter((c) => rec[c.key]).map((c) => [c.name, rec[c.key]]))
      return {
        source,
        name,
        email: val(rec, 'email'),
        phone: val(rec, 'phone'),
        org: val(rec, 'org'),
        amount: Number.isFinite(amount) && amount > 0 ? amount : undefined,
        date: val(rec, 'date'),
        program,
        extra: Object.keys(extra).length ? extra : undefined,
      }
    })
    .filter((r) => r.name)
}
