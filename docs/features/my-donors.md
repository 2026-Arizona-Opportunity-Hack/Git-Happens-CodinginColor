---
title: My Donors
audience: everyone
covers:
  - src/pages/Donors.tsx
  - src/lib/export.ts
  - src/lib/xlsx.ts
  - src/lib/donor-columns.ts
---

# My Donors

The donors assigned to the signed-in person. Admins have one too, since they can be assigned donors. Each row shows lifetime giving, status and next step.

**Filters** come from the column headers, as in Excel: the funnel on Donor (name, organization or email), Last gift (a gift in a date range), Status, Next step (overdue, due in 7 days, later, none) and Sources. Active filters show as removable chips above the table, and exports follow them.

**Export CSV** and **Export Excel** (.xlsx) download them with every column: contact details, board member, giving totals, status, next step and custom fields.

## Where the code is

- `src/lib/donor-columns.ts`: the header filters, shared with [All Donors](all-donors.md).
- `src/lib/export.ts`: the export columns, shared with [All Donors](all-donors.md).
- `src/lib/xlsx.ts`: a minimal .xlsx writer. It writes the zip uncompressed, so it needs no library. It drops the characters XML can't hold (control characters, U+FFFE and U+FFFF) so a stray one in an imported cell can't make Excel refuse the file.

Tests: `export.test.ts`, `fuzz.test.ts` (export then re-import, and the Excel file is valid XML whatever the cells hold).
