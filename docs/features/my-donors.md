---
title: My Donors
audience: everyone
covers:
  - src/pages/Donors.tsx
  - src/lib/export.ts
  - src/lib/xlsx.ts
---

# My Donors

The donors assigned to the signed-in person. Admins have one too, since they can be assigned donors. Each row shows lifetime giving, status and next step.

**Export CSV** and **Export Excel** (.xlsx) download them with every column: contact details, board member, giving totals, status, next step and custom fields.

## Where the code is

- `src/lib/export.ts`: the export columns, shared with [All Donors](all-donors.md).
- `src/lib/xlsx.ts`: a minimal .xlsx writer. It writes the zip uncompressed, so it needs no library.

Tests: `export.test.ts`, `fuzz.test.ts` (export then re-import).
