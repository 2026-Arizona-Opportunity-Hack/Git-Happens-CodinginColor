import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { BoardMember, Channel, Donor, Draft, DraftKind, Gift, ImportRecord, Interaction, NextStep, Program, RawDonorRow, Source } from '../src/data/types'
import { dedupe, matchDonor, splitGifts } from '../src/lib/dedupe'
import { draftBody } from '../src/lib/drafts'
import { nextOwner } from '../src/lib/logic'

// JSON API over D1. Every route resolves the caller's session first, and
// board members can only read or write donors they own.

export interface Env {
  DB: D1Database
  WORKOS_CLIENT_ID: string
  WORKOS_ORG_ID: string
  WORKOS_API_KEY: string
}

interface Session { role: 'admin' | 'board'; memberId: string }

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

const json = (data: unknown, status = 200) => Response.json(data, { status })
const today = () => new Date().toISOString().slice(0, 10)
const id = (prefix: string) => `${prefix}${crypto.randomUUID().slice(0, 8)}`

// --- Input validation -------------------------------------------------------

const CHANNELS: Channel[] = ['email', 'text', 'call', 'in-person', 'note']
const KINDS: DraftKind[] = ['thank-you', 'quarterly-update', 'lapsed-nudge', 'follow-up']
const SOURCES: Source[] = ['spreadsheet', 'zeffy', 'benevity', 'azgives', 'unitedway']
const PROGRAMS: Program[] = ['K12', 'AI Academy', 'Summer Camp', 'Day of Compute', 'General']
const ISO_DATE = /^\d{4}-\d{2}-\d{2}/

function str(v: unknown, field: string, max = 2000): string {
  if (typeof v !== 'string' || !v.trim() || v.length > max) throw new HttpError(400, `${field} must be a non-empty string up to ${max} chars`)
  return v.trim()
}
const optStr = (v: unknown, field: string, max = 200) => (v === undefined || v === null || v === '' ? undefined : str(v, field, max))
function oneOf<T extends string>(v: unknown, allowed: readonly T[], field: string): T {
  if (!allowed.includes(v as T)) throw new HttpError(400, `${field} must be one of ${allowed.join(', ')}`)
  return v as T
}
function date(v: unknown, field: string): string {
  if (typeof v !== 'string' || !ISO_DATE.test(v)) throw new HttpError(400, `${field} must be an ISO date`)
  return v.slice(0, 10)
}
async function body(req: Request): Promise<Record<string, unknown>> {
  const b = await req.json().catch(() => null)
  if (!b || typeof b !== 'object' || Array.isArray(b)) throw new HttpError(400, 'Expected a JSON object')
  return b as Record<string, unknown>
}

// --- Rows <-> domain types -------------------------------------------------

type Row = Record<string, unknown>

const toDonor = (r: Row): Donor => ({
  id: r.id as string,
  name: r.name as string,
  email: (r.email as string) ?? undefined,
  phone: (r.phone as string) ?? undefined,
  org: (r.org as string) ?? undefined,
  ownerId: r.owner_id as string,
  sources: JSON.parse(r.sources as string),
  nextStep: r.next_step_text
    ? { text: r.next_step_text as string, due: r.next_step_due as string, eventId: (r.next_step_event_id as string) ?? undefined }
    : undefined,
  lastTouchAt: (r.last_touch_at as string) ?? undefined,
})
const toGift = (r: Row): Gift => ({ id: r.id as string, donorId: r.donor_id as string, amount: r.amount as number, date: r.date as string, source: r.source as Source, program: r.program as Program })
const toInteraction = (r: Row): Interaction => ({ id: r.id as string, donorId: r.donor_id as string, byId: r.by_id as string, channel: r.channel as Channel, date: r.date as string, summary: r.summary as string })
const toImport = (r: Row): ImportRecord => ({
  id: r.id as string, source: r.source as Source, fileName: (r.file_name as string) ?? undefined,
  rowCount: r.row_count as number, importedAt: r.imported_at as string, importedBy: r.imported_by as string,
})
const toDraft = (r: Row): Draft => ({
  id: r.id as string, donorId: r.donor_id as string, kind: r.kind as DraftKind, channel: r.channel as 'email' | 'text',
  body: r.body as string, createdAt: r.created_at as string, status: r.status as Draft['status'], approvedBy: (r.approved_by as string) ?? undefined,
})

