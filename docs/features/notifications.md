---
title: Notifications
audience: everyone
covers:
  - src/pages/Notifications.tsx
  - src/lib/reminders.ts
---

# Notifications

One inbox of reminders. The nav badge counts only the ones that need action now (overdue and due), so the page's subtitle splits the total the same way: "6 need action · 2 coming up".

- Overdue and upcoming next steps
- Quarterly updates due
- Lapsed donors
- Drafts waiting for approval (admins also get drafts on unassigned donors, so the count matches Follow-ups). A draft whose donor has no email or phone for its channel asks for that detail, or for a discard, instead of an approval it can't get. A thank-you with no gift in the last 60 days (the same window the donor page uses) asks to be discarded.
- Events in the next 3 weeks, with how many donors have a next step tied to each (admins count every donor, unassigned included; board members count their own)
- (admins) exports not re-imported in 30 days, and unassigned donors

Donor reminders cover only the donors assigned to you, admins included. Admins also get the org-wide ones (stale exports, unassigned donors).

Each section shows 10 reminders at a time, with Previous/Next once there are more.

The same count, worked out for each board member, is the **Pending tasks** column on [Board members](board-members.md) (`pendingTasks()`): their own overdue and due reminders, without the admin-wide ones.

## How it works

Reminders are computed from the current data in `src/lib/reminders.ts` and never stored, so a reminder clears as soon as the work is done. The thresholds are constants at the top of that file and in `src/data/sources.ts`.

Tests: `reminders.test.ts`.
