---
title: The Worker runs sign-in and keeps the session in an HttpOnly cookie
status: accepted
date: 2026-11-15
supersedes: 005
covers:
  - worker/auth.ts
  - src/auth.tsx
---

# 006: The Worker runs sign-in and keeps the session in an HttpOnly cookie

Supersedes [005](005-authkit-devmode.md).

## Context
AuthKit's browser SDK kept the session, including the long-lived refresh token, in localStorage, where any script on the page can read it. Moving it to a cookie through that SDK needs a WorkOS custom domain at $99/month. The custom domain is only needed because the browser signs in directly with WorkOS. When a server does the sign-in, the cookie is on our own domain for free, which is how WorkOS's server-side SDKs work ([#179](https://github.com/2026-Arizona-Opportunity-Hack/Git-Happens-CodinginColor/issues/179)).

## Decision
The Worker runs the AuthKit code flow (`worker/auth.ts`). `/auth/callback` exchanges the code with `WORKOS_API_KEY`, then seals the access and refresh tokens with `jose` (A256GCM, keyed by the `WORKOS_COOKIE_PASSWORD` secret) into the cookie `cic_session` (`HttpOnly; Secure; SameSite=Lax`, 30 days). The page calls `GET /auth/token` for a short-lived access token, which it keeps in memory and sends as a Bearer header, as before. When that token is within a minute of expiring, the Worker refreshes it and rewrites the cookie.

## Consequences
- Nothing about the session is in localStorage, and no script can read the refresh token. A cross-site scripting bug could still use the session while the page is open, but it can't take the session away with it.
- `/api/*` still takes the access token as a Bearer header, so it can't be forged cross-site (CSRF). `/auth/logout` also checks `Origin`. Sign-in carries a nonce in the OAuth `state`, matched against a 10-minute cookie, so nobody can finish a sign-in they started for someone else.
- The Account widgets keep using the user's access token. The Members widget keeps its own widget token from `/api/widget-token`.
- A new Worker secret, `WORKOS_COOKIE_PASSWORD`. Changing it signs everyone out. Each host needs `<origin>/auth/callback` in the WorkOS redirect URIs.
- `@workos-inc/authkit-react` is gone; `src/auth.tsx` is a 70-line replacement.
