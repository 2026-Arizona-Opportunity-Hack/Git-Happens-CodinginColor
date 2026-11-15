---
title: Architecture
covers:
  - worker/index.ts
  - src/store.tsx
  - src/App.tsx
  - src/main.tsx
  - src/lib/logic.ts
  - src/lib/utils.ts
  - src/data/types.ts
  - src/components/common.tsx
  - src/components/Loading.tsx
  - migrations
  - src/index.css
---

# Architecture

One Cloudflare Worker serves both the React app and a JSON API under `/api/*`. Donor data is in Cloudflare D1 (SQLite). WorkOS AuthKit signs people in and is the source of truth for who is on the board. The AI gateway writes drafts and answers the assistant.

```
browser (React SPA, PWA)
   │  WorkOS access token
   ▼
Cloudflare Worker  worker/index.ts ──► WorkOS     who is on the board, their role
   │                                ├─► AI gateway  drafts, assistant
   ▼                                └─► CIC's iCal  events, every 10 minutes at most
D1 (SQLite)  migrations/
```

Every request resolves the caller first: the Worker verifies the token, then looks the user up in the CIC organization in WorkOS. A board member can only read or write donors they own; admins see every donor. The browser loads `/api/bootstrap` once, and each action calls one route and reloads, so the UI always shows what D1 holds.

## Stack

- Frontend: Vite + React + TypeScript, Tailwind v4, [shadcn/ui](https://ui.shadcn.com) on [Base UI](https://base-ui.com) (`components.json` style `base-nova`). Add components with `bunx shadcn@latest add <name>`.
- Backend: a Cloudflare Worker (`worker/index.ts`) serving a JSON API under `/api/*`, next to the static app
- Database: [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite). Schema in `migrations/`
- Auth: [WorkOS AuthKit](https://workos.com/user-management), free up to 1M users. The Worker verifies each access token with `jose` and looks the user up in the CIC organization in WorkOS, which is the source of truth for who is on the board
- APIs / services: the [OHack AI gateway](https://ai.ohack.dev) (OpenAI-compatible) for the assistant (model `muse-spark`) and for drafts (`gpt-oss-120b` at low reasoning effort, about 1.5 s a draft where `muse-spark` took 20–30 s). `POST /api/chat` sends it the caller's own scoped records, the same data `/api/bootstrap` returns, plus today's computed lists (overdue steps, updates due, lapsed, decreased, events to invite to), with the conversation; `POST /api/drafts` sends one donor's name, organization, gifts, notes, next step, last 10 logged contacts and last 3 sent messages. **That includes donor names, emails and gifts**, so check with CIC before real donor data goes through it. The prompt puts fixed instructions and the data first and the per-caller lines last, so the gateway can cache the repeated prefix across turns and between admins; `wrangler tail` logs how many prompt tokens each reply got from the cache.

Why these models, and what a real deployment should use instead: [decision 001](decisions/001-ai-model.md).

## Where the code is

Each page's doc in [features/](features/) says where its code is. The pieces every feature shares:

- `src/lib/logic.ts`: suggested board member (fewest donors, spread across a batch), retention classification and patterns (cohorts, lapse rate by source and program), quarterly cadence, and the events a donor can be invited to (`offeredEvents`: the next three, shared by the donor page and the assistant). A donor with no board member has `ownerId: null`; D1 stores that as `owner_id = ''` because the column is `NOT NULL`.
- `src/store.tsx`: the API client. It loads `/api/bootstrap`, and each action calls one route and reloads, so the UI always shows what D1 holds.
- `worker/openapi.ts`: the OpenAPI spec for the routes in `worker/index.ts`; update it when a route changes.
- `worker/index.ts`: the API. Every route resolves the caller first; board members can only read or write donors they own, and import is admin-only. `POST /api/drafts` sends a draft on a channel the donor has (`draftChannel()` in `src/lib/drafts.ts`) and refuses one for a donor with no email or phone.
- `migrations/`: D1 schema. Add a new numbered file for each change; deploys apply them before the new code goes live.
- `src/lib/utils.ts`: `cn` for class names, and `fmtPhone`, which shows US 10-digit phones as (555) 555-1234 and leaves anything else as stored. Stored values and search are untouched.
- `src/App.tsx`: the sidebar and routes. A donor page (`/donors/:id`) highlights My Donors only when the donor is yours, and All Donors otherwise.
- `src/data/types.ts`: the domain model; the D1 schema in `migrations/` stores these shapes.
- Lists: tables use `DataTable` (`src/components/ui/data-table.tsx`), 25 rows a page; plain lists that can grow wrap in `Paged` (`src/components/common.tsx`), 10 a page.

## Brand

Colors follow the CIC brand guidelines and live as tokens in `src/index.css`:

- Dark green `#007A3D` is the dominant color: headers, table headers and primary buttons.
- Green `#00A850` is an accent only: focus rings and the logo.
- Tint `#E6F4ED` is for table rows and callouts.
- Body type is Arial.

Primary buttons use dark green rather than `#00A850`, because white on `#00A850` is about 3.1:1 contrast and fails WCAG AA.
