import type { BoardMember, CicEvent, Donor, Draft, Gift, ImportRecord, Interaction } from './types'
import * as seed from './seed'
import { sampleDonors, sampleGifts } from './retention-sample'

// The made-up donors shown everywhere while "Use sample data" is on: the seed
// donors plus the Retention samples. They're handed out round-robin to the
// real board, so My Donors and the reminders have something in them. Only the
// browser ever holds them; nothing here reaches the API.
export function sampleData(boardMembers: BoardMember[], session: { role: string; memberId: string }) {
  const owners = boardMembers.length ? boardMembers : [{ id: session.memberId }]
  const all: Donor[] = [...seed.donors, ...sampleDonors].map((d, i) => ({ ...d, ownerId: owners[i % owners.length].id }))
  // Board members see only their own donors, as the server would scope them.
  const donors = session.role === 'admin' ? all : all.filter((d) => d.ownerId === session.memberId)
  const ids = new Set(donors.map((d) => d.id))
  const owner = new Map(all.map((d) => [d.id, d.ownerId!]))
  const gifts: Gift[] = [...seed.gifts, ...sampleGifts].filter((g) => ids.has(g.donorId))
  const interactions: Interaction[] = seed.interactions.filter((i) => ids.has(i.donorId)).map((i) => ({ ...i, byId: owner.get(i.donorId)! }))
  const events: CicEvent[] = seed.events
  return { donors, gifts, interactions, events, outcomes: seed.outcomes, drafts: [] as Draft[], imports: [] as ImportRecord[] }
}
