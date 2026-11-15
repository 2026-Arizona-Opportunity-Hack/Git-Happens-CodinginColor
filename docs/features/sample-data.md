---
title: Use sample data
audience: everyone
covers:
  - src/data/sample-data.ts
  - src/data/seed.ts
---

# Use sample data

A switch at the bottom of the sidebar swaps every donor, gift, contact and event for made-up ones, shared out among the real board members. That way the app can be shown or tried before an import.

- A banner on each page says sample data is on.
- The setting is kept per browser and follows you across tabs.
- Nothing is saved: changes say "view-only" instead of reaching the server.
- The [assistant](assistant.md) reads the real records on the server, so it asks you to switch sample data off.
- Board members, My account and Read API always show real data.

## Where the code is

- `src/data/sample-data.ts`: the sample set, the seed donors plus the Retention samples, handed out round-robin to the real board members.
- `src/data/seed.ts`: the fake donors. `bun run db:seed` loads the same data into the local database. **Never commit real donor PII.**
