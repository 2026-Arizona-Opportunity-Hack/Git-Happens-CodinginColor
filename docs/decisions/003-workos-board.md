---
title: WorkOS is the source of truth for the board
status: accepted
date: 2026-11-14
covers:
  - src/pages/Members.tsx
  - migrations/0002_members_in_workos.sql
---

# 003: WorkOS is the source of truth for the board

## Context
Board members need to sign in, and admins need to add and remove them. We could have kept a users table in D1 and built sign-in ourselves, or used a hosted provider such as Clerk, Auth0, Supabase Auth or WorkOS AuthKit.

## Decision
We sign people in with WorkOS AuthKit, and WorkOS's "Coding in Color" organization is the list of who is on the board and their role. D1 doesn't keep a users table: it stores donor data keyed by WorkOS user ID (migration `0002_members_in_workos.sql` removed the one we had). We picked WorkOS because:

- **It's free up to 1M users**, so CIC never pays for it.
- **Sign-in, MFA and password reset come with it**, and we built none of them.
- **The Users Management widget is the Board members page.** Admins invite people, change roles and remove them with no custom UI.
- **There's no users table to keep in sync.** Board membership lives in one place, and the Worker looks the caller up there on each request.

## Consequences
- Every request depends on WorkOS. The Worker caches the member list for 60 seconds, so a change takes up to a minute to show up.
- Someone who signs in but isn't in the organization gets a 403.
- Without a custom domain, AuthKit has to run in devMode (see [005](005-authkit-devmode.md)).
- We'd revisit this if WorkOS's pricing for this use changed, or if CIC standardized on another identity provider.
