import type { BoardMember, Donor, DraftKind, Gift } from '../data/types'
import { money } from './logic'

// Template drafts. This is the seam where an LLM-drafted version plugs in
// later: same inputs, same output, a human still approves every send.

const first = (name: string) => name.split(' ')[0]

export function draftBody(kind: DraftKind, donor: Donor, gifts: Gift[], owner: BoardMember): string {
  const last = [...gifts].sort((a, b) => b.date.localeCompare(a.date))[0]
  const hi = donor.org && !donor.email?.includes(first(donor.name).toLowerCase()) ? 'team' : first(donor.name)
  switch (kind) {
    case 'thank-you':
      return `Hi ${hi},\n\nThank you for your ${last ? money(last.amount) + ' ' : ''}gift to Coding in Color${last && last.program !== 'General' ? ` for ${last.program}` : ''}. It goes straight to Arizona students learning computer science and AI in schools that don't offer it.\n\nWith gratitude,\n${owner.name}`
    case 'quarterly-update':
      return `Hi ${hi},\n\nA quick update from Coding in Color: this quarter our AI Academy cohorts at Desert Edge, Maryvale and Salt River kept building, and Day of Compute is coming up on Dec 5.\n\n[Program outcomes pulled from the curriculum platform go here.]\n\nThanks for being part of it,\n${owner.name}`
    case 'lapsed-nudge':
      return `Hi ${hi},\n\nWe've missed you this year! Your past support${last ? ` (${money(last.amount)} in ${last.date.slice(0, 4)})` : ''} helped students at schools without CS classes. Giving Tuesday is Dec 1 — would you consider joining us again?\n\n${owner.name}`
    case 'follow-up':
      return `Hi ${hi},\n\nGreat to connect. ${donor.nextStep ? `Following up on: ${donor.nextStep.text}.` : ''}\n\n${owner.name}`
  }
}
