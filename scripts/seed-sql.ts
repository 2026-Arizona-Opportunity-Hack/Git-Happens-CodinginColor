// Prints INSERTs for the fake demo data in src/data/seed.ts, so the database
// and the prototype share one source. Used by `bun run db:seed`.
import * as seed from '../src/data/seed'

const q = (v: unknown) =>
  v === undefined || v === null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replaceAll("'", "''")}'`
const row = (table: string, values: Record<string, unknown>) =>
  `INSERT INTO ${table} (${Object.keys(values).join(', ')}) VALUES (${Object.values(values).map(q).join(', ')});`

const out = ['DELETE FROM drafts;', 'DELETE FROM interactions;', 'DELETE FROM gifts;', 'DELETE FROM donors;', 'DELETE FROM events;', 'DELETE FROM board_members;']
// The founder signs in as the first board member with admin rights.
for (const [i, m] of seed.boardMembers.entries()) out.push(row('board_members', { id: m.id, name: m.name, email: m.email, is_admin: i === 0 ? 1 : 0 }))
for (const e of seed.events) out.push(row('events', { ...e }))
for (const d of seed.donors)
  out.push(row('donors', {
    id: d.id, name: d.name, email: d.email, phone: d.phone, org: d.org, owner_id: d.ownerId, sources: JSON.stringify(d.sources),
    next_step_text: d.nextStep?.text, next_step_due: d.nextStep?.due, next_step_event_id: d.nextStep?.eventId, last_touch_at: d.lastTouchAt,
  }))
for (const g of seed.gifts) out.push(row('gifts', { id: g.id, donor_id: g.donorId, amount: g.amount, date: g.date, source: g.source, program: g.program }))
for (const i of seed.interactions) out.push(row('interactions', { id: i.id, donor_id: i.donorId, by_id: i.byId, channel: i.channel, date: i.date, summary: i.summary }))
console.log(out.join('\n'))
