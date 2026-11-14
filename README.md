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

Coding in Color's donor records are split across a spreadsheet, Zeffy and Benevity, and follow-ups depend on board members remembering them. This platform merges those sources into one deduplicated donor list, gives each board member a queue of next steps with drafted thank-yous and updates that a human approves, and shows year-over-year retention. Right now it's a **clickable prototype** on in-memory fake data: it sets the direction and the UI, and there's no backend yet.

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

Use the **"Viewing as"** switcher in the sidebar to see the board-member view. Board members only see their own donors, and Import and the API page are admin-only.

### Where the logic lives

- `src/lib/dedupe.ts`: CSV parsing, per-source column mapping, union-find dedupe on email, then phone, then name+org, then name. Name-only matches are flagged for review.
- `src/lib/logic.ts`: round-robin assignment, retention classification, quarterly cadence.
- `src/lib/drafts.ts`: message templates. **Swap point for AI drafting**: same inputs, and a human still approves.
- `src/store.tsx`: in-memory state. Each action maps to one future API route or table write.
- `src/data/seed.ts`: fake donors. **Never commit real donor PII.**

### Next steps

1. **Backend**: Supabase (Postgres + Auth + RLS). Tables: `board_members`, `donors`, `gifts`, `interactions`, `drafts`, `events`, `api_keys`. Use an RLS policy so `board` users can only see donors where `owner_id = auth.uid()`.
2. **Real exports**: get scrubbed Zeffy/Benevity samples from CIC and fix `COLUMN_MAP` in `dedupe.ts`.
3. **Read API**: a Supabase edge function behind a hashed API key, returning aggregates only (no PII).
4. **Sending**: email via Resend/Listmonk and SMS via Twilio. Do this only after approval, and log the send to `interactions`.
5. **Pick a P1**: debrief-to-action (a voice note becomes a contact record, a next step and a draft) or events-aware next steps (Google Calendar).
6. **Brand**: swap the placeholder mark in `App.tsx` for the real CIC logo, and run Lighthouse (target a11y ≥ 95).

## Tech stack

- Frontend: Vite + React + TypeScript, Tailwind v4, [shadcn/ui](https://ui.shadcn.com) on [Base UI](https://base-ui.com) (`components.json` style `base-nova`). Add components with `bunx shadcn@latest add <name>`.
- Backend: none yet
- Database: none yet
- APIs / services: none yet

## Run it locally

Needs [Bun](https://bun.sh).

```bash
git clone https://github.com/2026-Arizona-Opportunity-Hack/Git-Happens-CodinginColor.git
cd Git-Happens-CodinginColor
bun install
bun dev          # http://localhost:5173
bun run build    # typecheck + production build
```

There's no `.env` yet, because the app runs on in-memory data.

### Brand

Colors follow the CIC brand guidelines and live as tokens in `src/index.css`:

- Dark green `#007A3D` is the dominant color: headers, table headers and primary buttons.
- Green `#00A850` is an accent only: focus rings and the logo.
- Tint `#E6F4ED` is for table rows and callouts.
- Body type is Arial.

Primary buttons use dark green rather than `#00A850`, because white on `#00A850` is about 3.1:1 contrast and fails WCAG AA.

## Links

- Live demo:
- Demo video:
- Design / docs:

## After the hackathon

Winning teams finish the project with the nonprofit — the [Definition of Done](https://www.ohack.dev/about/completion) (deployed, nonprofit sign-off, docs, open source) is tracked on your team page. Keep the repo public and the README honest; recruiters do read these.

Need a hand this weekend? [#ask-a-mentor](https://opportunity-hack.slack.com/archives/C01E5CGDQ74) on Slack, or ask in [#githappens](https://opportunity-hack.slack.com/app_redirect?channel=githappens) and a mentor will drop in.
