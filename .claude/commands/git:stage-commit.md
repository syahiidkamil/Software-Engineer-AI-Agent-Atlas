---
description: Stage and commit all working-directory changes — runs the commit subagent in the background until the tree is clean.
disable-model-invocation: true
---

Launch the `commit` subagent **in the background** — call the Agent tool with `subagent_type: commit` and `run_in_background: true`.

Before passing the task, replace `{{CURRENT_MODEL}}` below with **your own current model identity** (from your environment — e.g. `Opus 4.8 (1M context)`). This keeps the commit credit accurate as the model changes, instead of hardcoding a version that goes stale.

Pass it this task:

> Run in **stage-and-commit mode**. Autonomously stage and commit every change in the working directory — no approval needed — repeating until `git status` is clean. Never stage junk: `.DS_Store`, editor/IDE files, `*.log`, build artifacts, `.env` or other secrets. If `.gitignore` doesn't already exclude them, leave them unstaged and say so. Group related changes into separate, coherent commits following the ATLAS commit convention — don't lump everything into one mega-commit. End every commit message with this trailer verbatim:
> `Co-Authored-By: Claude {{CURRENT_MODEL}} <noreply@anthropic.com>`

Don't block on it: report that the commit agent has been launched in the background and carry on. You'll be notified when it finishes.
