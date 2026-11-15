# Git Happens — Coding in Color

Built at [ASU Fall Hackathon 2026 | Phoenix Hackathon for Nonprofits: Nov 14-15](https://www.ohack.dev/hack/fall-2026) for the public good (MIT license).

> **⚠️ This is your team's ONE repository — all code goes here.** Please don't create
> another repo (personal or org). Judges, the Team Dashboard's code-activity card,
> the public project page and the nonprofit all read **this** repo; work pushed
> anywhere else is invisible to them and won't count. Everyone on the team should be
> a collaborator here — ask an organizer in Slack if someone can't push.

| | |
|---|---|
| **Nonprofit** | [Coding in Color](https://www.ohack.dev/nonprofit/YIXYdYCoxIZC08uQ5DL3) |
| **Live site** | [githappens.jurenka.software](https://githappens.jurenka.software) (sign in as a board member; the data is fake) |
| **Problem statement** | [Donor & Funder Relationship Platform (CIC Problem 2)](https://www.ohack.dev/project/e26932c0df1b11f189a8dead68f07eb5) |
| **Team page** | [Git Happens](https://www.ohack.dev/hack/fall-2026/team/28a0f23ce05c11f1bd10deadfb009123) · [Team Dashboard](https://www.ohack.dev/hack/fall-2026/manageteam) (story, demo video, submit) |
| **Slack** | team: [#githappens](https://opportunity-hack.slack.com/app_redirect?channel=githappens) · nonprofit: [#npo-coding-in-color](https://opportunity-hack.slack.com/app_redirect?channel=npo-coding-in-color) · help: [#ask-a-mentor](https://opportunity-hack.slack.com/archives/C01E5CGDQ74) |
| **Created by** | Greg V [Staff/Mentor] |

## Final day

Start recording your demo video by **Sun Nov 15, 12:00 PM MST** — hacking ends at **Sun Nov 15, 2:00 PM MST**, and a demo you recorded with time to spare beats a feature you finished at 1:59.

- Sun Nov 15, 11:00 AM MST — Presentation Feedback Hour
- **Sun Nov 15, 12:00 PM MST — Start recording your demo video**
- Sun Nov 15, 12:30 PM MST — Judges Arrive
- **Sun Nov 15, 2:00 PM MST — 🛑 Submission Deadline: Hacking ends**
- Sun Nov 15, 2:05 PM MST — Judging Round 1
- Sun Nov 15, 3:40 PM MST — Judging Final Round
- Sun Nov 15, 4:30 PM MST — Closing Ceremony: Winners Announced

## Before hacking ends — the submission checklist

Everything is submitted from your [Team Dashboard](https://www.ohack.dev/hack/fall-2026/manageteam); judges read the dashboard, this README and your demo video.

- [x] **Code pushed** to this repo, in small PRs (see `AGENTS.md`) — judges and future recruiters read the history
- [ ] **Project story** written on the dashboard (`#project`): the problem, who it helps, what you built, what's next
- [ ] **Demo video** (4 minutes or less) on YouTube, Vimeo, Loom or Google Drive, linked on the dashboard (`#demo`) — show it working, not slides
- [ ] **Submit** on the dashboard (you can keep editing until the close)
- [x] This README filled in below: team, tech stack, how to run it, live link if you have one
- Optional: a [DevPost entry](https://opportunity-hack-2026-arizona.devpost.com/) — the dashboard is the submission of record.

Judges score **Scope, Documentation, Polish and Security**, plus a separate **Accessibility** prize — the rubric is at [ohack.dev/hackathon-judging-criteria](https://www.ohack.dev/hackathon-judging-criteria). Document your work as GitHub Issues as you go: that's how you get public credit for it.

## Team

<!-- Replace with real people; link GitHub profiles so this repo works as your portfolio -->
- [Noah Schroeder](https://github.com/n-schroeder)
- [Matthew Jurenka](https://github.com/mattjurenka)
- [Ram Bhatnagar](https://github.com/Sir-Arceebee)
- [Eleanor Lam](https://github.com/codagirlaz)

## What we built

Coding in Color's donor records are split across a spreadsheet, Zeffy and Benevity, and follow-ups depend on board members remembering them. This platform merges those sources into one deduplicated donor list, gives each board member a queue of next steps with drafted thank-yous and updates that a human approves, and shows year-over-year retention. Board members sign in with WorkOS AuthKit, and data lives in Cloudflare D1 behind a Worker API. The seed data is fake.

Each page has its own doc in [`docs/features/`](docs/features/): who uses it, what it does, edge cases and where the code is.

- **[Dashboard](docs/features/dashboard.md)**: org health, board-member load, upcoming events, recent activity
- **[Notifications](docs/features/notifications.md)**: one inbox of reminders: next steps, quarterly updates, lapsed donors, drafts, events
- **[Follow-ups](docs/features/follow-ups.md)**: next steps, quarterly touches and lapsed nudges, with AI-written drafts a human approves and sends from their own mail app
- **[My Donors](docs/features/my-donors.md)**: your donors, with CSV and Excel export
- **[All Donors](docs/features/all-donors.md)**: (admin) every donor; assign board members, filter, export
- **[Donor detail](docs/features/donor-detail.md)**: timeline, next steps, one-click event invites, debriefs and the funder packet
- **[Update Donors](docs/features/update-donors.md)**: (admin) import the spreadsheet, Zeffy and Benevity with column mapping and dedupe
- **[Retention](docs/features/retention.md)**: (admin) year-over-year retention, churn and activation patterns
- **[Assistant](docs/features/assistant.md)**: chat about your records, debriefs by voice, buttons you press to act
- **[Search](docs/features/search.md)**: pages and donors, from any page (Ctrl+K)
- **[Events calendar](docs/features/events-calendar.md)**: CIC's calendar, so invites have real dates
- **[Use sample data](docs/features/sample-data.md)**: made-up records to try the app before an import
- **[Read API](docs/features/read-api.md)**: (admin) API keys for CIC's org dashboard, plus interactive API docs
- **[Board members](docs/features/board-members.md)**: (admin) invite, change role, remove
- **[My account](docs/features/my-account.md)**: profile, password, MFA
- **[Installable app](docs/features/installable-app.md)**: install on phones and desktops; opens offline
- **[Dev tools](docs/features/dev-tools.md)**: (admin, development only) clear the donor database; remove before launch

![Dashboard](docs/screenshots/dashboard.png)

![Donors](docs/screenshots/donors.png)

### Demo accounts

Sign in with any of these. They're fake accounts, and every one uses the password **`CicDemo-2026!`**:

| Email | Role |
|---|---|
| `alex@example.org`, `diana@example.org`, `mauricio@example.org`, `dominick@example.org`, `melissa@example.org` | CIC admin: every donor, plus Import, Board members and Read API keys |
| `priya@example.org`, `jordan@example.org`, `sam@example.org`, `greg@example.org`, `genevieve@example.org`, `frank@example.org`, `landon@example.org`, `nicole@example.org`, `adrian@example.org`, `amber@example.org` | Board member: only their own donors |

The password is public on purpose because the data is fake. Replace these accounts before CIC loads real donors.

### Next steps

1. **Real exports**: get scrubbed Zeffy/Benevity samples from CIC and fix `COLUMN_MAP` in `dedupe.ts`.
2. **Sending**: drafts open pre-filled in the board member's own mail or Messages app today. Saving drafts straight into their mailbox (Gmail API / Microsoft Graph) needs per-user OAuth and, for Gmail, Google's app verification; sending from the app (Resend, Twilio) would come from CIC rather than the board member.
3. **Real calendar**: ask CIC for its Google Calendar's iCal address and set `CALENDAR_ICS_URL` (see [Events calendar](docs/operations.md#events-calendar)).
4. **Outcomes from the classroom**: once the curriculum platform (Problem 1) has its read API, add each program's students served and learning gains to funder packets and quarterly updates. (A hand-edited Program outcomes page was removed for now; its unused `program_outcomes` table is still in D1, from migration 0006.)
5. **Brand**: swap the placeholder mark in `App.tsx` for the real CIC logo, and run Lighthouse (target a11y ≥ 95).

## Security and testing

Judges score Security, so here's what checks this repo. Details and every finding are in [Security](docs/security.md#how-its-checked).

- **AI security audits in CI.** Adding a label to a PR (`ai-review`, `ai-review:kimi-k3` or `ai-review:muse-wonder`) has Claude, kimi-k3 or muse-wonder review it, and leaving the PR number empty audits the whole repo. Each report is saved in [`audits/`](audits/) through its own PR. The model gets read-only tools and no GitHub token.
- **What they found, and what we fixed.** Four audits ran on Nov 15. Two PR audits and Claude's whole-repo audit found nothing. muse-wonder's whole-repo audit found two issues:
  - Donor text could steer the AI (prompt injection). Mostly fixed in [#95](https://github.com/2026-Arizona-Opportunity-Hack/Git-Happens-CodinginColor/pull/95); the last part is [#93](https://github.com/2026-Arizona-Opportunity-Hack/Git-Happens-CodinginColor/issues/93).
  - Dev tools are switched on. That's on purpose for the demo, and listed as a gap to close before launch.
- **95% coverage gate.** Every PR runs the typecheck and unit tests, and the PR fails if tests cover under 95% of lines or functions in `src/`. Every module counts, tested or not. Coverage is about 98% today, and each P0–P2 feature in CIC's brief maps to its tests ([Testing](docs/testing.md)).
- **Fuzz tests.** Each run throws 4,500 seeded random inputs at the import pipeline, dedupe, the Excel export, the API input checks, the calendar parser, AI drafts and the assistant's buttons. The fuzz tests found two real bugs, both fixed with regression tests:
  - impossible calendar dates got through ([#84](https://github.com/2026-Arizona-Opportunity-Hack/Git-Happens-CodinginColor/pull/84))
  - characters that broke the Excel export got through ([#128](https://github.com/2026-Arizona-Opportunity-Hack/Git-Happens-CodinginColor/pull/128))
- **Access and secrets.** Ownership is checked on the server for every donor route, every query uses bound parameters, nothing is sent without a human, and a hook blocks commits that contain keys or `.env` files.

## Docs

| Doc | For |
|---|---|
| [docs/features/](docs/features/) | What each page does and where its code is |
| [Architecture](docs/architecture.md) | How the Worker, D1, WorkOS and the AI gateway fit together; the stack |
| [Operations](docs/operations.md) | Settings and secrets, deploying, sign-in setup, the calendar, resetting the demo |
| [Security](docs/security.md) | Who can see what, how keys and secrets are kept, every audit finding and its fix, known gaps |
| [Testing](docs/testing.md) | Running the tests, the coverage gate, what tests which feature |
| [Decisions](docs/decisions/) | Why it's built this way |
| [How these docs work](docs/README.md) | Where to write what, and the check that keeps docs in step with code |

Agents: start with [AGENTS.md](AGENTS.md).

## Tech stack

Vite + React + TypeScript on a Cloudflare Worker, Cloudflare D1 (SQLite), WorkOS AuthKit for sign-in, and the OHack AI gateway for drafts and the assistant. Details in [Architecture](docs/architecture.md).

## Run it locally

Needs [Nix](https://nixos.org/download) with flakes enabled. `flake.nix` pins Bun and Node, so everyone builds with the same toolchain.

```bash
git clone https://github.com/2026-Arizona-Opportunity-Hack/Git-Happens-CodinginColor.git
cd Git-Happens-CodinginColor
nix develop          # shell with bun + node; run everything below inside it
bun install
bun run db:migrate   # create the local D1 database
bun run db:seed      # load the fake demo data (re-run any time to reset)
bun dev              # http://localhost:5173, app + API
nix build            # typecheck + production build, output in ./result
bun run test         # unit tests for src/lib, failing under 95% coverage (docs/testing.md)
```

`nix build` installs dependencies from `bun.lock` in a sandbox, checked against a hash in `flake.nix`. After changing dependencies, set that hash (`x86_64-linux = "…"`) to `""`, run `nix build`, and paste the `got:` hash it prints. Other platforms need their own hash added the same way.

`bun dev` runs the Worker and a local D1 database inside Vite, through `@cloudflare/vite-plugin`. Both the Worker and `bun run db:seed` need the WorkOS Staging secret key, so copy `.env.example` to `.env` and set `WORKOS_API_KEY` before running them. The assistant also needs `AI_API_KEY`, the OHack AI gateway key from your team card; without it everything else works and the chat says it's unavailable. In production it's a Worker secret (`bunx wrangler secret put AI_API_KEY`). `.env` is gitignored.

## Links

- Live demo: [https://githappens.jurenka.software](https://githappens.jurenka.software)
- Demo video:
- Docs: [https://githappens.jurenka.software/api/docs](https://githappens.jurenka.software/api/docs)

## After the hackathon

Winning teams finish the project with the nonprofit — the [Definition of Done](https://www.ohack.dev/about/completion) (deployed, nonprofit sign-off, docs, open source) is tracked on your team page. Keep the repo public and the README honest; recruiters do read these.

Need a hand this weekend? [#ask-a-mentor](https://opportunity-hack.slack.com/archives/C01E5CGDQ74) on Slack, or ask in [#githappens](https://opportunity-hack.slack.com/app_redirect?channel=githappens) and a mentor will drop in.
