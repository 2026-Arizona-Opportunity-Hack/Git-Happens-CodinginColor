---
title: Testing
covers:
  - scripts/check-coverage.ts
  - .github/workflows/test.yml
  - src/lib/all-modules.test.ts
  - src/lib/fuzz.test.ts
---

# Testing

`bun run test` runs the unit tests in `src/lib/*.test.ts` and prints a coverage table. It then fails with `error: lines coverage is …%, under the 95% minimum` if the tests cover under 95% of the lines or functions in `src/` (`scripts/check-coverage.ts`). The **Tests** workflow runs it on every pull request and marks the PR red with that error. Every module in `src/lib` counts, tested or not (`all-modules.test.ts` loads them all), so new logic needs tests from the start. The Worker's checks and read API totals are in `src/lib/api.ts` for the same reason.

What tests each feature of [CIC's brief](https://docs.google.com/document/d/1sdlQDji23jA0LFoYbzNVHCkeG0ICE9XRQSr3xh3ntMU/edit) (Problem 2):

| Priority | Feature | Tests |
|---|---|---|
| P0 | Import spreadsheet, Zeffy and Benevity; dedupe across sources | `dedupe.test.ts` |
| P0 | Donor timeline of gifts and contacts | `logic.test.ts` |
| P0 | Board-member owner, new donors to the member with the fewest | `logic.test.ts` |
| P0 | Next steps with due dates; quarterly touch to every donor | `reminders.test.ts`, `logic.test.ts` |
| P0 | Retention year over year, churn and activation patterns | `logic.test.ts` |
| P0 | Templated thank-you, human approves every send | `drafts.test.ts`, `reminders.test.ts`, `actions.test.ts` |
| P0 | One-click funder export | `packet.test.ts`, `export.test.ts` |
| P0 | Key-authenticated read API aggregated by period, program and board member; input checks | `api.test.ts` |
| P1 | Debrief to action | `actions.test.ts` |
| P1 | Events-aware next steps (CIC's calendar) | `ical.test.ts`, `logic.test.ts`, `reminders.test.ts`, `actions.test.ts` |
| P1 | AI-drafted updates from gifts and giving history | `ai-draft.test.ts`, `drafts.test.ts` |
| P1 | Lapsed-donor radar and nudge | `reminders.test.ts`, `drafts.test.ts` |
| P2 | Natural-language donor questions (the assistant's buttons) | `actions.test.ts` |

Not built yet, so not tested: meeting notes in (P1, #29), the grant deadline tracker (P1, #30), the donor impact feed (P2, #31) and likelihood-to-give scoring (P2, #32). The tests cover logic, not pages: the React components and the Worker's D1 and WorkOS calls have no tests yet.

`fuzz.test.ts` throws a few hundred random inputs at the parsers and checks, from a fixed seed, so a failure is repeatable. It covers CSV export then re-import, an uploaded file end to end (column mapping, names, amounts, dates and the gift warnings), gift dedupe (importing the same file twice adds nothing), matching rows to existing donors, dedupe, a valid Excel file whatever the cells hold, the API input checks and totals, calendar feeds, AI drafts and the assistant's buttons. A failure prints its seed; rerun it with `FUZZ_SEED=<seed> bun test src/lib/fuzz.test.ts`, or try new inputs with any other seed.
