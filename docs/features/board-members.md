---
title: Board members
audience: admins
covers:
  - src/pages/Members.tsx
  - src/components/widgets.tsx
---

# Board members (admin)

**Donors and pending tasks**, at the top, lists each board member with how many donors they look after (sortable, most first) and their **pending tasks**: what their own Notifications page lists as overdue or due (next steps, quarterly updates, lapsed donors, drafts to approve), with the overdue ones called out. Admin-wide tasks such as unassigned donors and stale imports count toward no one. Under the table it says how many donors are unassigned or still assigned to someone who has left the board. Assignments are changed on [All Donors](all-donors.md).

Below it, invite board members by email, change their role, or remove them. That part is WorkOS's [Users Management widget](https://workos.com/docs/widgets/user-management), whose columns we can't change, which is why the donor counts are a table of their own.

- **Admin** sees every donor and can import.
- **Member** sees only their own donors.

WorkOS is the source of truth for who is on the board; see [Operations](../operations.md#sign-in-workos) for how it's set up. The Worker caches the member list for 60 seconds, so changes show up within a minute.

`src/components/widgets.tsx` is the shared root for WorkOS widgets, themed to the CIC brand. The Worker mints the widget's token at `POST /api/widget-token`.
