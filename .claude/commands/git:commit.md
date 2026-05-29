---
description: Commit what is already staged — runs the commit subagent in the background, following the ATLAS commit convention.
disable-model-invocation: true
---

Launch the `commit` subagent **in the background** — call the Agent tool with `subagent_type: commit` and `run_in_background: true`.

Before passing the task, replace `{{CURRENT_MODEL}}` below with **your own current model identity** (from your environment — e.g. `Opus 4.8 (1M context)`). This keeps the commit credit accurate as the model changes, instead of hardcoding a version that goes stale.

Pass it this task:

> Run in **commit (default) mode**. Commit only what is already in the staging area, autonomously — no approval needed. Leave unstaged working-directory changes untouched. If nothing is staged, say so and stop. To stage and commit everything instead, that's `/git:stage-commit`. Follow the ATLAS commit convention, and end the commit message with this trailer verbatim:
> `Co-Authored-By: Claude {{CURRENT_MODEL}} <noreply@anthropic.com>`

Don't block on it: report that the commit agent has been launched in the background and carry on. You'll be notified when it finishes.
