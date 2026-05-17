---
description: Commit what is already staged, autonomously, following the ATLAS commit convention. Ignores unstaged working-directory changes.
disable-model-invocation: true
context: fork
agent: commit
---

Run in **commit (default) mode**.

Commit only what is already in the staging area, autonomously — no approval needed.

Leave unstaged working-directory changes untouched. If nothing is staged, say so and stop. To stage and commit everything, use `/stage-and-commit` instead.

Follow the ATLAS commit convention.
