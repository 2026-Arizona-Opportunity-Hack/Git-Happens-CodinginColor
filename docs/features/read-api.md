---
title: Read API
audience: admins, CIC's org dashboard
covers:
  - src/pages/Api.tsx
  - src/lib/api.ts
  - worker/openapi.ts
---

# Read API

`GET /api/v1/summary?period=2026-Q4[&program=][&board_member=]` gives CIC's org dashboard its totals and the 25 latest gifts and contacts, already grouped by quarter, program and board member. It returns **no donor names, emails or IDs**.

It takes an API key (`Authorization: Bearer cic_live_…`). An admin creates one on the app's **Read API** page, copies it once, and can revoke it there. D1 keeps only a SHA-256 of each key.

## API docs

An interactive reference for the whole Worker API is at [`/api/docs`](https://githappens.jurenka.software/api/docs). [Scalar](https://scalar.com) renders it from the OpenAPI spec at `/api/openapi.json`, which comes from `worker/openapi.ts`. Paste a WorkOS access token, or a read API key for `/api/v1`, to try requests.

`POST /api/import` leaves new donors unassigned; an admin assigns them on [All Donors](all-donors.md).
**When a route in `worker/index.ts` changes, update `worker/openapi.ts` in the same PR.** The spec is the API's documentation; don't describe routes by hand elsewhere.

## Where the code is

`src/lib/api.ts` holds the parts of the API that don't touch D1 or WorkOS (request-body checks, the read API's period parsing and totals), so they can be unit-tested. `worker/index.ts` calls them.

Tests: `api.test.ts`, `fuzz.test.ts`.
