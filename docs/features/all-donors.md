---
title: All Donors
audience: admins
covers:
  - src/pages/AllDonors.tsx
---

# All Donors (admin)

Every donor, with contact details and their board member. US phone numbers show as (555) 555-1234 whatever format the import used.

- **Assigning:** pick board members in any rows (changed rows turn amber and say *Not saved yet*), then click **Save** (bottom right). Nothing is saved before that.
- **Suggest assignment**, beside the Unassigned donors heading, fills in a board member for each unassigned donor the filters show (whoever has the fewest, counting unsaved choices). Check them, then Save. Until then each board member in the open dropdown list reads like "Jordan (4 + 3 unsaved)", so you can see the load even out before saving; the closed dropdown shows just the name, so the column fits beside the assistant. Emails in the Contact column wrap after the @, not mid-word.
- Donor, contact and source cells wrap, so the Board member column stays on screen with the assistant docked beside the page; at narrower widths the table scrolls sideways.
- **New donors** picked in the New Donors popup on [Update Donors](update-donors.md) sit at the bottom marked *New*, with a suggested board member filled in (the one with the fewest donors).
- **Unassigned donors** are in their own section below.
- **Filters** from the column headers, as on [My Donors](my-donors.md): Donor, Contact, Last gift date range, Sources and Board member, applied to both sections.
- **Export CSV** / **Export Excel** download the filtered donors with every column (same columns as [My Donors](my-donors.md)).

The suggested board member comes from `src/lib/logic.ts`, which spreads a batch of new donors across the board. A donor with no board member has `ownerId: null`; D1 stores that as `owner_id = ''` because the column is `NOT NULL`.
