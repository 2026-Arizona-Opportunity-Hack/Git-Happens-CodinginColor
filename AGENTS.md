# Working agreements for AI coding tools

You are helping **Git Happens** build a project for **Coding in Color** at
[ASU Fall Hackathon 2026 | Phoenix Hackathon for Nonprofits: Nov 14-15](https://www.ohack.dev/hack/fall-2026). Read this before suggesting or making changes.

## The one repository rule (most important)

**All code lives in this repository and nowhere else.** Never suggest, scaffold or
push to a new repository — not under a teammate's account, not a second repo in the
org, not a fork used as "the real one". If someone has code elsewhere, help them
move it here (copy the files in, or add this repo as a remote and push a branch),
then delete the stray repo. Judges, the Team Dashboard, the public project page and
the nonprofit all read this repo only; work anywhere else does not count.

## Who this is for

- Nonprofit: [Coding in Color](https://www.ohack.dev/nonprofit/YIXYdYCoxIZC08uQ5DL3). Problem statement: [Donor & Funder Relationship Platform (CIC Problem 2)](https://www.ohack.dev/project/e26932c0df1b11f189a8dead68f07eb5).
- The nonprofit is the user. Prefer the simplest thing that works for them over
  clever architecture; they will have to run this after the weekend.
- Questions for the nonprofit go in their Slack channel [#npo-coding-in-color](https://opportunity-hack.slack.com/app_redirect?channel=npo-coding-in-color);
  the team talks in [#githappens](https://opportunity-hack.slack.com/app_redirect?channel=githappens); mentors are in
  [#ask-a-mentor](https://opportunity-hack.slack.com/archives/C01E5CGDQ74).
- Everything here is open source (MIT). Never add proprietary or copied code.

## Final-day clock

Demo video time is Sun Nov 15, 12:00 PM MST; hacking ends Sun Nov 15, 2:00 PM MST. After demo time, steer toward finishing, recording and submitting — not new features.

- Sun Nov 15, 11:00 AM MST — Presentation Feedback Hour
- Sun Nov 15, 12:00 PM MST — Start recording your demo video
- Sun Nov 15, 12:30 PM MST — Judges Arrive
- Sun Nov 15, 2:00 PM MST — 🛑 Submission Deadline: Hacking ends
- Sun Nov 15, 2:05 PM MST — Judging Round 1
- Sun Nov 15, 3:40 PM MST — Judging Final Round
- Sun Nov 15, 4:30 PM MST — Closing Ceremony: Winners Announced

Submission happens on the Team Dashboard (https://www.ohack.dev/hack/fall-2026/manageteam): project story,
demo video link (4 minutes or less; YouTube, Vimeo, Loom or
Google Drive), then Submit. If someone asks "what's left?", answer from that list.

## Pull requests

- **One change per PR.** Aim for under 400 changed lines; if a
  change is bigger, propose a split before writing code.
- **Title:** imperative, under 72 characters — `Add volunteer
  sign-up form`, not `Updates`.
- **Description:** under 500 words, in the template order:
  what changed, why, how to test it, screenshots for UI. Short beats complete.
- Open PRs with `gh pr create` using the repo's template; never force-push a
  shared branch.
- Commit messages explain *why*; the diff already shows *what*.

## Judging — build toward the rubric

Judges score **Scope** (does it solve the nonprofit's real problem?),
**Documentation** (can someone else run and extend it?), **Polish** (does it
work end to end without hand-holding?) and **Security** (no secrets in git,
input validated, auth where it matters), plus a separate **Accessibility**
prize. Rubric: https://www.ohack.dev/hackathon-judging-criteria

## Public credit

Work is documented as **GitHub Issues** — one per task or decision, closed by
the PR that lands it. Recruiters and the nonprofit read this repo later; Slack
disappears. When planning, offer to write the issues.

## Secrets and keys

- Never commit `.env`, API keys, tokens or credentials. Use `.env.example` with
  placeholder values and keep real values local. The OHack AI gateway key from
  your team card is a secret too.
- A pre-commit guard in `.claude/hooks/guard-secrets.sh` blocks commits that
  contain things that look like keys; don't work around it, move the value to `.env`.

## Documentation

Docs are part of the change, not a follow-up. `docs/README.md` explains the
layout; the short version:

- **Before changing a file, read its doc.** `bun run docs:which <file>` names
  it. Each doc's frontmatter `covers` lists the code it describes, so that
  doc (not the whole README) is the context you need.
- **Update the doc in the same PR.** The Docs workflow fails a PR that changes
  covered code without touching one of its docs. If nothing a reader relies on
  changed, write `Docs: not needed — <reason>` in the PR description instead.
  Don't use that to skip a real update.
- **New page or module:** add it to the `covers` of the doc that describes
  it, or write `docs/features/<page>.md`. Uncovered code fails the check.
- **New setting or secret:** add it to the table in `docs/operations.md`, and
  to `.env.example` if it's needed locally.
- **A choice between real options** (a library, a service, a data shape):
  write `docs/decisions/NNN-title.md`. Ask the user for the reasoning
  rather than inventing it.
- **Don't duplicate what code generates.** The API reference comes from
  `worker/openapi.ts`; update the spec, not prose.
- Keep `README.md` the front door: what it does, live link, demo link, how to
  run it. Details go in `docs/`. The README is part of the submission.
