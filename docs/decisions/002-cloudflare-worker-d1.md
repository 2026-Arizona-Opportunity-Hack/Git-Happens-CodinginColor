---
title: Cloudflare Worker and D1 for the app, API and database
status: accepted
date: 2026-11-14
covers:
  - wrangler.jsonc
  - migrations/
---

# 002: Cloudflare Worker and D1 for the app, API and database

## Context
CIC has no developer on staff, so whatever we pick, they have to keep it running and paid for after the weekend. We needed somewhere to host the React app, a JSON API and the donor database. The options were a hosted backend (Supabase, Firebase), a frontend host plus a separate database (Vercel with Postgres), or a Cloudflare Worker with D1.

## Decision
One Cloudflare Worker serves the app and the `/api/*` routes, and donor data lives in Cloudflare D1 (SQLite). We picked it because:

- **Cost.** The Workers free tier and D1 keep CIC's bill near $0, and about $5/month on Workers Paid (see [001](001-ai-model.md)).
- **One deploy, one service.** The app, API and database deploy together from `wrangler.jsonc`. CIC has no second vendor to manage.
- **We already knew it.** The team had used Workers before, and the `jurenka.software` zone was already on Cloudflare, so the weekend went on features, not setup.
- **Donor data stays in one account.** The app, the database and, later, Workers AI (see [001](001-ai-model.md)) all live on the same Cloudflare account.

## Consequences
- D1 is SQLite: there's no row-level security, so the Worker checks access on every query (see [security](../security.md)). Schema changes are numbered files in `migrations/` that deploys apply first.
- D1 can't hold users, so sign-in and board membership live in WorkOS (see [003](003-workos-board.md)).
- We'd revisit this if CIC outgrows D1's limits (10 GB per database), or if they move to a platform that someone on their staff already runs.
