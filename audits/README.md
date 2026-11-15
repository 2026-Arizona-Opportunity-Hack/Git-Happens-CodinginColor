# Security audits

AI security reviews, one Markdown report per audit. Each file is named
`<date>-pr-<number>-<model>-<commit>.md` for a PR or
`<date>-repo-<model>-<commit>.md` for the whole repo, and starts with what,
which commit and which model it covers. What each one found and how it was
fixed is in [docs/security.md](../docs/security.md#ai-security-audits).

`.github/workflows/security-review.yml` writes them when someone asks for an
audit (an `ai-review` label on a PR, or a run from the Actions tab) and opens a
PR that adds the report here. Merge it to keep the record. The reports are
advice from a model, not a sign-off: check each finding before acting on it,
and note in the fixing PR which report it answers.

To save one from a local session, run `/security-review` in Claude Code and
save its answer here with the same naming.
