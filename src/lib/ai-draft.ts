import type { BoardMember, CicEvent, Donor, DraftKind, Gift } from '../data/types'
import { byDateDesc, money } from './logic'

// AI-written drafts: the template body (drafts.ts) plus the donor's history go
// to the AI gateway, which rewrites it for this donor. The worker falls back to
// the template whenever the reply is missing or unusable, and a human still
// approves every draft before it's sent.

// Kinds the AI rewrites. Invites and follow-ups stay templates: they're short,
// and the one-click invite shouldn't wait on the gateway.
export const AI_KINDS: DraftKind[] = ['thank-you', 'quarterly-update', 'lapsed-nudge']

export const MAX_CHARS = { email: 1500, text: 320 }

const PURPOSE: Partial<Record<DraftKind, string>> = {
  'thank-you': 'thank them for their most recent gift',
  'quarterly-update': 'give them a short, warm quarterly update on Coding in Color and the programs they funded',
  'lapsed-nudge': 'warmly reconnect: they gave before but not this year, so invite them back without guilt',
}

export function draftPrompt(kind: DraftKind, channel: 'email' | 'text', donor: Donor, gifts: Gift[], owner: BoardMember, template: string, event?: CicEvent) {
  const history = [...gifts].sort(byDateDesc).slice(0, 10)
    .map((g) => `- ${g.date ?? 'date unknown'}: ${money(g.amount)} to ${g.program}`)
  const system = [
    'You write short donor messages for Coding in Color, a Phoenix nonprofit that teaches computer science and AI to Arizona high schoolers whose schools do not offer it.',
    'A board member will read, edit and send your draft themselves.',
    'Rules:',
    '- Reply with the message body only: plain text, no subject line, no markdown, no links, no placeholders in brackets.',
    '- Use only the facts given below. Never invent numbers, names, dates, programs or outcomes.',
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
    `Next CIC event: ${event ? `${event.name} on ${event.date}` : 'none scheduled'}`,
    `Template to improve on (keep its facts, make it personal):\n${template}`,
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
