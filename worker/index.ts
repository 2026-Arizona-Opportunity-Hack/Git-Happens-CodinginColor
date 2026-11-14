import type { BoardMember, Channel, Donor, Draft, DraftKind, Gift, Interaction, NextStep, Program, RawDonorRow, Source } from '../src/data/types'
import { dedupe, normEmail, normName, normPhone } from '../src/lib/dedupe'
import { draftBody } from '../src/lib/drafts'
import { nextOwner } from '../src/lib/logic'

// JSON API over D1. Every route resolves the caller's session first, and
// board members can only read or write donors they own.

export interface Env {
  DB: D1Database
  DEMO_AUTH?: string
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

const toMember = (r: Row): BoardMember => ({ id: r.id as string, name: r.name as string, email: r.email as string })
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
const toDraft = (r: Row): Draft => ({
  id: r.id as string, donorId: r.donor_id as string, kind: r.kind as DraftKind, channel: r.channel as 'email' | 'text',
  body: r.body as string, createdAt: r.created_at as string, status: r.status as Draft['status'], approvedBy: (r.approved_by as string) ?? undefined,
})

// --- Session ----------------------------------------------------------------

// Demo only: the client says who it is in X-Demo-Session ("admin" or a board
// member id). Replaced by WorkOS token verification; the role will come from
// board_members.is_admin, never from the client.
async function getSession(req: Request, env: Env): Promise<Session> {
  if (env.DEMO_AUTH !== 'true') throw new HttpError(401, 'Sign-in required')
  const who = req.headers.get('X-Demo-Session') ?? 'admin'
  if (who === 'admin') {
    const admin = await env.DB.prepare('SELECT id FROM board_members WHERE is_admin = 1 LIMIT 1').first<{ id: string }>()
    if (!admin) throw new HttpError(500, 'No admin board member')
    return { role: 'admin', memberId: admin.id }
  }
  const m = await env.DB.prepare('SELECT id FROM board_members WHERE id = ?').bind(who).first()
  if (!m) throw new HttpError(401, 'Unknown board member')
  return { role: 'board', memberId: who }
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
  const s = await getSession(req, env)
  const db = env.DB

  // Everything the UI needs, already scoped to the caller.
  if (m === 'GET' && parts[0] === 'bootstrap') {
    const f = ownerFilter(s, 'd.owner_id')
    const [members, events, donors, gifts, interactions, drafts] = await db.batch<Row>([
      db.prepare('SELECT * FROM board_members ORDER BY id'),
      db.prepare('SELECT * FROM events ORDER BY date'),
      db.prepare(`SELECT d.* FROM donors d WHERE ${f.sql} ORDER BY d.id`).bind(...f.args),
      db.prepare(`SELECT g.* FROM gifts g JOIN donors d ON d.id = g.donor_id WHERE ${f.sql}`).bind(...f.args),
      db.prepare(`SELECT i.* FROM interactions i JOIN donors d ON d.id = i.donor_id WHERE ${f.sql} ORDER BY i.date DESC`).bind(...f.args),
      db.prepare(`SELECT x.* FROM drafts x JOIN donors d ON d.id = x.donor_id WHERE ${f.sql} ORDER BY x.created_at DESC`).bind(...f.args),
    ])
    return json({
      session: s,
      today: today(),
      boardMembers: members.results.map(toMember),
      events: events.results,
      donors: donors.results.map(toDonor),
      gifts: gifts.results.map(toGift),
      interactions: interactions.results.map(toInteraction),
      drafts: drafts.results.map(toDraft),
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
      if (!(await db.prepare('SELECT 1 FROM board_members WHERE id = ?').bind(ownerId).first())) throw new HttpError(400, 'Unknown board member')
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
    const [gifts, owner] = await db.batch<Row>([
      db.prepare('SELECT * FROM gifts WHERE donor_id = ?').bind(donor.id),
      db.prepare('SELECT * FROM board_members WHERE id = ?').bind(donor.ownerId),
    ])
    const draft: Draft = {
      id: id('x'), donorId: donor.id, kind, channel, status: 'pending', createdAt: today(),
      body: draftBody(kind, donor, gifts.results.map(toGift), toMember(owner.results[0])),
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
      const me = toMember((await db.prepare('SELECT * FROM board_members WHERE id = ?').bind(s.memberId).first())!)
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

  // POST /api/import {rows}: match against existing donors first, then
  // round-robin any genuinely new donors. Admin only.
  if (m === 'POST' && parts[0] === 'import') {
    requireAdmin(s)
    const raw = (await body(req)).rows
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

    const [members, existing] = await db.batch<Row>([db.prepare('SELECT * FROM board_members ORDER BY id'), db.prepare('SELECT * FROM donors')])
    const donors = existing.results.map(toDonor)
    const boardMembers = members.results.map(toMember)
    const writes: D1PreparedStatement[] = []
    let created = 0, merged = 0
    const clusters = dedupe(rows)
    for (const c of clusters) {
      const match = donors.find(
        (d) =>
          (c.email && normEmail(d.email) === normEmail(c.email)) ||
          (c.phone && normPhone(d.phone) === normPhone(c.phone)) ||
          normName(d.name) === normName(c.name),
      )
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
      for (const r of c.rows)
        if (r.amount && r.date)
          writes.push(db.prepare('INSERT INTO gifts (id, donor_id, amount, date, source, program) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(id('g'), donorId, r.amount, r.date, r.source, r.program ?? 'General'))
    }
    if (writes.length) await db.batch(writes) // one transaction: all or nothing
    return json({ created, merged, clusters: clusters.length })
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
