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
- **Two roles, set in WorkOS.** *Admin* sees every donor and can import, assign, edit program outcomes and manage API keys. *Member* sees only the donors assigned to them.
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

## Reviews

The AI security review workflow (see [Operations](operations.md#ai-security-review)) saves its reports in [`audits/`](../audits/). The whole-repo audit of Nov 15 (`audits/2026-11-15-repo-claude-bb64a5f.md`) found no issues: every donor route filters by owner, every query is bound, and the only key-shaped strings in the history are placeholders. The muse-wonder audit of the same day (`audits/2026-11-15-repo-muse-wonder-19b9b26.md`) found a prompt-injection path through donor text, now partly fixed (see Known gaps).

## Known gaps

To fix before CIC loads real donors:

1. **Demo accounts.** The demo password is public in the README because the data is fake. Replace those accounts first.
2. **Dev tools.** `DEV_TOOLS` is `"true"`, which lets any admin clear the whole donor database. Remove it as described in [Dev tools](features/dev-tools.md).
3. **Assistant buttons for your own donors.** Text planted in a donor record could still talk the assistant into offering a believable button for one of your own donors or drafts. Fix: only offer a button for a donor the latest message names ([#93](https://github.com/2026-Arizona-Opportunity-Hack/Git-Happens-CodinginColor/issues/93)).
3. **The AI gateway sees donor data.** Prompts include donor names, emails and gifts, and the OHack gateway is a third-party proxy. Check with CIC first, or move to Workers AI as [decision 001](decisions/001-ai-model.md) recommends.
4. **Sessions in localStorage.** AuthKit runs in `devMode` because a WorkOS custom domain costs $99/month, so the session is readable by any script on the page. Moving to a custom domain puts it in an HttpOnly cookie.
5. **No rate limit** on `/api/chat` or `/api/drafts`. Add a per-user daily limit before moving to a model without a hard spend cap.
6. **Dictation in Chrome** sends audio to Google. The browser does this, not the app; board members should know before dictating donor details.
7. **Secret scanning is local only.** The guard hook runs only in Claude Code; CI doesn't scan for secrets yet.
