---
title: Update Donors (import)
audience: admins
covers:
  - src/pages/Import.tsx
  - src/lib/dedupe.ts
  - src/data/samples.ts
  - src/data/sources.ts
---

# Update Donors (admin)

Choosing a spreadsheet, Zeffy or Benevity CSV opens the review popup straight away to map its columns. **Review and map columns** reopens it after Back.

## Mapping columns

- **Mapped fields** shows each file column and the donor-database column it goes to. You can change any of them.
- **Unmapped columns** default to *Do not save*. Set one to any database column no other column uses, or to **Create a new column** with a name you type. That makes a custom field shown on the [donor page](donor-detail.md).
- The popup sums it up, e.g. *320 gifts totaling $54,479. 87 new donors, 0 already in the database.*
- A file's **Notes** column maps to the donor's [notes](donor-detail.md). A re-import adds only lines not already there.

## Gifts and dates

- Gifts without a usable date are still saved, with the date unknown. They count toward lifetime giving but not toward any year's totals (Raised YTD, retention), and the popup says how many there are.
- Only gifts whose amount can't be read are skipped.
- Dates like `2026-11-14`, `11/14/2026`, `11/14/2026, 3:04 PM`, `Nov 14, 2026`, `14-Nov-2026` and Excel date numbers are all read, and export headers such as Zeffy's *Payment Date (America/Phoenix)* or Benevity's *Total Donation to be Acknowledged* are mapped automatically.
- Importing a file again once its dates are read gives saved undated gifts their dates instead of adding them twice.

## After saving

A **New Donors** popup lists donors that weren't in the database, 10 per page. Selected ones open on [All Donors](all-donors.md) with the board member with the fewest donors suggested.

Each source shows when it was last imported (stale after 30 days), plus an import history.

## Dedupe

`src/lib/dedupe.ts` parses the CSV, maps each source's columns, then merges donors with union-find on email, then phone, then name+organization, then name. Name-only matches are flagged for review.

Gifts are deduped too. For one donor, the same amount within 3 days of a gift already recorded (or already in this import) is skipped, so re-imports and a donation reported by two sources count once. The preview lists every skipped gift.

**To do:** get scrubbed Zeffy and Benevity samples from CIC and fix `COLUMN_MAP` in `dedupe.ts`. The column names in `src/data/samples.ts` are guesses.

Tests: `dedupe.test.ts`, `fuzz.test.ts`.
