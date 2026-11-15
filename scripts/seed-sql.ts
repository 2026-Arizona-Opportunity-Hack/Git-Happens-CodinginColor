// Prints INSERTs for the fake demo data in src/data/seed.ts, so the database
// and the prototype share one source. Used by `bun run db:seed`.
// Board members live in WorkOS, so the seed's bm1..bm4 are swapped for the
// WorkOS user IDs with the same emails. Needs WORKOS_API_KEY (Bun reads .env).
import * as seed from '../src/data/seed'

const key = process.env.WORKOS_API_KEY
if (!key) throw new Error('Set WORKOS_API_KEY (the Staging sk_test_ key) in .env')

const workosId = new Map<string, string>()
for (const m of seed.boardMembers) {
  const res = await fetch(`https://api.workos.com/user_management/users?email=${encodeURIComponent(m.email)}`, { headers: { Authorization: `Bearer ${key}` } })
  if (!res.ok) throw new Error(`WorkOS returned ${res.status} looking up ${m.email}`)
  const user = ((await res.json()) as { data: { id: string }[] }).data[0]
  if (!user) throw new Error(`${m.email} isn't a WorkOS user; create it and add it to the CIC organization`)
  workosId.set(m.id, user.id)
}
const member = (bmId: string) => workosId.get(bmId)!

const q = (v: unknown) =>
  v === undefined || v === null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replaceAll("'", "''")}'`
const row = (table: string, values: Record<string, unknown>) =>
  `INSERT INTO ${table} (${Object.keys(values).join(', ')}) VALUES (${Object.values(values).map(q).join(', ')});`

const out = ['DELETE FROM imports;', 'DELETE FROM drafts;', 'DELETE FROM interactions;', 'DELETE FROM gifts;', 'DELETE FROM donors;', 'DELETE FROM events;']
for (const e of seed.events) out.push(row('events', { ...e }))
for (const d of seed.donors)
  out.push(row('donors', {
    id: d.id, name: d.name, email: d.email, phone: d.phone, org: d.org, owner_id: d.ownerId ? member(d.ownerId) : '', sources: JSON.stringify(d.sources),
    next_step_text: d.nextStep?.text, next_step_due: d.nextStep?.due, next_step_event_id: d.nextStep?.eventId, last_touch_at: d.lastTouchAt,
  }))
for (const g of seed.gifts) out.push(row('gifts', { id: g.id, donor_id: g.donorId, amount: g.amount, date: g.date ?? '', source: g.source, program: g.program }))
for (const i of seed.interactions) out.push(row('interactions', { id: i.id, donor_id: i.donorId, by_id: member(i.byId), channel: i.channel, date: i.date, summary: i.summary }))
out.push('DELETE FROM program_outcomes;')
for (const o of seed.outcomes) out.push(row('program_outcomes', { program: o.program, students_served: o.studentsServed, summary: o.summary }))
console.log(out.join('\n'))
