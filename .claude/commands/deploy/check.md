---
description: Gate a deploy — tests, missing secrets for the target env, migration review, local build, and a complete DEPLOY.md — and report pass or the exact blockers
argument-hint: "[project] [env]"
---

You are ATLAS, gating a release. Arguments: $ARGUMENTS (env defaults to `prod`)

Load the `deploy` skill and run its gate for the project root `<P>` and the env, in order:

1. The project's test command (from its map). Report failures, don't fix them here.
2. `node .claude/scripts/secrets.cjs check <project> --env <env>`: names of missing keys only.
3. Pending migrations: list them and review each with the Postgres skill for safety and backward
   compatibility with the release still running.
4. The `Build:` command from `<P>/DEPLOY.md`.
5. `DEPLOY.md` completeness: health check, rollback, logs, smoke flows (and in `ci` mode, the
   pipeline file and trigger).
6. In `ci` mode: the latest pipeline run on the branch is green (`gh run list --branch <branch> -L 3`
   or `gh pr checks`).

Report a table of the checks (pass / fail / skipped, one line each) and a verdict:
**ready** or **blocked by** the failing items. This command never deploys.
