---
title: Events calendar
audience: everyone
covers:
  - src/lib/ical.ts
  - public/demo-calendar.ics
---

# Events calendar

Upcoming events come from CIC's calendar through its iCal address (`CALENDAR_ICS_URL`). The Worker reads it at most every 10 minutes and keeps the next 400 days of events in D1, so "Invite to <event>" on the [donor page](donor-detail.md) always has a real date. Cancelled events are left out.

Once `CALENDAR_ICS_URL` is set, the calendar is the whole list: an event taken off it disappears from the app, and next steps linked to it keep their text and due date. If the address can't be read, the app keeps the events it already has (`wrangler tail` shows `calendar sync failed`).

Until CIC shares its address, it reads the demo calendar in `public/demo-calendar.ics`, which has placeholder dates. Switching to CIC's own calendar is in [the README](../../README.md#events-calendar).

Tests: `ical.test.ts`, `logic.test.ts`, `reminders.test.ts`, `actions.test.ts`.
