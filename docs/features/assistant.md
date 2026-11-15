---
title: Assistant
audience: everyone
covers:
  - src/components/ChatWidget.tsx
  - src/components/ChatMarkdown.tsx
  - src/lib/actions.ts
---

# Assistant

It answers questions about the records you can see, with donor cards, tables and links.

## Where it appears

- **Wide screens:** a column docked to the right of every page, open to start with. × slides it shut and the tab on the right edge slides it back; the browser remembers which.
- **Smaller screens:** a chat bubble opens it full screen. Close it with × or Esc.

## It can't change anything itself

It offers buttons (log contact, set a next step, draft, approve or discard a draft, and reassign for admins), and nothing happens until you press one; each ends in a green **Apply** tag so it reads as a button. The model only proposes the arguments: `src/lib/actions.ts` checks them against what you can see and writes each button's label itself, so a reply can't offer a button for a donor or draft you can't see.

Donor records come from imports, so every string in them reaches the model on one line, without `::` directive syntax or `<`/`>` (`inert()` in `src/lib/ai-draft.ts`). Planted text can't start a directive line or close the data block. A draft body the assistant writes is only offered if it has no web or email address, payment words or account-like numbers.

Raw HTML, images and outside links in replies are never rendered (`src/components/ChatMarkdown.tsx`).

## Debriefs

Describe a conversation with a donor, for example "not ready to give, still learning the mission". The Debrief button on a [donor page](donor-detail.md) starts one. The assistant offers three buttons:

1. log the conversation;
2. a dated next step: when they aren't ready to give, "Invite to <event>" for one of the events the donor page offers (the next three), due a week before it;
3. a follow-up it wrote from what you said (inviting them, if the step is an invite), saved as a draft you approve in [Follow-ups](follow-ups.md).

That next step drafts nothing, unlike the donor page's one-click invite, so one conversation makes one draft. The donor page's Next step box updates as soon as the button is pressed.

## Dictation

In Chrome, Edge and Safari a microphone button dictates into the message box using the browser's own speech recognition. Chrome sends the audio to Google to transcribe. You read and fix the text before sending. Firefox has no built-in recognizer, so the button doesn't appear there.

## Data and model

`POST /api/chat` sends the AI gateway the caller's own scoped records (the same data `/api/bootstrap` returns) along with the conversation, plus the lists the pages compute for today (`computedLists` in `worker/index.ts`): overdue next steps, quarterly updates due, who lapsed and who gave less this year (as on Retention), and the events a donor can be invited to. That's how "Who is overdue for a touch?" and "Who lapsed this year?" get answered. Fixed instructions go first and the per-day lists last, so the gateway can cache the rest. The records include donor names, emails and gifts. Which model it uses, and what a real deployment should use, is in [the AI model decision](../decisions/001-ai-model.md).

Tests: `actions.test.ts`.
