---
title: Follow-ups
audience: everyone
covers:
  - src/pages/FollowUps.tsx
  - src/components/SendDraft.tsx
  - src/lib/drafts.ts
  - src/lib/ai-draft.ts
---

# Follow-ups

A board member's work queue:

- Next steps with due dates
- The quarterly-touch queue (every donor hears from CIC each quarter)
- Lapsed-donor nudges
- **Drafts a human must approve.** Nothing is sent without a person approving it.

Long lists show a page at a time (10 rows, or 6 drafts) with Previous/Next.

## Drafts

Every draft (thank-you, quarterly update, lapsed nudge, follow-up, invitation) is written by AI from the donor's **notes**, gifts, next step, logged outreach and the last messages sent to them. They're marked **Drafted by AI: check before sending**. If the AI fails or takes over 12 seconds, the template is used instead.

A text draft names the number it goes to, formatted as (555) 555-1234 for US numbers.

**Template emails** at the bottom shows the standard thank-you, update, nudge and follow-up filled in for any donor. **Use this template** adds it to the drafts as written, without the AI.

## Sending

A draft opens in Gmail, Outlook or the default mail app (or Messages, for texts) with the donor, subject and body filled in, so it goes out from the board member's own address. The app then asks "Did you send it?" and logs the touch when they say yes.

## Where the code is

- `src/lib/drafts.ts`: the message templates. Invitations, updates and nudges name a real event from the calendar. They're the fallback, and the starting point the AI rewrites.
- `src/lib/ai-draft.ts`: the prompt for AI drafts (the rules, the donor's facts, notes, outreach and sent messages), and the check that throws out a reply that is empty, too long, or contains links, web or email addresses other than codingincolor.org, payment or bank words, account-like numbers or `[placeholders]`. Donor, org and event names, notes, next steps, outreach and sent messages go into the prompt on one line each with directive syntax stripped (`inert()`).
- `src/components/SendDraft.tsx`: the mail-app links and the "Did you send it?" step.
- The Worker route is `POST /api/drafts`; which model it uses and why is in [the AI model decision](../decisions/001-ai-model.md).

Tests: `drafts.test.ts`, `ai-draft.test.ts`, `reminders.test.ts`, `actions.test.ts`.
