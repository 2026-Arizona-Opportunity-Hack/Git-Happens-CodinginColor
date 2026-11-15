---
title: Retention
audience: admins
covers:
  - src/pages/Retention.tsx
---

# Retention (admin)

Year over year or quarter over quarter, with tabs back to the first period that has gifts, opening on the latest one that does: new, recovered, increased, same, decreased and lapsed donors, plus the retention rate.

Each donor list shows 10 at a time, with Previous/Next once there are more.

**Patterns** below show churn and activation:

- donors grouped by the year (or quarter) of their first gift, with the share who gave again in each period after;
- the lapse rate by source (Zeffy, Benevity…) and by program.

With no gifts yet, the page links to Import.

Gifts with an unknown date count toward lifetime giving but not toward any period, so they don't appear here.

The classification and the patterns are in `src/lib/logic.ts`. Tests: `logic.test.ts`.
