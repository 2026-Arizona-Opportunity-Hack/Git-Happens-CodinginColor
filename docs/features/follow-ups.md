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

## Drafts

Thank-yous, quarterly updates and lapsed nudges are written by AI from the donor's gifts and the outcomes of the programs they funded (see [Program outcomes](program-outcomes.md)). They're marked **Drafted by AI: check before sending**. If the AI fails or takes over 12 seconds, the template is used instead.

## Sending

A draft opens in Gmail, Outlook or the default mail app (or Messages, for texts) with the donor, subject and body filled in, so it goes out from the board member's own address. The app then asks "Did you send it?" and logs the touch when they say yes.

## Where the code is

- `src/lib/drafts.ts`: the message templates. Invitations, updates and nudges name a real event from the calendar. They're the fallback, and the starting point the AI rewrites.
- `src/lib/ai-draft.ts`: the prompt for AI drafts (which kinds, the rules, the donor's facts), and the check that throws out a reply that is empty, too long, or contains links or `[placeholders]`.
- `src/components/SendDraft.tsx`: the mail-app links and the "Did you send it?" step.
- The Worker route is `POST /api/drafts`; which model it uses and why is in [the AI model decision](../decisions/001-ai-model.md).

Tests: `drafts.test.ts`, `ai-draft.test.ts`, `reminders.test.ts`, `actions.test.ts`.
