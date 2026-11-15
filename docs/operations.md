---
title: Operations
covers:
  - wrangler.jsonc
  - .env.example
  - .github/workflows/deploy.yml
  - .github/workflows/security-review.yml
  - .github/prompts
  - scripts/seed-sql.ts
---

# Operations

How to run this in production: settings, secrets, deploys, the calendar, the board, and resetting the demo. For running it on your own machine, see [Run it locally](../README.md#run-it-locally).

## Settings and secrets

| Name | Where | What it is |
|---|---|---|
| `WORKOS_API_KEY` | Worker secret; `.env` locally | WorkOS Staging secret key. The Worker uses it to read the board; `db:seed` uses it too. Without it every API call fails |
| `AI_API_KEY` | Worker secret; `.env` locally | OHack AI gateway key. Without it the assistant says it's unavailable and drafts use templates |
| `WORKOS_CLIENT_ID` | `vars` in `wrangler.jsonc` | WorkOS public client ID; the browser fetches it from `/api/config` |
| `WORKOS_ORG_ID` | `vars` in `wrangler.jsonc` | The "Coding in Color" organization in WorkOS. Its members are the board |
| `CALENDAR_ICS_URL` | `vars`, or a Worker secret for a private calendar | CIC's iCal address (see [Events calendar](#events-calendar)) |
| `DEV_TOOLS` | `vars` in `wrangler.jsonc` | `"true"` shows [Dev tools](features/dev-tools.md). Set it to `"false"` before launch |
| `DB` | `d1_databases` in `wrangler.jsonc` | The D1 database |

Set a Worker secret with `bunx wrangler secret put <NAME>`. Every name the Worker reads must be in this table; `scripts/check-docs.ts` checks.

## Sign-in (WorkOS)

The app uses the **Staging** environment of the "Coding in Color" WorkOS workspace. Its public client ID is `WORKOS_CLIENT_ID` in `wrangler.jsonc`, and the browser fetches it from `/api/config`. The secret key (`WORKOS_API_KEY`) stays on the Worker, which uses it to list the board. That environment is configured with:

- **Redirect URIs and allowed origins:** `https://githappens.jurenka.software`, `http://localhost:5173` and `http://localhost:5321`. Add any new host in both places.
- **Sign-out redirects:** the same three URLs, with `https://githappens.jurenka.software` as the default. Sign-out returns to the app's origin, and WorkOS shows an error page for any return URL not on this list.
- **Password sign-in.** Users are created in WorkOS.

- **An organization, "Coding in Color"** (`WORKOS_ORG_ID` in `wrangler.jsonc`). Its members are the board.

WorkOS is the source of truth for board members; D1 only stores donor data, keyed by WorkOS user ID. Admins manage the board on the app's **Board members** page: invite someone by email, set their role to **Admin** (sees every donor, can import) or **Member** (only their own donors), or remove them. The page is WorkOS's [Users Management widget](https://workos.com/docs/widgets/user-management). The Worker mints its token at `POST /api/widget-token`, and the widget only works for roles with the `widgets:users-table:manage` permission, which the Staging Admin role has. The WorkOS dashboard still works too: add a user to the "Coding in Color" organization with the same roles. The Worker caches the member list for 60 seconds, so changes show up within a minute. Someone who can sign in to WorkOS but isn't in the organization gets a 403.

AuthKit runs in `devMode`, which keeps the session in localStorage. That's required without a WorkOS custom domain, which costs $99/month.

## Deploying

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

## Events calendar

The Worker reads CIC's events from an iCal (`.ics`) address and keeps the next 400 days of them in D1. Once `CALENDAR_ICS_URL` is set, the calendar is the whole list: an event taken off it disappears from the app, and next steps linked to it keep their text and due date. If the address can't be read, the app keeps the events it already has (`wrangler tail` shows `calendar sync failed`).

To switch from the demo calendar to CIC's own, in Google Calendar open **Settings and sharing** for the events calendar, then **Integrate calendar**:

- **Public calendar:** copy **Public address in iCal format** into `CALENDAR_ICS_URL` in `wrangler.jsonc` and deploy.
- **Private calendar:** the **Secret address in iCal format** works like a password, so it must not go in git. Delete `CALENDAR_ICS_URL` from `vars`, run `bunx wrangler secret put CALENDAR_ICS_URL`, paste the address, and deploy.

Locally, `bun dev` reads the same var, or set `CALENDAR_ICS_URL` in `.env`. Without it, the events are the seed's.

## AI security review

`.github/workflows/security-review.yml` asks a model to review a PR's diff for security problems. It runs two ways:

- **Check**: every PR gets one `muse-wonder` review, posted as a comment, when it's opened, reopened or marked ready for review. Pushing more commits doesn't re-run it, which keeps the gateway credits for real use. Drafts are skipped until they're ready. **Off for now**: turn it on with `gh variable set AI_CHECK_ALL_PRS --body true` and off again with `gh variable delete AI_CHECK_ALL_PRS`.
- **Audit**: when you ask, the review is saved as a report in [`audits/`](audits/) and opened as its own PR, with a comment on the reviewed PR linking to it. Add a label to the PR (it comes off afterwards, so add it again to re-run), or run it from the Actions tab with a PR number and model. Leave the PR number empty to audit the **whole repo** as it is on the branch you pick (`gh workflow run security-review.yml -f model=claude`); that uses the prompt in `.github/prompts/security-audit-repo.md` and gets up to 100 turns.

The OHack org doesn't let GitHub Actions open PRs (the repo setting is greyed out), so audit PRs are opened with a token in the `AUDIT_PR_TOKEN` secret: a [classic personal access token](https://github.com/settings/tokens/new?scopes=public_repo&description=Git%20Happens%20audit%20PRs) with only the **`public_repo`** scope, made by any collaborator with write access. (Fine-grained tokens need the org to approve them, and outside collaborators can't get that; classic tokens use the collaborator's own repo access.) The PRs show as opened by whoever made the token. Without it, the report is still pushed to an `audit/…` branch and the comment links to a page to open the PR in one click.

| Label | Model | Secret it needs |
|---|---|---|
| `ai-review` | Claude, on a Claude Pro/Max subscription | `CLAUDE_CODE_OAUTH_TOKEN`, from `claude setup-token` |
| `ai-review:kimi-k3` | `kimi-k3` on the OHack gateway | `OHACK_REVIEW_KEY`, a gateway key |
| `ai-review:muse-wonder` | `muse-wonder` on the OHack gateway ($4/$20 per 1M tokens, so sparingly) | `OHACK_REVIEW_KEY` |

The model can only read the checkout and run `git diff/log/show`; it gets no GitHub token, and a separate step posts its reply. The comment is advice, not a gate. The prompt is in `.github/prompts/security-review.md`.

To deploy by hand, run `bun run deploy` inside `nix develop` (it builds with `nix build` and uses wrangler, so log in with `wrangler login` first). To reset the live demo to the fake seed data, run `bun run db:seed:remote` (with `WORKOS_API_KEY` in `.env`; it maps the seed's donor owners to WorkOS users by email).
