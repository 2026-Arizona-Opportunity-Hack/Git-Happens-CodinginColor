---
title: Board members
audience: admins
covers:
  - src/pages/Members.tsx
  - src/components/widgets.tsx
---

# Board members (admin)

Invite board members by email, change their role, or remove them. The page is WorkOS's [Users Management widget](https://workos.com/docs/widgets/user-management).

- **Admin** sees every donor and can import.
- **Member** sees only their own donors.

WorkOS is the source of truth for who is on the board; see [the README](../../README.md#sign-in-workos) for how it's set up. The Worker caches the member list for 60 seconds, so changes show up within a minute.

`src/components/widgets.tsx` is the shared root for WorkOS widgets, themed to the CIC brand. The Worker mints the widget's token at `POST /api/widget-token`.
