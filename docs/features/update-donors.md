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

Upload the spreadsheet, Zeffy and Benevity CSVs, then map their columns in a staging popup.

## Mapping columns

- **Mapped fields** shows each file column and the donor-database column it goes to. You can change any of them.
- **Unmapped columns** default to *Do not save*. Set one to any database column no other column uses, or to **Create a new column** with a name you type. That makes a custom field shown on the [donor page](donor-detail.md).
- The popup totals the gifts it will record.

## Gifts and dates

- Gifts without a usable date are still saved, with the date unknown. They count toward lifetime giving but not toward any year's totals (Raised YTD, retention), and the popup says how many there are.
- Only gifts whose amount can't be read are skipped.
- Dates like `2026-11-14`, `11/14/2026` and `Nov 14, 2026` are all read.

## After saving

A **New Donors** popup lists donors that weren't in the database. Selected ones open on [All Donors](all-donors.md) with the board member with the fewest donors suggested.

Each source shows when it was last imported (stale after 30 days), plus an import history.

## Dedupe

`src/lib/dedupe.ts` parses the CSV, maps each source's columns, then merges donors with union-find on email, then phone, then name+organization, then name. Name-only matches are flagged for review.

Gifts are deduped too. For one donor, the same amount within 3 days of a gift already recorded (or already in this import) is skipped, so re-imports and a donation reported by two sources count once. The preview lists every skipped gift.

**To do:** get scrubbed Zeffy and Benevity samples from CIC and fix `COLUMN_MAP` in `dedupe.ts`. The column names in `src/data/samples.ts` are guesses.

Tests: `dedupe.test.ts`, `fuzz.test.ts`.
