import type { BoardMember, Channel, CicEvent, Donor, Draft, DraftKind, Gift, Role } from '../data/types'
import { unsafeDraftText } from './ai-draft'
import { draftChannel, thankableGift } from './drafts'
import { fmtDate, inviteDue } from './logic'

// The assistant's `::action{...}` buttons. The model only proposes arguments;
// this checks them against what the person can see and writes the label
// itself, so a reply can't offer a button for a donor or draft that isn't
// theirs, or describe one thing and do another. ChatMarkdown renders the result.

export const CHANNELS: Channel[] = ['email', 'text', 'call', 'in-person', 'note']
export const KINDS: DraftKind[] = ['thank-you', 'quarterly-update', 'lapsed-nudge', 'follow-up']

export type Attrs = Record<string, string | undefined>

// The parts of the store an action reads or calls.
export interface ActionStore {
  today: string
  session: { role: Role }
  donors: Donor[]
  gifts: Gift[]
  drafts: Draft[]
  events: CicEvent[]
  boardMembers: BoardMember[]
  logInteraction: (donorId: string, channel: Channel, summary: string) => Promise<unknown>
  setNextStep: (donorId: string, nextStep: Donor['nextStep']) => Promise<unknown>
  invite: (donorId: string, eventId: string) => Promise<unknown>
  createDraft: (donorId: string, kind: DraftKind, channel?: 'email' | 'text', body?: string) => Promise<unknown>
  approveDraft: (id: string) => Promise<unknown>
  discardDraft: (id: string) => Promise<unknown>
  reassign: (donorId: string, ownerId: string | null) => Promise<unknown>
}

export type ChatAction = { label: string; run: () => Promise<unknown> } | { error: string }

const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)

// The button's label and what it does, or why it can't be offered.
export function chatAction(a: Attrs, store: ActionStore): ChatAction {
  const donor = store.donors.find((d) => d.id === a.donor)
  const draft = store.drafts.find((d) => d.id === a.draft && d.status === 'pending')
  const draftDonor = draft && store.donors.find((d) => d.id === draft.donorId)
  const text = (s?: string, max = 300) => (s ?? '').trim().slice(0, max)

  switch (a.type) {
    case 'log': {
      const channel = a.channel as Channel
      if (!donor || !CHANNELS.includes(channel) || !text(a.summary)) break
      return { label: `Log ${channel} with ${donor.name}: "${text(a.summary)}"`, run: () => store.logInteraction(donor.id, channel, text(a.summary)) }
    }
    case 'next-step':
      if (!donor || !text(a.text) || !isDate(a.due)) break
      return {
        label: `Set ${donor.name}'s next step: "${text(a.text)}" by ${fmtDate(a.due!)}`,
        run: () => store.setNextStep(donor.id, { text: text(a.text), due: a.due! }),
      }
    case 'invite': {
      const event = store.events.find((e) => e.id === a.event && e.date >= store.today)
      if (!donor || !event) break
      return {
        label: `Invite ${donor.name} to ${event.name} (${fmtDate(event.date)}): next step due ${fmtDate(inviteDue(event.date, store.today))}, plus a draft invitation`,
        run: () => store.invite(donor.id, event.id),
      }
    }
    case 'draft': {
      const kind = a.kind as DraftKind
      // The channel the donor can actually get; none, or a thank-you with no
      // recent gift to thank them for, isn't offered.
      const channel = donor && draftChannel(donor, a.channel === 'text' ? 'text' : 'email')
      if (!donor || !channel || !KINDS.includes(kind)) break
      if (kind === 'thank-you' && !thankableGift(store.gifts.filter((g) => g.donorId === donor.id), store.today)) break
      // A body the assistant wrote (a follow-up from a debrief) is saved as the
      // draft; it still waits in Follow-ups for a human to approve.
      // A body with links or payment details isn't offered at all, the same
      // check AI-written drafts get.
      const body = text(a.body, 4000).replaceAll('\\n', '\n')
      if (unsafeDraftText(body)) break
      return body
        ? { label: `Save this ${kind.replace('-', ' ')} ${channel} to ${donor.name} as a draft to approve: "${body.length > 140 ? body.slice(0, 140) + '…' : body}"`, run: () => store.createDraft(donor.id, kind, channel, body) }
        : { label: `Draft a ${kind.replace('-', ' ')} ${channel} to ${donor.name}`, run: () => store.createDraft(donor.id, kind, channel) }
    }
    case 'approve':
      if (!draft || !draftDonor) break
      return { label: `Approve and mark sent: ${draft.kind.replace('-', ' ')} to ${draftDonor.name}`, run: () => store.approveDraft(draft.id) }
    case 'discard':
      if (!draft || !draftDonor) break
      return { label: `Discard the ${draft.kind.replace('-', ' ')} draft to ${draftDonor.name}`, run: () => store.discardDraft(draft.id) }
    case 'reassign': {
      const owner = store.boardMembers.find((m) => m.id === a.owner)
      if (store.session.role !== 'admin' || !donor || !owner) break
      return { label: `Reassign ${donor.name} to ${owner.name}`, run: () => store.reassign(donor.id, owner.id) }
    }
  }
  return { error: "(The assistant suggested an action that isn't available.)" }
}
