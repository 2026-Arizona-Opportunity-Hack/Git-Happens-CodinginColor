# Security audits

AI security reviews of pull requests, one Markdown report per audit. Each file
is named `<date>-pr-<number>-<model>-<commit>.md` and starts with which PR,
commit and model it covers.

`.github/workflows/security-review.yml` writes them when someone asks for an
audit (an `ai-review` label on a PR, or a run from the Actions tab) and opens a
PR that adds the report here. Merge it to keep the record. The reports are
advice from a model, not a sign-off: check each finding before acting on it,
and note in the fixing PR which report it answers.

To save one from a local session, run `/security-review` in Claude Code and
save its answer here with the same naming.
