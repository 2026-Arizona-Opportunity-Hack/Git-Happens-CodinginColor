---
title: Donor detail
audience: everyone
covers:
  - src/pages/DonorDetail.tsx
  - src/lib/packet.ts
---

# Donor detail

One donor's page:

- **Notes:** free text about the donor, under Giving by year. It saves as you type (a second after you stop, or when you leave the box), and the AI reads it when it writes their [drafts](follow-ups.md). Notes can also be imported from a Notes column on [Update Donors](update-donors.md).
- **Timeline** of gifts and communications.
- **Next step:** set one, add it to Google Calendar, or invite the donor to one of the next three events in **one click**. The box follows the saved step, so it updates when an assistant button changes it. That sets the next step "Invite to <event>", due a week before it, plus a draft invitation to approve in [Follow-ups](follow-ups.md).
- **Log** a text, email or call.
- **Draft** a thank-you or update.
- **Debrief** opens the [assistant](assistant.md) to describe a conversation with the donor, typed or dictated.
- **One-click funder packet:** a Markdown file with lifetime giving, totals by year and by program and every gift, ready to paste into a renewal.
- **Custom fields** created on [Update Donors](update-donors.md).

`src/lib/packet.ts` builds the packet and the per-program giving totals.

Tests: `packet.test.ts`, `logic.test.ts`.
