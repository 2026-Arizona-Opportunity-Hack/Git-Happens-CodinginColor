---
title: Dev tools
audience: admins, development only
covers:
  - src/pages/DevTools.tsx
---

# Dev tools (admin, development only)

**Clear donor database** (type DELETE to confirm) deletes all donors, gifts, contacts, drafts and import history, so imports can be tested from scratch.

Shown only while `DEV_TOOLS` is `"true"` in `wrangler.jsonc`.

**Remove before launch:** `src/pages/DevTools.tsx`, its nav entry and route in `App.tsx`, `/api/dev/clear-donors` in `worker/index.ts`, and `DEV_TOOLS`.
