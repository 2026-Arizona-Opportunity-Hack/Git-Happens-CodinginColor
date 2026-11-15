---
title: All Donors
audience: admins
covers:
  - src/pages/AllDonors.tsx
---

# All Donors (admin)

Every donor, with contact details and their board member.

- **Assigning:** pick a board member in a row and click **Update**, or change several and click **Update all** (bottom right). Nothing is saved before that.
- **New donors** picked in the New Donors popup on [Update Donors](update-donors.md) sit at the bottom marked *New*, with a suggested board member filled in (the one with the fewest donors).
- **Unassigned donors** are in their own section below.
- **Filters:** name, organization or email; donation date range (donors with a gift in it); board member.
- **Export CSV** / **Export Excel** download the filtered donors with every column (same columns as [My Donors](my-donors.md)).

The suggested board member comes from `src/lib/logic.ts`, which spreads a batch of new donors across the board. A donor with no board member has `ownerId: null`; D1 stores that as `owner_id = ''` because the column is `NOT NULL`.
