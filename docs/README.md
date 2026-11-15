---
title: How these docs work
covers:
  - scripts/check-docs.ts
  - .github/workflows/docs.yml
  - .github/pull_request_template.md
---

# How these docs work

The docs are written for two readers: people (CIC, the next developer, judges) and coding agents. Both want the same thing: the one short page about the part they're changing, not the whole repo. Each doc covers one thing and says which code it describes, and CI fails a PR that changes the code without its doc.

## Layout

| Path | One doc per | Write it when |
|---|---|---|
| `features/<page>.md` | page or cross-page feature | you add a page or change what one does |
| `architecture.md` | – | the request flow, stack or shared code changes |
| `operations.md` | – | a setting, secret, deploy step or outside service changes |
| `security.md` | – | who can see what changes, or you find or close a gap |
| `testing.md` | – | how tests run, or which test covers a feature, changes |
| `decisions/NNN-title.md` | decision | you choose between real options and the next person would ask why |

What the code can say for itself stays in the code: the API reference is generated from `worker/openapi.ts` (served at `/api/docs`), and search words are the `keywords` in `NAV`. Don't copy those into prose.

## Frontmatter

Every doc starts with:

```markdown
---
title: Follow-ups
audience: everyone          # features only: everyone, admins, …
covers:
  - src/pages/FollowUps.tsx # files, or folders (everything inside counts)
  - src/lib/drafts.ts
---
```

`covers` is the contract. It's how `bun run docs:which <file>` finds the doc for a file, and how CI knows which doc a change should touch.

A feature doc says, in this order: what the page does and who it's for; edge cases (what happens with no data, bad input, the wrong role); and "Where the code is", with the tests that cover it.

A decision record has `status` (proposed, accepted, superseded by NNN) and `date` in its frontmatter, then three parts: **Context** (the problem and the options), **Decision**, **Consequences** (what it costs, and what would make us revisit it). Number them in order and never reuse a number. Supersede an old decision with a new one rather than editing it.

## The check

`scripts/check-docs.ts` runs in the **Docs** workflow on every PR and push. It fails when:

1. a `covers` path no longer exists (the doc is stale);
2. a file in `src/pages`, `src/components`, `src/lib`, `src/data` or `worker` is covered by no doc (tests and `src/components/ui` are exempt);
3. the Worker reads an `env.X` that `operations.md` doesn't list;
4. on a PR, a changed file is covered by docs and none of them changed.

For a change that really needs no doc update (a refactor, a typo, a test-only fix), put a line in the PR description:

```
Docs: not needed — renames a variable, behaviour unchanged
```

The workflow re-runs when the description is edited. Use it honestly: if a reviewer would need to know about the change, it goes in the doc.

Run it locally before pushing:

```bash
bun run docs:check                          # everything CI checks, against origin/main
bun run docs:which src/lib/dedupe.ts        # which docs cover a file
```
