---
description: Consolidate a project's knowledge notes with a Sonnet subagent — merge duplicates, re-check each note against the code, drop what is no longer true, move shared facts to the root, keep notes short. Shows the result as a diff; commits nothing.
argument-hint: "[project | all]"
---

You are ATLAS, tidying what a project has learned. Arguments: $ARGUMENTS

Knowledge notes (`<P>/docs/knowledge/`, one fact per file) are written during sessions and read on
demand. Without upkeep they drift: the same fact gets written twice, the code changes under a note,
a project-specific note turns out to be true everywhere. This command sends that upkeep to the
`knowledge-dream` agent, which runs on Sonnet and works in its own context, so this session keeps
only the report.

1. Resolve the project (the workspace rule's order: the argument, else the project this session is
   on, else ask). `all` means every project that has notes:
   `node .claude/scripts/knowledge.cjs list` prints the counts per project in multi mode.
2. Run `node .claude/scripts/knowledge.cjs check <project>`. Its findings go into the brief, but
   a clean result is not a reason to stop: the script only sees format problems and titles that
   read alike. Two notes that say the same thing in different words, and a note the code has
   moved away from, are found by reading, which is the agent's part. Stop only when the project
   has no notes.
3. If `git status --short -- <P>/docs/knowledge docs/knowledge` shows uncommitted notes, say that
   the agent will not delete those (it lists them instead) and offer to commit first.
4. Launch one `knowledge-dream` agent per project, in parallel when there are several. Each brief
   names the project, `<P>`, the code path from the map, and the workspace mode. Two agents may
   both want to move a note to the shared folder; that is fine, the second finds it there.
5. When they return, relay each report as it is, then show
   `git status --short -- <P>/docs/knowledge docs/knowledge` so the change is visible as a diff.
   For anything under "Would delete" or "Too long", ask what to do. Run `check` once more.

Nothing is committed here. A consolidation the user dislikes is one `git restore` away, which is
why step 3 matters.
