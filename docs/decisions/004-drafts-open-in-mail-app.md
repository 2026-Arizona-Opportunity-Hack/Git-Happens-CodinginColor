---
title: Drafts open in the board member's own mail app
status: accepted
date: 2026-11-14
covers:
  - src/components/SendDraft.tsx
---

# 004: Drafts open in the board member's own mail app

## Context
The app writes thank-yous and updates, and a human approves each one. Then it has to reach the donor. The options:

- **Open a pre-filled draft** in the board member's own mail or Messages app (`mailto:` / `sms:` links).
- **Save the draft into their mailbox** through the Gmail API or Microsoft Graph. This needs per-user OAuth, and Gmail also needs Google's app verification.
- **Send from the app** with Resend or Twilio. The message would then come from CIC, not from the board member.

## Decision
Drafts open pre-filled in the board member's own mail or Messages app. They review it and send it themselves, so the donor gets a message from someone they know, and we needed no OAuth, app verification or sending service.

## Consequences
- The app can't confirm that a message was sent. The board member marks the step done.
- Board members can't send in bulk. Each message is a deliberate, personal send.
- We'd revisit this if CIC wants drafts saved in their mailbox, which means the Gmail/Graph OAuth work, or wants mail sent from a CIC address (README Next steps #2).
