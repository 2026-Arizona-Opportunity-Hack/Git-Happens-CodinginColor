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
- [Noah Schroeder](https://github.com/n-schroeder)
- [Name](https://github.com/username) — role

## What we built

Coding in Color's donor records are split across a spreadsheet, Zeffy and Benevity, and follow-ups depend on board members remembering them. This platform merges those sources into one deduplicated donor list, gives each board member a queue of next steps with drafted thank-yous and updates that a human approves, and shows year-over-year retention. Board members sign in with WorkOS AuthKit, and data lives in Cloudflare D1 behind a Worker API. The seed data is fake.

| Page | Brief requirement (P0) |
|---|---|
| **Dashboard** | Org health; board-member load; upcoming events; recent activity |
| **Notifications** | One inbox of reminders: overdue/upcoming next steps, quarterly updates due, lapsed donors, drafts to approve, events in the next 3 weeks and (admins) exports not re-imported in 30 days. Nav shows a count |
| **Follow-ups** | Next steps with due dates; quarterly-touch queue; lapsed-donor nudges; **drafts a human must approve**. A draft opens in Gmail, Outlook or the default mail app (or Messages, for texts) with the donor, subject and body filled in, so it goes out from the board member's own address; they confirm "Did you send it?" and the touch is logged |
| **Donors** | One deduped table across all sources; owner, lifetime, status, next step |
| **Donor detail** | Timeline of gifts and communications; set a next step (one-click "invite to <event>"); log a text/email/call; draft thank-you/update; **one-click funder packet** |
| **Retention** | Year over year: new, recovered, increased, same, decreased, lapsed, plus retention rate |
| **Import** | Spreadsheet + Zeffy + Benevity CSVs → dedupe preview → commit; new donors assigned **round-robin to the member with the fewest**. Each source shows when it was last imported (stale after 30 days), plus an import history |
| **API docs** | Interactive reference for the Worker API at [`/api/docs`](https://githappens.jurenka.software/api/docs), rendered by [Scalar](https://scalar.com) from the OpenAPI spec at `/api/openapi.json` (`worker/openapi.ts`). Paste a WorkOS access token to try requests |
| **Board members** (admin) | Invite board members, change their role, remove them (WorkOS Users Management widget) |
| **My account** | Each user edits their profile, changes password and sets up MFA, and signs out other devices (WorkOS widgets) |
| **Assistant** (every page) | A column on the right of every page on wide screens, and its own Assistant tab on phones and tablets. It answers questions about the records you can see, with donor cards, tables and links. It can't change anything itself: it offers buttons (log contact, set a next step, draft, approve or discard a draft, reassign for admins) whose labels the app writes, and nothing happens until you press one. Raw HTML, images and outside links in replies are never rendered |
| **Installable app** | A PWA: "Install app" in Chrome or Edge, or Share → Add to Home Screen on iPhone, gives board members their own icon and window. The service worker (`public/sw.js`) caches only the app shell so it opens offline; `/api` data is never cached |

![Dashboard](docs/screenshots/dashboard.png)

![Donors](docs/screenshots/donors.png)

### Demo accounts

Sign in with any of these. They're fake accounts, and every one uses the password **`CicDemo-2026!`**:

| Email | Role |
|---|---|
| `alex@example.org`, `diana@example.org`, `mauricio@example.org`, `dominick@example.org`, `melissa@example.org` | CIC admin: every donor, plus Import and the API docs link |
| `priya@example.org`, `jordan@example.org`, `sam@example.org`, `greg@example.org`, `genevieve@example.org`, `frank@example.org`, `landon@example.org`, `nicole@example.org`, `adrian@example.org`, `amber@example.org` | Board member: only their own donors |

The password is public on purpose because the data is fake. Replace these accounts before CIC loads real donors.

### Where the logic lives

- `src/lib/dedupe.ts`: CSV parsing, per-source column mapping, union-find dedupe on email, then phone, then name+org, then name. Name-only matches are flagged for review. Gifts are deduped too: for one donor, the same amount within 3 days of a gift already recorded (or already in this import) is skipped, so re-imports and a donation reported by two sources count once. The preview lists every skipped gift.
- `src/lib/reminders.ts`: Notifications rules. Computed from current data, never stored, so a reminder clears once the work is done. Thresholds are constants at the top and in `src/data/sources.ts`.
- `src/lib/logic.ts`: round-robin assignment, retention classification, quarterly cadence.
- `src/lib/drafts.ts`: message templates. **Swap point for AI drafting**: same inputs, and a human still approves.
- `src/store.tsx`: the API client. It loads `/api/bootstrap`, and each action calls one route and reloads, so the UI always shows what D1 holds.
- `worker/openapi.ts`: the OpenAPI spec for the routes in `worker/index.ts`; update it when a route changes.
- `worker/index.ts`: the API. Every route resolves the caller first; board members can only read or write donors they own, and import is admin-only.
- `migrations/`: D1 schema. Add a new numbered file for each change; deploys apply them before the new code goes live.
- `src/data/seed.ts`: fake donors. **Never commit real donor PII.**

### Next steps

1. **Real exports**: get scrubbed Zeffy/Benevity samples from CIC and fix `COLUMN_MAP` in `dedupe.ts`.
2. **Read API**: a Worker route behind a hashed API key, returning aggregates only (no PII).
3. **Sending**: drafts open pre-filled in the board member's own mail or Messages app today. Saving drafts straight into their mailbox (Gmail API / Microsoft Graph) needs per-user OAuth and, for Gmail, Google's app verification; sending from the app (Resend, Twilio) would come from CIC rather than the board member.
4. **Pick a P1**: debrief-to-action (a voice note becomes a contact record, a next step and a draft) or events-aware next steps (Google Calendar).
5. **Brand**: swap the placeholder mark in `App.tsx` for the real CIC logo, and run Lighthouse (target a11y ≥ 95).

## Tech stack

- Frontend: Vite + React + TypeScript, Tailwind v4, [shadcn/ui](https://ui.shadcn.com) on [Base UI](https://base-ui.com) (`components.json` style `base-nova`). Add components with `bunx shadcn@latest add <name>`.
- Backend: a Cloudflare Worker (`worker/index.ts`) serving a JSON API under `/api/*`, next to the static app
- Database: [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite). Schema in `migrations/`
- Auth: [WorkOS AuthKit](https://workos.com/user-management), free up to 1M users. The Worker verifies each access token with `jose` and looks the user up in the CIC organization in WorkOS, which is the source of truth for who is on the board
- APIs / services: the [OHack AI gateway](https://ai.ohack.dev) (OpenAI-compatible, model `muse-spark`) for the assistant. `POST /api/chat` sends it the caller's own scoped records, the same data `/api/bootstrap` returns, with the conversation. **That includes donor names, emails and gifts**, so check with CIC before real donor data goes through it.

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
bun run test         # unit tests for dedupe and reminders (Node's test runner via tsx)
```

`nix build` installs dependencies from `bun.lock` in a sandbox, checked against a hash in `flake.nix`. After changing dependencies, set that hash (`x86_64-linux = "…"`) to `""`, run `nix build`, and paste the `got:` hash it prints. Other platforms need their own hash added the same way.

`bun dev` runs the Worker and a local D1 database inside Vite, through `@cloudflare/vite-plugin`. Both the Worker and `bun run db:seed` need the WorkOS Staging secret key, so copy `.env.example` to `.env` and set `WORKOS_API_KEY` before running them. The assistant also needs `AI_API_KEY`, the OHack AI gateway key from your team card; without it everything else works and the chat says it's unavailable. In production it's a Worker secret (`bunx wrangler secret put AI_API_KEY`). `.env` is gitignored.

### Sign-in (WorkOS)

The app uses the **Staging** environment of the "Coding in Color" WorkOS workspace. Its public client ID is `WORKOS_CLIENT_ID` in `wrangler.jsonc`, and the browser fetches it from `/api/config`. The secret key (`WORKOS_API_KEY`) stays on the Worker, which uses it to list the board. That environment is configured with:

- **Redirect URIs and allowed origins:** `https://githappens.jurenka.software`, `http://localhost:5173` and `http://localhost:5321`. Add any new host in both places.
- **Password sign-in.** Users are created in WorkOS.

- **An organization, "Coding in Color"** (`WORKOS_ORG_ID` in `wrangler.jsonc`). Its members are the board.

WorkOS is the source of truth for board members; D1 only stores donor data, keyed by WorkOS user ID. Admins manage the board on the app's **Board members** page: invite someone by email, set their role to **Admin** (sees every donor, can import) or **Member** (only their own donors), or remove them. The page is WorkOS's [Users Management widget](https://workos.com/docs/widgets/user-management). The Worker mints its token at `POST /api/widget-token`, and the widget only works for roles with the `widgets:users-table:manage` permission, which the Staging Admin role has. The WorkOS dashboard still works too: add a user to the "Coding in Color" organization with the same roles. The Worker caches the member list for 60 seconds, so changes show up within a minute. Someone who can sign in to WorkOS but isn't in the organization gets a 403.

AuthKit runs in `devMode`, which keeps the session in localStorage. That's required without a WorkOS custom domain, which costs $99/month.

### Deploying

`main` is where PRs land. To deploy, fast-forward `develop` to `main` and push:

```bash
git push origin origin/main:develop
```

Every push to `develop` deploys to **https://githappens.jurenka.software** through `.github/workflows/deploy.yml`, which builds with `nix build` and runs wrangler inside `nix develop` (a Cloudflare Worker with static assets and a D1 database, configured in `wrangler.jsonc`). Each deploy applies any new `migrations/` to the production database first. You can also run it by hand from the Actions tab.

The repo needs two Actions secrets:

| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | API token from the "Edit Cloudflare Workers" template, scoped to the account and the `jurenka.software` zone, **plus Account → D1 → Edit** (the template leaves D1 out) |
| `CLOUDFLARE_ACCOUNT_ID` | `57cdeda067b33ff3b8def5d2b65aee9d` |

The Worker also needs the WorkOS secret key. Set it once (or whenever the key is rotated) with `bunx wrangler secret put WORKOS_API_KEY` and paste the Staging `sk_test_…` key. Without it every API call fails.

To deploy by hand, run `bun run deploy` inside `nix develop` (it builds with `nix build` and uses wrangler, so log in with `wrangler login` first). To reset the live demo to the fake seed data, run `bun run db:seed:remote` (with `WORKOS_API_KEY` in `.env`; it maps the seed's donor owners to WorkOS users by email).

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
