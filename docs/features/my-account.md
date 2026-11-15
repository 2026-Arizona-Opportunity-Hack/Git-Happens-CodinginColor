---
title: My account
audience: everyone
covers:
  - src/pages/Account.tsx
---

# My account

Each user edits their profile, changes their password, sets up MFA and signs out other devices. These are WorkOS widgets (see `src/components/widgets.tsx`).

The widgets take the signed-in user's short-lived access token from `useAuth()` in `src/auth.tsx`, which the Worker hands out from `/auth/token`. The session itself stays in an HttpOnly cookie ([decision 006](../decisions/006-session-cookie.md)).
