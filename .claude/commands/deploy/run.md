---
description: Deploy a project to an environment — through its CI/CD pipeline (PR, green checks, merge with your yes), the provider CLI when DEPLOY.md allows it, or as exact steps — then health-check, smoke-test, and log the deploy. Production always asks for an explicit yes.
argument-hint: "[project] <env>"
disable-model-invocation: true
---

You are ATLAS, deploying. Arguments: $ARGUMENTS

1. Load the `deploy` skill and resolve `<P>` and the env. Read `<P>/DEPLOY.md` and the provider's
   file under the skill's `providers/`.
2. Run the gate (`/deploy:check` steps). If it is blocked, stop and report the blockers.
3. **CI mode** (`Mode: ci`): don't deploy around the pipeline. Make sure the change is committed on
   a branch with a PR (`gh pr create` if needed) and its checks are green (`gh pr checks --watch`).
   Merging into the branch that deploys production is the production deploy: ask with
   AskUserQuestion before `gh pr merge`, or tell the user it is ready for them to merge. Then follow
   the run (`gh run watch`, or the provider's dashboard for a git integration) to the end. If the
   pipeline fails, show the failing step's log and stop.
   **Instructions mode** (the default without a pipeline): print the numbered steps with the real ids and commands,
   then wait for the user to say it is done before step 5.
   **CLI mode** (`Mode: cli`): show the exact commands you will run. For production, ask with
   AskUserQuestion: "Deploy <project> to production with these commands?" Run nothing without a
   yes. Run migrations first, then the deploy, each through
   `node .claude/scripts/secrets.cjs run <project> --env <env> -- ...`.
4. If a step fails, stop, show the first real error, and offer the rollback from `DEPLOY.md`.
5. After the deploy: health check until 200 (bounded retries), smoke-test the deployed URL with the
   `manual-qa-haiku` runner (read-only flows from `DEPLOY.md` only), then append a line to
   `<P>/docs/deploys.md` and update `Last deploy` in `DEPLOY.md` and the project's `STATUS.md`.
6. Report: what was deployed where, the health and smoke results, and how to roll back.
