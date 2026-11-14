import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import * as seed from '@/data/seed'
import type { Channel, Donor, Draft, DraftKind, Interaction, RawDonorRow, Role } from '@/data/types'
import { draftBody } from '@/lib/drafts'
import { dedupe, normEmail, normPhone, normName } from '@/lib/dedupe'
import { nextOwner } from '@/lib/logic'

// In-memory store standing in for the D1-backed API. Each action here maps to
// one API route / RLS-guarded table write in the real build.

interface Session { role: Role; memberId: string }

function useStoreState() {
  const [session, setSession] = useState<Session>({ role: 'admin', memberId: 'bm1' })
  const [donors, setDonors] = useState(seed.donors)
  const [gifts, setGifts] = useState(seed.gifts)
  const [interactions, setInteractions] = useState(seed.interactions)
  const [drafts, setDrafts] = useState<Draft[]>([])

  // Board members only see their own donors (least privilege). Admin sees all.
  const visibleDonors = useMemo(
    () => (session.role === 'admin' ? donors : donors.filter((d) => d.ownerId === session.memberId)),
    [donors, session],
  )

  const member = (id: string) => seed.boardMembers.find((m) => m.id === id)!

  const createDraft = (donorId: string, kind: DraftKind, channel: 'email' | 'text' = 'email') => {
    const donor = donors.find((d) => d.id === donorId)!
    const draft: Draft = {
      id: crypto.randomUUID(),
      donorId,
      kind,
      channel,
      body: draftBody(kind, donor, gifts.filter((g) => g.donorId === donorId), member(donor.ownerId)),
      createdAt: seed.TODAY,
      status: 'pending',
    }
    setDrafts((ds) => [draft, ...ds])
    return draft
  }

  const updateDraft = (id: string, body: string) =>
    setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, body } : d)))

  // Human approval is the only path to "sent". Approving logs the interaction
  // and resets the quarterly clock.
  const approveDraft = (id: string) => {
    const draft = drafts.find((d) => d.id === id)!
    setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, status: 'approved', approvedBy: session.memberId } : d)))
    logInteraction(draft.donorId, draft.channel, `Sent ${draft.kind.replace('-', ' ')} (approved by ${member(session.memberId).name})`)
  }

  const discardDraft = (id: string) =>
    setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, status: 'discarded' } : d)))

  const logInteraction = (donorId: string, channel: Channel, summary: string) => {
    const i: Interaction = { id: crypto.randomUUID(), donorId, byId: session.memberId, channel, date: seed.TODAY, summary }
    setInteractions((is) => [i, ...is])
    setDonors((ds) => ds.map((d) => (d.id === donorId ? { ...d, lastTouchAt: seed.TODAY } : d)))
  }

  const setNextStep = (donorId: string, nextStep: Donor['nextStep']) =>
    setDonors((ds) => ds.map((d) => (d.id === donorId ? { ...d, nextStep } : d)))

  const reassign = (donorId: string, ownerId: string) =>
    setDonors((ds) => ds.map((d) => (d.id === donorId ? { ...d, ownerId } : d)))

  // Merge imported rows into the donor table: match against existing donors
  // first, then round-robin any genuinely new donors.
  const importRows = (rows: RawDonorRow[]) => {
    const clusters = dedupe(rows)
    let next = [...donors]
    const newGifts = [...gifts]
    let created = 0, merged = 0
    for (const c of clusters) {
      const existing = next.find(
        (d) =>
          (c.email && normEmail(d.email) === normEmail(c.email)) ||
          (c.phone && normPhone(d.phone) === normPhone(c.phone)) ||
          normName(d.name) === normName(c.name),
      )
      let donorId: string
      if (existing) {
        merged++
        donorId = existing.id
        next = next.map((d) =>
          d.id === existing.id
            ? { ...d, email: d.email ?? c.email, phone: d.phone ?? c.phone, sources: [...new Set([...d.sources, ...c.sources])] }
            : d,
        )
      } else {
        created++
        donorId = `d${crypto.randomUUID().slice(0, 8)}`
        next.push({ id: donorId, name: c.name, email: c.email, phone: c.phone, org: c.org, sources: c.sources, ownerId: nextOwner(seed.boardMembers, next) })
      }
      for (const r of c.rows)
        if (r.amount && r.date)
          newGifts.push({ id: crypto.randomUUID(), donorId, amount: r.amount, date: r.date.slice(0, 10), source: r.source, program: r.program ?? 'General' })
    }
    setDonors(next)
    setGifts(newGifts)
    return { created, merged, clusters: clusters.length }
  }

  return {
    session, setSession, donors, visibleDonors, gifts, interactions, drafts,
    boardMembers: seed.boardMembers, events: seed.events, today: seed.TODAY, member,
    createDraft, updateDraft, approveDraft, discardDraft, logInteraction, setNextStep, reassign, importRows,
  }
}

type Store = ReturnType<typeof useStoreState>
const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={useStoreState()}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)!
