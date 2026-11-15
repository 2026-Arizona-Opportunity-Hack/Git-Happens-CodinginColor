# Security audit: whole repo

| | |
|---|---|
| Scope | Whole repo on `main` |
| Commit | `bb64a5f` |
| Model | claude |
| Date | 2026-11-15 |
| Run | https://github.com/2026-Arizona-Opportunity-Hack/Git-Happens-CodinginColor/actions/runs/43736963739 |

I read `README.md`, `wrangler.jsonc`, all of `worker/index.ts`, `src/lib/api.ts`, the iCal parser, the chat Markdown renderer, `SendDraft.tsx`, `.env.example` and the three workflows. I scanned the working tree and the git history for key-shaped strings. The only hits were placeholders in `.env.example` and the example key in `worker/openapi.ts`. Every donor route goes through `loadDonor` or `loadDraft`, which filter by owner, and every query uses bound parameters. The admin-only routes call `requireAdmin`, and `/api/v1` checks the key's hash against D1.

No security issues found.
