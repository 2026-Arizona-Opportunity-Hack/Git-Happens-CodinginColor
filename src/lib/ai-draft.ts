import type { BoardMember, CicEvent, Donor, DraftKind, Gift, Interaction } from '../data/types'
import { byDateDesc, money } from './logic'

// AI-written drafts: the donor's notes, gifts, logged outreach and the messages
// already sent them go to the AI gateway with the template body (drafts.ts) as
// a starting point, and it writes a message for this person. The worker falls
// back to the template whenever the reply is missing or unusable, and a human
// still approves every draft before it's sent. Follow-ups' Template emails
// section is where someone picks the plain template instead.

// What the AI knows about the donor beyond their gifts.
export interface DraftContext {
  notes?: string
  interactions: Pick<Interaction, 'date' | 'channel' | 'summary'>[] // newest first
  sent: string[] // bodies of messages already approved and sent, newest first
}

export const MAX_CHARS = { email: 1500, text: 320 }

const PURPOSE: Partial<Record<DraftKind, string>> = {
  'thank-you': 'thank them for their most recent gift',
  'quarterly-update': 'give them a short, warm quarterly update on Coding in Color and the programs they funded',
  'lapsed-nudge': 'warmly reconnect: they gave before but not this year, so invite them back without guilt',
  'follow-up': 'follow up on your last conversation and their next step, moving the relationship forward',
  'event-invite': 'invite them to the event below and say why it would mean something to them',
}

export function draftPrompt(kind: DraftKind, channel: 'email' | 'text', donor: Donor, gifts: Gift[], owner: BoardMember, template: string, event?: CicEvent, ctx: DraftContext = { interactions: [], sent: [] }) {
  const history = [...gifts].sort(byDateDesc).slice(0, 10)
    .map((g) => `- ${g.date ?? 'date unknown'}: ${money(g.amount)} to ${g.program}`)
  const system = [
    'You write short donor messages for Coding in Color, a Phoenix nonprofit that teaches computer science and AI to Arizona high schoolers whose schools do not offer it.',
    'A board member will read, edit and send your draft themselves.',
    'Rules:',
    '- Reply with the message body only: plain text, no subject line, no markdown, no links, no placeholders in brackets.',
    '- Use only the facts given below. Never invent numbers, names, dates, programs or outcomes.',
    '- Make it personal: use what the notes and past conversations say about this person (interests, family, what they asked about, what they were promised), and pick up where the last conversation left off.',
    '- Do not repeat what earlier messages already said; say something new.',
    `- Sign off with the board member's name: ${owner.name}.`,
    channel === 'text'
      ? `- This is a text message: at most ${MAX_CHARS.text} characters, no greeting line of its own.`
      : '- This is an email: a greeting, two short paragraphs at most, then the sign-off.',
    '- Warm and specific, not salesy.',
  ].join('\n')
  const user = [
    `Purpose: ${PURPOSE[kind] ?? 'follow up'}.`,
    `Donor: ${donor.name}${donor.org ? ` (${donor.org})` : ''}`,
    `Gifts, newest first:\n${history.join('\n') || '- none recorded'}`,
    `Next step: ${donor.nextStep ? `${donor.nextStep.text} (due ${donor.nextStep.due})` : 'none'}`,
    `Notes about them:\n${ctx.notes?.trim() || 'none'}`,
    `Logged outreach, newest first:\n${ctx.interactions.slice(0, 10).map((i) => `- ${i.date} ${i.channel}: ${i.summary}`).join('\n') || '- none logged'}`,
    `Messages already sent to them, newest first:\n${ctx.sent.slice(0, 3).map((b) => `---\n${b}`).join('\n') || 'none'}`,
    `Next CIC event: ${event ? `${event.name} on ${event.date}` : 'none scheduled'}`,
    `Template, as a starting point only (keep its facts, but write it for this person):\n${template}`,
  ].join('\n\n')
  return [{ role: 'system' as const, content: system }, { role: 'user' as const, content: user }]
}

// The reply as a draft body, or null when it isn't usable and the template
// should be used instead.
export function cleanDraft(reply: string | null | undefined, channel: 'email' | 'text'): string | null {
  if (!reply) return null
  let s = reply.trim().replace(/^```[a-z]*\n?|\n?```$/g, '').trim()
  s = s.replace(/^subject:.*\n+/i, '').trim()
  if (!s || s.length > MAX_CHARS[channel] || /\[[^\]]*\]|https?:\/\//i.test(s)) return null
  return s
}
