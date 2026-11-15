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

It offers buttons (log contact, set a next step, draft, approve or discard a draft, and reassign for admins), and nothing happens until you press one. The model only proposes the arguments: `src/lib/actions.ts` checks them against what you can see and writes each button's label itself, so a reply can't offer a button for a donor or draft you can't see.

Raw HTML, images and outside links in replies are never rendered (`src/components/ChatMarkdown.tsx`).

## Debriefs

Describe a conversation with a donor, for example "not ready to give, still learning the mission". The Debrief button on a [donor page](donor-detail.md) starts one. The assistant offers three buttons:

1. log the conversation;
2. a dated next step (an invite to the next fitting event when they aren't ready to give);
3. a follow-up it wrote from what you said, saved as a draft you approve in [Follow-ups](follow-ups.md).

## Dictation

In Chrome, Edge and Safari a microphone button dictates into the message box using the browser's own speech recognition. Chrome sends the audio to Google to transcribe. You read and fix the text before sending. Firefox has no built-in recognizer, so the button doesn't appear there.

## Data and model

`POST /api/chat` sends the AI gateway the caller's own scoped records (the same data `/api/bootstrap` returns) along with the conversation. That includes donor names, emails and gifts. Which model it uses, and what a real deployment should use, is in [the AI model decision](../decisions/001-ai-model.md).

Tests: `actions.test.ts`.
