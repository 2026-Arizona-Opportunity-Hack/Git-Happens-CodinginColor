---
title: AuthKit runs in devMode, with the session in localStorage
status: superseded by 006
date: 2026-11-14
---

# 005: AuthKit runs in devMode, with the session in localStorage

Superseded by [006](006-session-cookie.md): the Worker now runs sign-in and keeps the session in an HttpOnly cookie.

## Context
AuthKit keeps its session in an HttpOnly cookie only when it's served from a WorkOS custom domain on the app's own domain. A custom domain costs $99/month, which is more than the rest of CIC's bill put together (see [001](001-ai-model.md)).

## Decision
AuthKit runs in `devMode`, which keeps the session in localStorage and needs no custom domain.

## Consequences
- Any script that runs on the page can read the session, so a cross-site scripting bug would leak it. This is known gap 4 in [security](../security.md).
- We'd revisit this once CIC can pay for a custom domain. Then we'd turn off devMode and the session would move into an HttpOnly cookie.
- A free alternative is planned: the Worker runs the sign-in and sets the cookie on our own domain, so no custom domain is needed ([#179](https://github.com/2026-Arizona-Opportunity-Hack/Git-Happens-CodinginColor/issues/179)). When that lands, a new decision supersedes this one.
