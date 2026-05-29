---
description: Commit what is already staged — runs the commit subagent in the background, following the ATLAS commit convention.
disable-model-invocation: true
---

Launch the `commit` subagent **in the background** — call the Agent tool with `subagent_type: commit` and `run_in_background: true`.

Pass it this task:

> Run in **commit (default) mode**. Commit only what is already in the staging area, autonomously — no approval needed. Leave unstaged working-directory changes untouched. If nothing is staged, say so and stop. To stage and commit everything instead, that's `/git:stage-commit`. Follow the ATLAS commit convention.

Don't block on it: report that the commit agent has been launched in the background and carry on. You'll be notified when it finishes.
