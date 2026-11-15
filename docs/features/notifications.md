---
title: Notifications
audience: everyone
covers:
  - src/pages/Notifications.tsx
  - src/lib/reminders.ts
---

# Notifications

One inbox of reminders. The nav shows how many there are.

- Overdue and upcoming next steps
- Quarterly updates due
- Lapsed donors
- Drafts waiting for approval
- Events in the next 3 weeks
- (admins) exports not re-imported in 30 days, and unassigned donors

Donor reminders cover only the donors assigned to you, admins included. Admins also get the org-wide ones (stale exports, unassigned donors).

## How it works

Reminders are computed from the current data in `src/lib/reminders.ts` and never stored, so a reminder clears as soon as the work is done. The thresholds are constants at the top of that file and in `src/data/sources.ts`.

Tests: `reminders.test.ts`.
