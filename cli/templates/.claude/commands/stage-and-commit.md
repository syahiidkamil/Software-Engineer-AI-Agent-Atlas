---
description: Stage and commit all working-directory changes — runs the commit subagent in the background until the tree is clean.
disable-model-invocation: true
---

Launch the `commit` subagent **in the background** — call the Agent tool with `subagent_type: commit` and `run_in_background: true`.

Pass it this task:

> Run in **stage-and-commit mode**. Autonomously stage and commit every change in the working directory — no approval needed — repeating until `git status` is clean. Never stage junk: `.DS_Store`, editor/IDE files, `*.log`, build artifacts, `.env` or other secrets. If `.gitignore` doesn't already exclude them, leave them unstaged and say so. Group related changes into separate, coherent commits following the ATLAS commit convention — don't lump everything into one mega-commit.

Don't block on it: report that the commit agent has been launched in the background and carry on. You'll be notified when it finishes.
