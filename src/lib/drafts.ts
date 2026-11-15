import type { BoardMember, CicEvent, Donor, DraftKind, Gift, ProgramOutcome } from '../data/types'
import { byDateDesc, fmtDate, money } from './logic'
import { fundedOutcomes, outcomeText } from './packet'

// Template drafts. This is the seam where an LLM-drafted version plugs in
// later: same inputs, same output, a human still approves every send.

const first = (name: string) => name.split(' ')[0]

export const DRAFT_SUBJECT: Record<DraftKind, string> = {
  'thank-you': 'Thank you from Coding in Color',
  'quarterly-update': 'A quarterly update from Coding in Color',
  'lapsed-nudge': 'We miss you at Coding in Color',
  'follow-up': 'Following up from Coding in Color',
  'event-invite': 'An invitation from Coding in Color',
}

// The event a draft mentions: the one being invited to, or for an update or
// nudge, the next one on CIC's calendar. Drafts read fine without one.
const on = (e: CicEvent) => `${e.name} on ${fmtDate(e.date).replace(/, \d{4}$/, '')}`

export function draftBody(kind: DraftKind, donor: Donor, gifts: Gift[], owner: BoardMember, event?: CicEvent, outcomes: ProgramOutcome[] = []): string {
  const last = [...gifts].sort(byDateDesc)[0]
  const hi = donor.org && !donor.email?.includes(first(donor.name).toLowerCase()) ? 'team' : first(donor.name)
  switch (kind) {
    case 'thank-you':
      return `Hi ${hi},\n\nThank you for your ${last ? money(last.amount) + ' ' : ''}gift to Coding in Color${last && last.program !== 'General' ? ` for ${last.program}` : ''}. It goes straight to Arizona students learning computer science and AI in schools that don't offer it.\n\nWith gratitude,\n${owner.name}`
    case 'quarterly-update': {
      // What the programs this donor funded achieved, from Program outcomes.
      const funded = fundedOutcomes(gifts, outcomes).map((o) => `${o.program}: ${outcomeText(o)}`)
      return `Hi ${hi},\n\nA quick update from Coding in Color: this quarter our AI Academy cohorts at Desert Edge, Maryvale and Salt River kept building${event ? `, and ${on(event)} is coming up` : ''}.\n\n${funded.length ? `What your support funded:\n${funded.map((l) => `- ${l}`).join('\n')}\n\n` : ''}Thanks for being part of it,\n${owner.name}`
    }
    case 'lapsed-nudge':
      return `Hi ${hi},\n\nWe've missed you this year! Your past support${last ? ` (${money(last.amount)}${last.date ? ` in ${last.date.slice(0, 4)}` : ''})` : ''} helped students at schools without CS classes. ${event ? `${on(event)} is coming up. Would you consider joining us again?` : 'Would you consider joining us again?'}\n\n${owner.name}`
    case 'follow-up':
      return `Hi ${hi},\n\nGreat to connect. ${donor.nextStep ? `Following up on: ${donor.nextStep.text}.` : ''}\n\n${owner.name}`
    case 'event-invite':
      return event
        ? `Hi ${hi},\n\nI'd love for you to join us at ${on(event)}. It's a chance to meet the students and see what your support makes possible.\n\nCan I count you in?\n\n${owner.name}`
        : `Hi ${hi},\n\nI'd love for you to join us at our next Coding in Color event. Can I send you the details?\n\n${owner.name}`
  }
}
