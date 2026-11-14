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

- [ ] **Code pushed** to this repo, in small PRs (see `AGENTS.md`) — judges and future recruiters read the history
- [ ] **Project story** written on the dashboard (`#project`): the problem, who it helps, what you built, what's next
- [ ] **Demo video** (4 minutes or less) on YouTube, Vimeo, Loom or Google Drive, linked on the dashboard (`#demo`) — show it working, not slides
- [ ] **Submit** on the dashboard (you can keep editing until the close)
- [ ] This README filled in below: team, tech stack, how to run it, live link if you have one
- Optional: a [DevPost entry](https://opportunity-hack-2026-arizona.devpost.com/) — the dashboard is the submission of record.

Judges score **Scope, Documentation, Polish and Security**, plus a separate **Accessibility** prize — the rubric is at [ohack.dev/hackathon-judging-criteria](https://www.ohack.dev/hackathon-judging-criteria). Document your work as GitHub Issues as you go: that's how you get public credit for it.

## Team

<!-- Replace with real people; link GitHub profiles so this repo works as your portfolio -->
- [Name](https://github.com/username) — role
- [Name](https://github.com/username) — role

## What we built

Coding in Color's donor records are split across a spreadsheet, Zeffy and Benevity, and follow-ups depend on board members remembering them. This platform merges those sources into one deduplicated donor list, gives each board member a queue of next steps with drafted thank-yous and updates that a human approves, and shows year-over-year retention. Board members sign in with WorkOS AuthKit, and data lives in Cloudflare D1 behind a Worker API. The seed data is fake.

| Page | Brief requirement (P0) |
|---|---|
| **Dashboard** | Org health; board-member load; upcoming events; recent activity |
| **Follow-ups** | Next steps with due dates; quarterly-touch queue; lapsed-donor nudges; **drafts a human must approve** |
| **Donors** | One deduped table across all sources; owner, lifetime, status, next step |
| **Donor detail** | Timeline of gifts and communications; set a next step (one-click "invite to <event>"); log a text/email/call; draft thank-you/update; **one-click funder packet** |
| **Retention** | Year over year: new, recovered, increased, same, decreased, lapsed, plus retention rate |
| **Import** | Spreadsheet + Zeffy + Benevity CSVs → dedupe preview → commit; new donors assigned **round-robin to the member with the fewest** |
| **Read API** | Contract for `GET /api/v1/donor-summary`, aggregated by period / program / board member, with a live sample response |

![Dashboard](docs/screenshots/dashboard.png)

![Donors](docs/screenshots/donors.png)

### Demo accounts

Sign in with any of these. They're fake board members, and every one uses the password **`CicDemo-2026!`**:

| Email | Role |
|---|---|
| `alex@example.org` | CIC admin: every donor, plus Import and the Read API page |
| `priya@example.org`, `jordan@example.org`, `sam@example.org` | Board member: only their own donors |

The password is public on purpose because the data is fake. Replace these accounts before CIC loads real donors.

### Where the logic lives

- `src/lib/dedupe.ts`: CSV parsing, per-source column mapping, union-find dedupe on email, then phone, then name+org, then name. Name-only matches are flagged for review.
- `src/lib/logic.ts`: round-robin assignment, retention classification, quarterly cadence.
- `src/lib/drafts.ts`: message templates. **Swap point for AI drafting**: same inputs, and a human still approves.
- `src/store.tsx`: the API client. It loads `/api/bootstrap`, and each action calls one route and reloads, so the UI always shows what D1 holds.
- `worker/index.ts`: the API. Every route resolves the caller first; board members can only read or write donors they own, and import is admin-only.
- `migrations/`: D1 schema. Add a new numbered file for each change; deploys apply them before the new code goes live.
- `src/data/seed.ts`: fake donors. **Never commit real donor PII.**

### Next steps

1. **Real exports**: get scrubbed Zeffy/Benevity samples from CIC and fix `COLUMN_MAP` in `dedupe.ts`.
2. **Read API**: a Worker route behind a hashed API key, returning aggregates only (no PII).
3. **Sending**: email via Resend/Listmonk and SMS via Twilio. Do this only after approval, and log the send to `interactions`.
4. **Pick a P1**: debrief-to-action (a voice note becomes a contact record, a next step and a draft) or events-aware next steps (Google Calendar).
5. **Brand**: swap the placeholder mark in `App.tsx` for the real CIC logo, and run Lighthouse (target a11y ≥ 95).

## Tech stack

- Frontend: Vite + React + TypeScript, Tailwind v4, [shadcn/ui](https://ui.shadcn.com) on [Base UI](https://base-ui.com) (`components.json` style `base-nova`). Add components with `bunx shadcn@latest add <name>`.
- Backend: a Cloudflare Worker (`worker/index.ts`) serving a JSON API under `/api/*`, next to the static app
- Database: [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite). Schema in `migrations/`
- Auth: [WorkOS AuthKit](https://workos.com/user-management), free up to 1M users. The Worker verifies each access token with `jose` and maps its email to `board_members`
- APIs / services: none yet

## Run it locally

Needs [Bun](https://bun.sh).

```bash
git clone https://github.com/2026-Arizona-Opportunity-Hack/Git-Happens-CodinginColor.git
cd Git-Happens-CodinginColor
bun install
bun run db:migrate   # create the local D1 database
bun run db:seed      # load the fake demo data (re-run any time to reset)
bun dev              # http://localhost:5173, app + API
bun run build        # typecheck + production build
```

There's no `.env` yet. `bun dev` runs the Worker and a local D1 database inside Vite, through `@cloudflare/vite-plugin`.

### Sign-in (WorkOS)

The app uses the **Staging** environment of the "Coding in Color" WorkOS workspace. Its public client ID is `WORKOS_CLIENT_ID` in `wrangler.jsonc`. The browser fetches it from `/api/config`, so no secret or API key is involved. That environment is configured with:

- **Redirect URIs and allowed origins:** `https://githappens.jurenka.software`, `http://localhost:5173` and `http://localhost:5321`. Add any new host in both places.
- **A JWT template** that adds `email` to access tokens. The Worker needs it to find the user's `board_members` row.
- **Password sign-in.** Users are created in WorkOS.

To add a board member, create the user in WorkOS (Users → Create user) and insert a `board_members` row with the same email. Set `is_admin = 1` for admins. Someone who can sign in to WorkOS but has no row gets a 403.

AuthKit runs in `devMode`, which keeps the session in localStorage. That's required without a WorkOS custom domain, which costs $99/month.

### Deploying

`main` is where PRs land. To deploy, fast-forward `develop` to `main` and push:

```bash
git push origin origin/main:develop
```

Every push to `develop` deploys to **https://githappens.jurenka.software** through `.github/workflows/deploy.yml` (a Cloudflare Worker with static assets and a D1 database, configured in `wrangler.jsonc`). Each deploy applies any new `migrations/` to the production database first. You can also run it by hand from the Actions tab.

The repo needs two Actions secrets:

| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | API token from the "Edit Cloudflare Workers" template, scoped to the account and the `jurenka.software` zone, **plus Account → D1 → Edit** (the template leaves D1 out) |
| `CLOUDFLARE_ACCOUNT_ID` | `57cdeda067b33ff3b8def5d2b65aee9d` |

To deploy by hand, run `bun run deploy` (it uses wrangler, so log in with `wrangler login` first). To reset the live demo to the fake seed data, run `bun run db:seed:remote`.

### Brand

Colors follow the CIC brand guidelines and live as tokens in `src/index.css`:

- Dark green `#007A3D` is the dominant color: headers, table headers and primary buttons.
- Green `#00A850` is an accent only: focus rings and the logo.
- Tint `#E6F4ED` is for table rows and callouts.
- Body type is Arial.

Primary buttons use dark green rather than `#00A850`, because white on `#00A850` is about 3.1:1 contrast and fails WCAG AA.

## Links

- Live demo: https://githappens.jurenka.software
- Demo video:
- Design / docs:

## After the hackathon

Winning teams finish the project with the nonprofit — the [Definition of Done](https://www.ohack.dev/about/completion) (deployed, nonprofit sign-off, docs, open source) is tracked on your team page. Keep the repo public and the README honest; recruiters do read these.

Need a hand this weekend? [#ask-a-mentor](https://opportunity-hack.slack.com/archives/C01E5CGDQ74) on Slack, or ask in [#githappens](https://opportunity-hack.slack.com/app_redirect?channel=githappens) and a mentor will drop in.
