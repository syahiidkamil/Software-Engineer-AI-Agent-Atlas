---
description: Stage all working-directory changes and commit them autonomously, in coherent commits, until the working tree is clean.
disable-model-invocation: true
context: fork
agent: commit
---

Run in **stage-and-commit mode**.

Autonomously stage and commit every change in the working directory — no approval needed — repeating until `git status` is clean.

Never stage junk: `.DS_Store`, editor/IDE files, `*.log`, build artifacts, `.env` or other secrets. If `.gitignore` doesn't already exclude them, leave them unstaged and say so.

Group related changes into separate, coherent commits following the ATLAS commit convention. Don't lump everything into one mega-commit.