// --- Board members (WorkOS) -------------------------------------------------

// WorkOS is the source of truth for people: a board member is an active member
// of the CIC organization, and its "admin" role makes them a CIC admin. Member
// IDs are WorkOS user IDs. Cached per isolate for a minute, so most requests
// make no WorkOS calls; a role change shows up within that minute.
interface Member extends BoardMember { role: Session['role'] }
let membersCache: { at: number; members: Member[] } | undefined

async function workos<T>(env: Env, path: string): Promise<T> {
  const res = await fetch(`https://api.workos.com/user_management/${path}`, { headers: { Authorization: `Bearer ${env.WORKOS_API_KEY}` } })
  if (!res.ok) throw new Error(`WorkOS ${path} returned ${res.status}`)
  return res.json()
}

async function listMembers(env: Env): Promise<Member[]> {
  if (membersCache && Date.now() - membersCache.at < 60_000) return membersCache.members
  const q = `organization_id=${env.WORKOS_ORG_ID}&limit=100` // a board fits in one page
  const [users, memberships] = await Promise.all([
    workos<{ data: { id: string; email: string; first_name: string | null; last_name: string | null }[] }>(env, `users?${q}`),
    workos<{ data: { user_id: string; status: string; role: { slug: string } }[] }>(env, `organization_memberships?${q}`),
  ])
  const roles = new Map(memberships.data.filter((m) => m.status === 'active').map((m) => [m.user_id, m.role.slug]))
  const members = users.data
    .filter((u) => roles.has(u.id))
    .map((u): Member => ({
      id: u.id,
      email: u.email,
      name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email,
      role: roles.get(u.id) === 'admin' ? 'admin' : 'board',
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
  membersCache = { at: Date.now(), members }
  return members
}

const toMember = ({ id, name, email }: Member): BoardMember => ({ id, name, email })

// --- Session ----------------------------------------------------------------

// The caller sends their WorkOS access token as a Bearer header. We check its
// signature against the WorkOS keys for our client, then look its subject up
// in the CIC organization. Nothing the client says is trusted.
let jwks: ReturnType<typeof createRemoteJWKSet> | undefined

async function getSession(req: Request, env: Env): Promise<Session> {
  const token = req.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1]
  if (!token) throw new HttpError(401, 'Sign-in required')
  jwks ??= createRemoteJWKSet(new URL(`https://api.workos.com/sso/jwks/${env.WORKOS_CLIENT_ID}`))
  const { payload } = await jwtVerify(token, jwks).catch(() => {
    throw new HttpError(401, 'Session expired, sign in again')
  })
  const me = (await listMembers(env)).find((m) => m.id === payload.sub)
  if (!me) throw new HttpError(403, `${typeof payload.email === 'string' ? payload.email : 'This account'} is not a CIC board member`)
  return { role: me.role, memberId: me.id }
}

const requireAdmin = (s: Session) => {
  if (s.role !== 'admin') throw new HttpError(403, 'Admins only')
}

// Board members only see their own donors (least privilege). Admin sees all.
const ownerFilter = (s: Session, col = 'owner_id') => (s.role === 'admin' ? { sql: '1 = 1', args: [] } : { sql: `${col} = ?`, args: [s.memberId] })

async function loadDonor(env: Env, s: Session, donorId: string): Promise<Donor> {
  const f = ownerFilter(s)
  const r = await env.DB.prepare(`SELECT * FROM donors WHERE id = ? AND ${f.sql}`).bind(donorId, ...f.args).first()
  if (!r) throw new HttpError(404, 'Donor not found')
  return toDonor(r)
}

async function loadDraft(env: Env, s: Session, draftId: string): Promise<Draft> {
  const r = await env.DB.prepare('SELECT * FROM drafts WHERE id = ?').bind(draftId).first()
  if (!r) throw new HttpError(404, 'Draft not found')
  const draft = toDraft(r)
  await loadDonor(env, s, draft.donorId) // 404s if the caller can't see the donor
  return draft
}

const logInteraction = (env: Env, s: Session, donorId: string, channel: Channel, summary: string) => [
  env.DB.prepare('INSERT INTO interactions (id, donor_id, by_id, channel, date, summary) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id('i'), donorId, s.memberId, channel, today(), summary),
  env.DB.prepare('UPDATE donors SET last_touch_at = ? WHERE id = ?').bind(today(), donorId),
]

// --- Routes -----------------------------------------------------------------

async function route(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url)
  const parts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean)
  const m = req.method

  // Public: the browser needs the client ID before anyone has signed in.
  if (m === 'GET' && parts[0] === 'config') return json({ workosClientId: env.WORKOS_CLIENT_ID })

  const s = await getSession(req, env)
  const db = env.DB

  // Everything the UI needs, already scoped to the caller.
  if (m === 'GET' && parts[0] === 'bootstrap') {
    const f = ownerFilter(s, 'd.owner_id')
    const members = await listMembers(env)
    // Import history is admin-only, like the import itself.
    const importsSql = s.role === 'admin' ? 'SELECT * FROM imports ORDER BY imported_at DESC LIMIT 50' : 'SELECT * FROM imports WHERE 0'
    const [events, donors, gifts, interactions, drafts, imports] = await db.batch<Row>([
      db.prepare('SELECT * FROM events ORDER BY date'),
      db.prepare(`SELECT d.* FROM donors d WHERE ${f.sql} ORDER BY d.id`).bind(...f.args),
      db.prepare(`SELECT g.* FROM gifts g JOIN donors d ON d.id = g.donor_id WHERE ${f.sql}`).bind(...f.args),
      db.prepare(`SELECT i.* FROM interactions i JOIN donors d ON d.id = i.donor_id WHERE ${f.sql} ORDER BY i.date DESC`).bind(...f.args),
      db.prepare(`SELECT x.* FROM drafts x JOIN donors d ON d.id = x.donor_id WHERE ${f.sql} ORDER BY x.created_at DESC`).bind(...f.args),
      db.prepare(importsSql),
    ])
    return json({
      session: s,
      today: today(),
      boardMembers: members.map(toMember),
      events: events.results,
      donors: donors.results.map(toDonor),
      gifts: gifts.results.map(toGift),
      interactions: interactions.results.map(toInteraction),
      drafts: drafts.results.map(toDraft),
      imports: imports.results.map(toImport),
    })
  }

  if (parts[0] === 'donors' && parts[1]) {
    const donor = await loadDonor(env, s, parts[1])

    // POST /api/donors/:id/interactions {channel, summary}
    if (m === 'POST' && parts[2] === 'interactions') {
      const b = await body(req)
      await db.batch(logInteraction(env, s, donor.id, oneOf(b.channel, CHANNELS, 'channel'), str(b.summary, 'summary')))
      return json({ ok: true }, 201)
    }

    // PUT /api/donors/:id/next-step {text, due, eventId?} or {} to clear
    if (m === 'PUT' && parts[2] === 'next-step') {
      const b = await body(req)
      const step: NextStep | undefined = b.text === undefined
        ? undefined
        : { text: str(b.text, 'text', 300), due: date(b.due, 'due'), eventId: optStr(b.eventId, 'eventId') }
      if (step?.eventId && !(await db.prepare('SELECT 1 FROM events WHERE id = ?').bind(step.eventId).first()))
        throw new HttpError(400, 'Unknown event')
      await db.prepare('UPDATE donors SET next_step_text = ?, next_step_due = ?, next_step_event_id = ? WHERE id = ?')
        .bind(step?.text ?? null, step?.due ?? null, step?.eventId ?? null, donor.id).run()
      return json({ ok: true })
    }

    // PUT /api/donors/:id/owner {ownerId} (admin)
    if (m === 'PUT' && parts[2] === 'owner') {
      requireAdmin(s)
      const ownerId = str((await body(req)).ownerId, 'ownerId', 50)
      if (!(await listMembers(env)).some((mb) => mb.id === ownerId)) throw new HttpError(400, 'Unknown board member')
      await db.prepare('UPDATE donors SET owner_id = ? WHERE id = ?').bind(ownerId, donor.id).run()
      return json({ ok: true })
    }
  }

  // POST /api/drafts {donorId, kind, channel?}: the server writes the draft body.
  if (m === 'POST' && parts[0] === 'drafts' && !parts[1]) {
    const b = await body(req)
    const donor = await loadDonor(env, s, str(b.donorId, 'donorId', 50))
    const kind = oneOf(b.kind, KINDS, 'kind')
    const channel = b.channel === undefined ? 'email' : oneOf(b.channel, ['email', 'text'] as const, 'channel')
    const gifts = await db.prepare('SELECT * FROM gifts WHERE donor_id = ?').bind(donor.id).all()
    // Sign as the donor's owner, or as the caller if the owner has left the board.
    const members = await listMembers(env)
    const owner = members.find((mb) => mb.id === donor.ownerId) ?? members.find((mb) => mb.id === s.memberId)!
    const draft: Draft = {
      id: id('x'), donorId: donor.id, kind, channel, status: 'pending', createdAt: today(),
      body: draftBody(kind, donor, gifts.results.map(toGift), toMember(owner)),
    }
    await db.prepare('INSERT INTO drafts (id, donor_id, kind, channel, body, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(draft.id, draft.donorId, draft.kind, draft.channel, draft.body, draft.createdAt, draft.status).run()
    return json(draft, 201)
  }

  if (parts[0] === 'drafts' && parts[1]) {
    const draft = await loadDraft(env, s, parts[1])
    if (draft.status !== 'pending') throw new HttpError(409, `Draft is already ${draft.status}`)

    // PATCH /api/drafts/:id {body}
    if (m === 'PATCH' && !parts[2]) {
      await db.prepare('UPDATE drafts SET body = ? WHERE id = ?').bind(str((await body(req)).body, 'body', 10000), draft.id).run()
      return json({ ok: true })
    }

    // Human approval is the only path to "sent". Approving logs the
    // interaction and resets the quarterly clock.
    if (m === 'POST' && parts[2] === 'approve') {
      const me = (await listMembers(env)).find((mb) => mb.id === s.memberId)!
      await db.batch<Row>([
        db.prepare("UPDATE drafts SET status = 'approved', approved_by = ? WHERE id = ?").bind(s.memberId, draft.id),
        ...logInteraction(env, s, draft.donorId, draft.channel, `Sent ${draft.kind.replace('-', ' ')} (approved by ${me.name})`),
      ])
      return json({ ok: true })
    }

    if (m === 'POST' && parts[2] === 'discard') {
      await db.prepare("UPDATE drafts SET status = 'discarded' WHERE id = ?").bind(draft.id).run()
      return json({ ok: true })
    }
  }

  // POST /api/widget-token: a one-hour token for the WorkOS Users Management
  // widget on the Members page. WorkOS also caps it to the caller's own
  // permissions in the org, so it only works for its "admin" role. Admin only.
  if (m === 'POST' && parts[0] === 'widget-token') {
    requireAdmin(s)
    const res = await fetch('https://api.workos.com/widgets/token', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.WORKOS_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ organization_id: env.WORKOS_ORG_ID, user_id: s.memberId, scopes: ['widgets:users-table:manage'] }),
    })
    if (!res.ok) throw new Error(`WorkOS widgets/token returned ${res.status}`)
    const { token } = await res.json<{ token: string }>()
    return json({ token })
  }

  // POST /api/import {rows, files?}: match against existing donors first, then
  // round-robin any genuinely new donors. Admin only.
  if (m === 'POST' && parts[0] === 'import') {
    requireAdmin(s)
    const b = await body(req)
    const raw = b.rows
    if (!Array.isArray(raw) || raw.length > 5000) throw new HttpError(400, 'rows must be an array of up to 5000 rows')
    const rows: RawDonorRow[] = raw.map((r, i) => {
      if (!r || typeof r !== 'object') throw new HttpError(400, `rows[${i}] must be an object`)
      return {
        source: oneOf(r.source, SOURCES, `rows[${i}].source`),
        name: str(r.name, `rows[${i}].name`, 200),
        email: optStr(r.email, `rows[${i}].email`),
        phone: optStr(r.phone, `rows[${i}].phone`, 50),
        org: optStr(r.org, `rows[${i}].org`),
        amount: r.amount === undefined || r.amount === null ? undefined : Number(r.amount) > 0 ? Number(r.amount) : undefined,
        date: r.date ? date(r.date, `rows[${i}].date`) : undefined,
        program: r.program ? oneOf(r.program, PROGRAMS, `rows[${i}].program`) : undefined,
      }
    })

    const [existing, existingGifts] = await db.batch<Row>([
      db.prepare('SELECT * FROM donors'),
      db.prepare('SELECT donor_id, amount, date FROM gifts'),
    ])
    const donors = existing.results.map(toDonor)
    // Gifts per donor: what D1 holds plus what this import has queued, so two
    // clusters landing on the same donor can't both add one gift.
    const known = new Map<string, { amount: number; date: string }[]>()
    for (const g of existingGifts.results)
      known.set(g.donor_id as string, [...(known.get(g.donor_id as string) ?? []), { amount: g.amount as number, date: g.date as string }])
    const boardMembers = await listMembers(env)
    const writes: D1PreparedStatement[] = []
    let created = 0, merged = 0, gifts = 0, skippedGifts = 0
    const clusters = dedupe(rows)
    for (const c of clusters) {
      const match = matchDonor(c, donors)
      let donorId: string
      if (match) {
        merged++
        donorId = match.id
        match.email ??= c.email
        match.phone ??= c.phone
        match.sources = [...new Set([...match.sources, ...c.sources])]
        writes.push(db.prepare('UPDATE donors SET email = ?, phone = ?, sources = ? WHERE id = ?')
          .bind(match.email ?? null, match.phone ?? null, JSON.stringify(match.sources), match.id))
      } else {
        created++
        const d: Donor = { id: id('d'), name: c.name, email: c.email, phone: c.phone, org: c.org, sources: c.sources, ownerId: nextOwner(boardMembers, donors) }
        donors.push(d)
        donorId = d.id
        writes.push(db.prepare('INSERT INTO donors (id, name, email, phone, org, owner_id, sources) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .bind(d.id, d.name, d.email ?? null, d.phone ?? null, d.org ?? null, d.ownerId, JSON.stringify(d.sources)))
      }
      // Skip gifts this donor already has (same amount, near-same date), so
      // re-imports and donations reported by two sources aren't double counted.
      const { keep, skipped } = splitGifts(c.rows, known.get(donorId) ?? [])
      known.set(donorId, [...(known.get(donorId) ?? []), ...keep])
      gifts += keep.length
      skippedGifts += skipped.length
      for (const r of keep)
        writes.push(db.prepare('INSERT INTO gifts (id, donor_id, amount, date, source, program) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(id('g'), donorId, r.amount, r.date, r.source, r.program ?? 'General'))
    }
    // Log one import per source, in the same transaction, so "last updated"
    // only moves when the data actually landed. files is {source: fileName}.
    const files = b.files && typeof b.files === 'object' && !Array.isArray(b.files) ? (b.files as Record<string, unknown>) : {}
    const now = new Date().toISOString()
    for (const src of new Set(rows.map((r) => r.source)))
      writes.push(db.prepare('INSERT INTO imports (id, source, file_name, row_count, imported_at, imported_by) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(id('m'), src, optStr(files[src], `files.${src}`) ?? null, rows.filter((r) => r.source === src).length, now, s.memberId))
    if (writes.length) await db.batch(writes) // one transaction: all or nothing
    return json({ created, merged, clusters: clusters.length, gifts, skippedGifts })
  }

  throw new HttpError(404, 'Not found')
}

export default {
  async fetch(req, env): Promise<Response> {
    try {
      return await route(req, env)
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status)
      console.error(e)
      return json({ error: 'Internal error' }, 500)
    }
  },
} satisfies ExportedHandler<Env>
