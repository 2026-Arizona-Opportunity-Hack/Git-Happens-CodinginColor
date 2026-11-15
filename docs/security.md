---
title: Security
covers:
  - .claude/hooks/guard-secrets.sh
  - audits
---

# Security

Who can see what, how secrets are kept, and the gaps we know about. The rest of the docs describe features; this one collects what each does to protect donor data.

## Who can see what

- **Signed in or nothing.** Every `/api` route needs a WorkOS access token, except `/api/config`, `/api/docs` and `/api/openapi.json` (which hold no data) and `/api/v1` (which takes an API key instead). The Worker verifies it with `jose` (401 if missing or expired), then looks the user up in the "Coding in Color" organization in WorkOS. Someone who can sign in to WorkOS but isn't in the organization gets a 403. See [Operations](operations.md#sign-in-workos).
- **Two roles, set in WorkOS.** *Admin* sees every donor and can import, assign and manage API keys. *Member* sees only the donors assigned to them.
- **Ownership is checked on the server, not just hidden in the UI.** Every donor route loads the donor through `loadDonor` or `loadDraft` in `worker/index.ts`, which add `owner_id = <caller>` for members. Admin-only routes call `requireAdmin`. The same filter applies to `/api/bootstrap`, so a member's browser never receives other members' donors.
- **The assistant can't act on its own.** It only proposes buttons. `src/lib/actions.ts` checks each one against what the caller can see and writes the button label itself, and nothing happens until a person presses it. Replies never render raw HTML, images or outside links. Imported donor text reaches the model on one line with directive syntax and tags stripped. See [Assistant](features/assistant.md).
- **Nothing is sent without a human.** Drafts open in the board member's own mail app; the app never sends email itself. See [Follow-ups](features/follow-ups.md).

## The read API

`/api/v1/summary` returns totals only: no donor names, emails or IDs. Keys look like `cic_live_` plus 32 hex characters. An admin sees a key once when it's created, and D1 stores only its SHA-256, so a database leak doesn't leak working keys. A revoked key stops working immediately. See [Read API](features/read-api.md).

## Input

- Every D1 query uses bound parameters; no SQL is built from request text.
- Request bodies are checked in `src/lib/api.ts` before they reach D1, and `fuzz.test.ts` throws random input at those checks and at the CSV, date, amount and iCal parsers. See [Testing](testing.md).
- AI drafts that are empty, too long, or contain links, web or email addresses, payment details, account-like numbers or `[placeholders]` are thrown out, and the template is used instead (`src/lib/ai-draft.ts`).

## Secrets

- Real keys are never in git. `.env.example` lists what's needed, with placeholders; `.env` is gitignored. Production secrets are Worker secrets. The full list is in [Operations](operations.md#settings-and-secrets).
- `.claude/hooks/guard-secrets.sh` blocks a commit or push from Claude Code when the diff contains something that looks like a key or a `.env` file.
- `WORKOS_CLIENT_ID` and `WORKOS_ORG_ID` are in `wrangler.jsonc` on purpose: they're public identifiers, not secrets.

## How it's checked

Three automatic checks, so security doesn't rely on someone remembering.

### AI security audits

`.github/workflows/security-review.yml` has a model review a PR's diff when someone adds a label: `ai-review` for Claude, `ai-review:kimi-k3` or `ai-review:muse-wonder`. Run with no PR number, it audits the whole repo. Each report is opened as its own PR and saved in [`audits/`](../audits/), and the reviewed PR gets a comment. The model can only read the checkout. It gets no GitHub token, and a separate step posts its reply. Setup is in [Operations](operations.md#ai-security-review).

| Audit | Model | Found | Fixed |
|---|---|---|---|
| [PR #63](../audits/2026-11-15-pr-63-claude-1e197e4.md), debrief to log, next step and draft | Claude | Nothing | — |
| [PR #67](../audits/2026-11-15-pr-67-kimi-k3-3ad7bb7.md), Board members accessibility | kimi-k3 | Nothing | — |
| [Whole repo](../audits/2026-11-15-repo-claude-bb64a5f.md) at `bb64a5f` | Claude | Nothing. It checked that every donor route filters by owner, every query is bound, admin routes call `requireAdmin`, and the history only holds placeholder keys | — |
| [Whole repo](../audits/2026-11-15-repo-muse-wonder-19b9b26.md) at `19b9b26` | muse-wonder | **High:** `DEV_TOOLS` is on in production config, so any admin can clear every donor | Fixed: the Dev tools page, its route and `DEV_TOOLS` are removed |
| | | **Medium:** text planted in an imported donor record could steer the assistant's buttons and AI drafts (prompt injection) | Mostly fixed in [#95](https://github.com/2026-Arizona-Opportunity-Hack/Git-Happens-CodinginColor/pull/95): donor text is flattened and stripped of directive syntax and tags before it reaches either prompt, and drafts with links, outside addresses, payment words or account-like numbers are thrown out. The rest is [#93](https://github.com/2026-Arizona-Opportunity-Hack/Git-Happens-CodinginColor/issues/93), known gap 2 |

### 95% coverage gate

The **Tests** workflow runs the typecheck and unit tests on every PR and fails it if tests cover under 95% of lines or functions in `src/` (`scripts/check-coverage.ts`). Modules with no tests still count ([#83](https://github.com/2026-Arizona-Opportunity-Hack/Git-Happens-CodinginColor/pull/83)). Coverage is about 98% today. See [Testing](testing.md).

### Fuzz tests

`src/lib/fuzz.test.ts` runs 15 property tests of 300 random inputs each, from a fixed seed so failures repeat, against code that handles untrusted data: uploaded files end to end, dedupe, the Excel export, the API input checks, calendar feeds, AI drafts and the assistant's buttons. It found two bugs, both fixed with regression tests:

- **Impossible calendar dates** ([#84](https://github.com/2026-Arizona-Opportunity-Hack/Git-Happens-CodinginColor/pull/84)). `ical.ts` let `2026-00-00` and Feb 30 through and turned a year-141 start into `141-02-13`. Events with dates that don't exist are now skipped.
- **Characters that break the Excel export** ([#128](https://github.com/2026-Arizona-Opportunity-Hack/Git-Happens-CodinginColor/pull/128)). `xlsx.ts` let U+FFFE and U+FFFF through, and both are illegal in XML. One in an imported cell made Excel refuse the whole export. They're now dropped.

## Known gaps

To fix before CIC loads real donors:

1. **Demo accounts.** The demo password is public in the README because the data is fake. Replace those accounts first.
2. **Assistant buttons for your own donors.** Text planted in a donor record could still talk the assistant into offering a believable button for one of your own donors or drafts. Fix: only offer a button for a donor the latest message names ([#93](https://github.com/2026-Arizona-Opportunity-Hack/Git-Happens-CodinginColor/issues/93)).
3. **The AI gateway sees donor data.** Prompts include donor names, emails and gifts, and the OHack gateway is a third-party proxy. Check with CIC first, or move to Workers AI as [decision 001](decisions/001-ai-model.md) recommends.
4. **No rate limit** on `/api/chat` or `/api/drafts`. Add a per-user daily limit before moving to a model without a hard spend cap.
5. **Dictation in Chrome** sends audio to Google. The browser does this, not the app; board members should know before dictating donor details.
6. **Secret scanning is local only.** The guard hook runs only in Claude Code; CI doesn't scan for secrets yet.
