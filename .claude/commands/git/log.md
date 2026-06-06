---
description: Show recent git commits with a brief summary and continual context tied to the working directory / staging area.
argument-hint: "[count]"
---

Run `git log` to show recent commits, then add a short summary and any context that links those commits to the current working state.

Argument: $ARGUMENTS

- If `$ARGUMENTS` is a positive integer, use it as the commit count.
- Otherwise (empty, non-numeric, or zero/negative), default to **5**.

## Steps

1. Run these in parallel via the Bash tool:
   - `git log -n {count} --oneline --decorate` — the commit list
   - `git status --short` — current working / staging state
   - `git diff --stat HEAD` — what's changed since HEAD (staged + unstaged)

2. **Show the raw `git log` output first**, verbatim. Do not paraphrase commits.

3. **Summary** (2–4 bullets max). Cluster the commits by theme (feature area, refactor, chore, bug fix). Lead with what changed, not the commit subjects. Skip if the commits are unrelated noise.

4. **Continual context** — only include if there is a real link between recent commits and the current working/staging state. For each linked file or area:
   - Name the commit(s) that last touched it
   - Note whether the current change extends, reverts, or diverges from that direction
   - Flag risks: e.g. "commit X just refactored this file; staged change re-edits the same lines — check for conflicts with the new structure"

   If nothing in the working tree relates to the shown commits, write a single line: `No overlap between recent commits and current working state.` and stop.

## Rules

- Keep it tight. The summary and context together should rarely exceed 10 lines.
- Don't speculate. If a connection isn't clear from the diff + log, don't invent one.
- Don't restate the commit subjects in the summary — Boss already sees them.
- Don't run extra commands (file reads, blame, etc.) unless the overlap is ambiguous and Boss would otherwise be misled.
