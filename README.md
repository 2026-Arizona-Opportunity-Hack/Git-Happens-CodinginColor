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
- [Matthew Jurenka](https://github.com/mattjurenka)
- [Ram Bhatnagar](https://github.com/Sir-Arceebee)
- [Eleanor Lam](https://github.com/codagirlaz)

## What we built

Coding in Color's donor records are split across a spreadsheet, Zeffy and Benevity, and follow-ups depend on board members remembering them. This platform merges those sources into one deduplicated donor list, gives each board member a queue of next steps with drafted thank-yous and updates that a human approves, and shows year-over-year retention. Board members sign in with WorkOS AuthKit, and data lives in Cloudflare D1 behind a Worker API. The seed data is fake.

| Page | Brief requirement (P0) |
|---|---|
| **Dashboard** | Org health; board-member load; upcoming events; recent activity |
| **Notifications** | One inbox of reminders: overdue/upcoming next steps, quarterly updates due, lapsed donors, drafts to approve, events in the next 3 weeks and (admins) exports not re-imported in 30 days. Nav shows a count. Donor reminders cover only the donors assigned to you, admins included; admins also get the org-wide ones (stale exports, unassigned donors) |
| **Follow-ups** | Next steps with due dates; quarterly-touch queue; lapsed-donor nudges; **drafts a human must approve**. A draft opens in Gmail, Outlook or the default mail app (or Messages, for texts) with the donor, subject and body filled in, so it goes out from the board member's own address; they confirm "Did you send it?" and the touch is logged |
| **My Donors** | The donors assigned to the signed-in person (admins too, since they can be assigned donors); lifetime, status, next step. **Filters** in the table: name/org/email, donation date range, this year's status, next step (overdue, due in 7 days, set, none). **Export CSV** / **Export Excel** (.xlsx) download them with every column (contact, board member, giving totals, status, next step, custom fields) |
| **All Donors** (admin) | Every donor with contact details and their board member. Pick board members in any rows (changed rows turn amber and say *Not saved yet*), then click **Save** (bottom right); nothing is saved before that. Donors picked in the New Donors popup sit at the bottom marked *New* with a suggested board member filled in; an **Unassigned donors** section below holds the rest. **Filters** at the top of the table, applied to both sections: name/org/email, donation date range (donors with a gift in it) and board member; **Export CSV** / **Export Excel** download the filtered donors with every column |
| **Search** (every page) | Bottom of the sidebar: type a page or task ("api key", "import", "password") or a donor's name, organization, email or phone, then press Enter to go there. Ctrl+K or `/` jumps to it. It finds only the pages and donors you can see. Search words for each page are the `keywords` in `NAV` in `src/App.tsx` |
| **Donor detail** | Timeline of gifts and communications; set a next step, or invite them to an upcoming event in **one click** (the next step "Invite to <event>", due a week before it, plus a draft invitation to approve); add a next step to Google Calendar; log a text/email/call; draft thank-you/update; **one-click funder packet**: a Markdown file with lifetime giving, totals by year and by program, every gift, and the outcomes of each program they funded (from Program outcomes), ready to paste into a renewal |
| **Program outcomes** (admin) | Students served and a short outcomes summary for each program (K12, AI Academy, Summer Camp, Day of Compute, General). Funder packets quote them, and quarterly-update drafts list the outcomes of the programs that donor funded. They start with only what CIC's brief says about each program; sample data shows made-up numbers |
| **Retention** (admin) | Year over year or quarter over quarter: new, recovered, increased, same, decreased, lapsed, plus retention rate. **Patterns** below show churn and activation: donors grouped by the year (or quarter) of their first gift with the share who gave again each period after, and the lapse rate by source (Zeffy, Benevity…) and by program. With no gifts yet, it offers **Use sample data** |
| **Use sample data** (every page) | A switch at the bottom of the sidebar swaps every donor, gift, contact and event for made-up ones, shared out among the real board members, so the app can be shown or tried before an import. A banner says so on each page. It's kept per browser and follows you across tabs. Nothing is saved: changes say "view-only" instead of reaching the server, and the assistant (which reads the real records on the server) asks you to switch it off. Board members, My account and Read API always show real data |
| **Update Donors** (admin) | Upload the spreadsheet, Zeffy and Benevity CSVs, then map columns in a staging popup: **Mapped fields** shows each file column → donor-database column (changeable); **Unmapped columns** default to *Do not save* and can be set to any database column no other column uses, or to **Create a new column** with a name you type (a custom field shown on the donor page). The popup totals the gifts it will record. Gifts without a usable date are still saved, with the date unknown: they count toward lifetime giving but not toward any year's totals (Raised YTD, retention), and the popup says how many there are. Only gifts whose amount can't be read are skipped. Dates like `2026-11-14`, `11/14/2026` and `Nov 14, 2026` are all read. After saving, a **New Donors** popup lists donors that weren't in the database; selected ones open on All Donors with the board member with the fewest donors suggested. Each source shows when it was last imported (stale after 30 days), plus an import history |
| **Events calendar** | Upcoming events come from CIC's calendar through its iCal address (`CALENDAR_ICS_URL`), read at most every 10 minutes, so "invite to <event>" always has a real date. Cancelled events are left out. Until CIC shares its address, it reads the demo calendar in `public/demo-calendar.ics` (placeholder dates). See [Events calendar](#events-calendar) |
| **Dev tools** (admin, development only) | **Clear donor database** (type DELETE to confirm) deletes all donors, gifts, contacts, drafts and import history so imports can be tested from scratch. Shown only while `DEV_TOOLS` is `"true"` in `wrangler.jsonc`. **Remove before launch:** `src/pages/DevTools.tsx`, its nav entry and route in `App.tsx`, `/api/dev/clear-donors` in `worker/index.ts` and `DEV_TOOLS` |
| **Read API** | `GET /api/v1/summary?period=2026-Q4[&program=][&board_member=]` gives CIC's org dashboard totals and the 25 latest gifts and contacts, already grouped by quarter, program and board member, with **no donor names, emails or IDs**. It takes an API key (`Authorization: Bearer cic_live_…`) that an admin creates, copies once and revokes on the app's **Read API** page; D1 keeps only a SHA-256 of each key |
| **API docs** | Interactive reference for the Worker API at [`/api/docs`](https://githappens.jurenka.software/api/docs), rendered by [Scalar](https://scalar.com) from the OpenAPI spec at `/api/openapi.json` (`worker/openapi.ts`). Paste a WorkOS access token, or a read API key for `/api/v1`, to try requests |
| **Board members** (admin) | Invite board members, change their role, remove them (WorkOS Users Management widget) |
| **My account** | Each user edits their profile, changes password and sets up MFA, and signs out other devices (WorkOS widgets) |
| **Assistant** (every page) | On wide screens the assistant is a column docked to the right of every page, open to start with; × slides it shut and the tab on the right edge slides it back, and the browser remembers which. On smaller screens a chat bubble opens it full screen; close it with × or Esc. It answers questions about the records you can see, with donor cards, tables and links. It can't change anything itself: it offers buttons (log contact, set a next step, draft, approve or discard a draft, reassign for admins) whose labels the app writes, and nothing happens until you press one. Raw HTML, images and outside links in replies are never rendered. In Chrome, Edge and Safari a microphone button dictates into the message box (the browser's own speech recognition; Chrome sends the audio to Google to transcribe). You read and fix the text before sending. Firefox has no built-in recognizer, so the button doesn't appear there |
| **Installable app** | A PWA. On phones and tablets a banner offers to install it (an Install button on Android, Share → Add to Home Screen directions on iPhone and iPad); on desktop use "Install app" in Chrome or Edge. Either way it gives board members their own icon and window. The service worker (`public/sw.js`) caches only the app shell so it opens offline; `/api` data is never cached |

![Dashboard](docs/screenshots/dashboard.png)

![Donors](docs/screenshots/donors.png)

### Demo accounts

Sign in with any of these. They're fake accounts, and every one uses the password **`CicDemo-2026!`**:

| Email | Role |
|---|---|
| `alex@example.org`, `diana@example.org`, `mauricio@example.org`, `dominick@example.org`, `melissa@example.org` | CIC admin: every donor, plus Import, Board members and Read API keys |
| `priya@example.org`, `jordan@example.org`, `sam@example.org`, `greg@example.org`, `genevieve@example.org`, `frank@example.org`, `landon@example.org`, `nicole@example.org`, `adrian@example.org`, `amber@example.org` | Board member: only their own donors |

The password is public on purpose because the data is fake. Replace these accounts before CIC loads real donors.

### Where the logic lives

- `src/lib/dedupe.ts`: CSV parsing, per-source column mapping, union-find dedupe on email, then phone, then name+org, then name. Name-only matches are flagged for review. Gifts are deduped too: for one donor, the same amount within 3 days of a gift already recorded (or already in this import) is skipped, so re-imports and a donation reported by two sources count once. The preview lists every skipped gift.
- `src/lib/reminders.ts`: Notifications rules. Computed from current data, never stored, so a reminder clears once the work is done. Thresholds are constants at the top and in `src/data/sources.ts`.
- `src/lib/logic.ts`: suggested board member (fewest donors, spread across a batch), retention classification and patterns (cohorts, lapse rate by source and program), quarterly cadence. A donor with no board member has `ownerId: null`; D1 stores that as `owner_id = ''` because the column is `NOT NULL`.
- `src/lib/packet.ts`: the funder packet, and which program outcomes a donor's gifts funded.
- `src/lib/drafts.ts`: message templates. Invitations, updates and nudges name a real event from the calendar. **Swap point for AI drafting**: same inputs, and a human still approves.
- `src/store.tsx`: the API client. It loads `/api/bootstrap`, and each action calls one route and reloads, so the UI always shows what D1 holds.
- `worker/openapi.ts`: the OpenAPI spec for the routes in `worker/index.ts`; update it when a route changes.
- `worker/index.ts`: the API. Every route resolves the caller first; board members can only read or write donors they own, and import is admin-only.
- `migrations/`: D1 schema. Add a new numbered file for each change; deploys apply them before the new code goes live.
- `src/data/seed.ts`: fake donors. **Never commit real donor PII.**

### Next steps

1. **Real exports**: get scrubbed Zeffy/Benevity samples from CIC and fix `COLUMN_MAP` in `dedupe.ts`.
2. **Sending**: drafts open pre-filled in the board member's own mail or Messages app today. Saving drafts straight into their mailbox (Gmail API / Microsoft Graph) needs per-user OAuth and, for Gmail, Google's app verification; sending from the app (Resend, Twilio) would come from CIC rather than the board member.
3. **Real calendar**: ask CIC for its Google Calendar's iCal address and set `CALENDAR_ICS_URL` (see [Events calendar](#events-calendar)).
4. **Outcomes from the classroom**: CIC enters program outcomes by hand today. Once the curriculum platform (Problem 1) has its read API, fill `program_outcomes` from its completion and learning-gain numbers instead.
5. **Other P1**: debrief-to-action (a voice note becomes a contact record, a next step and a draft).
6. **Brand**: swap the placeholder mark in `App.tsx` for the real CIC logo, and run Lighthouse (target a11y ≥ 95).

## Tech stack

- Frontend: Vite + React + TypeScript, Tailwind v4, [shadcn/ui](https://ui.shadcn.com) on [Base UI](https://base-ui.com) (`components.json` style `base-nova`). Add components with `bunx shadcn@latest add <name>`.
- Backend: a Cloudflare Worker (`worker/index.ts`) serving a JSON API under `/api/*`, next to the static app
- Database: [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite). Schema in `migrations/`
- Auth: [WorkOS AuthKit](https://workos.com/user-management), free up to 1M users. The Worker verifies each access token with `jose` and looks the user up in the CIC organization in WorkOS, which is the source of truth for who is on the board
- APIs / services: the [OHack AI gateway](https://ai.ohack.dev) (OpenAI-compatible, model `muse-spark`) for the assistant. `POST /api/chat` sends it the caller's own scoped records, the same data `/api/bootstrap` returns, with the conversation. **That includes donor names, emails and gifts**, so check with CIC before real donor data goes through it. The prompt puts fixed instructions and the data first and the per-caller lines last, so the gateway can cache the repeated prefix across turns and between admins; `wrangler tail` logs how many prompt tokens each reply got from the cache.

### Why `muse-spark`, and what a real deployment would use

We use `muse-spark` because the OHack gateway is the AI we have access to this weekend. It isn't what we'd ship for privacy and security reasons. The gateway is a third-party proxy that sees every prompt, and it forwards `muse-spark` requests to Meta's API as a "contributor" model. Our prompts include donor names, emails and gifts.

A real deployment should call [`@cf/zai-org/glm-5.3-flash`](https://developers.cloudflare.com/workers-ai/models/glm-5.3-flash/) on Cloudflare Workers AI through an `env.AI` binding instead. Donor data would then stay on the Cloudflare account that already runs the app and its database, and the `AI_API_KEY` secret would go away. On Nov 14 we gave both models, and four other Workers AI models, the same 7 questions with the real system prompt and seed data:

| | `muse-spark` (gateway) | `glm-5.3-flash` (Workers AI) |
|---|---|---|
| Correct answers and `::donor` / `::action` format | 7 of 7 | 7 of 7 |
| Average reply time | 10.6 s | 2.4 s |
| Cost per question | ~$0.0005 | ~$0.0003 |
| Repeated prompt served from cache | none | ~57% |

gpt-oss-120b, deepseek-v4.1-flash, gemma-4-26b and glm-4.7-flash each did worse on quality, cost or speed. glm-5.3-flash needs Workers Paid ($5/month). CIC's whole bill, including D1 and the Worker, would stay around $5 a month, and well under $20 even with heavy use. We'd add a per-user daily question limit at the same time, because Workers AI has no hard spend cap.

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
bun run test         # unit tests for src/lib (bun's test runner)
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

### Events calendar

The Worker reads CIC's events from an iCal (`.ics`) address and keeps the next 400 days of them in D1. Once `CALENDAR_ICS_URL` is set, the calendar is the whole list: an event taken off it disappears from the app, and next steps linked to it keep their text and due date. If the address can't be read, the app keeps the events it already has (`wrangler tail` shows `calendar sync failed`).

To switch from the demo calendar to CIC's own, in Google Calendar open **Settings and sharing** for the events calendar, then **Integrate calendar**:

- **Public calendar:** copy **Public address in iCal format** into `CALENDAR_ICS_URL` in `wrangler.jsonc` and deploy.
- **Private calendar:** the **Secret address in iCal format** works like a password, so it must not go in git. Delete `CALENDAR_ICS_URL` from `vars`, run `bunx wrangler secret put CALENDAR_ICS_URL`, paste the address, and deploy.

Locally, `bun dev` reads the same var, or set `CALENDAR_ICS_URL` in `.env`. Without it, the events are the seed's.

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
