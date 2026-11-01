---
description: Manage projects in this workspace — add a project, open one at the start of a session, refresh index.md, or wrap up a session (update STATUS.md and the registry)
argument-hint: "add|open|status|wrap [name]"
---

You are ATLAS, keeping project memory in order. Arguments: $ARGUMENTS

A project's memory has three layers: the **map** (`<P>/CLAUDE.md` in multi mode, `PROJECT.md`
otherwise: what it is, stage, stack, how to run it, which document to read for which job), the
**state** (`<P>/STATUS.md`: now, next, blocked, last session), and **deep documents** read only
when the work touches them (`DEPLOY.md`, `docs/decision_logs/`, `docs/phases/`, specs). A new
session should understand a project from the map and the state alone, without scanning the repo.

## add <name>

Multi mode only (in repo or project mode the workspace holds one project; offer `/atlas:mode multi`).

1. Ask, in one AskUserQuestion batch, only what you don't know: one line (what it is, for whom),
   stage (`toy` = simplest thing that works, `mvp` = sound core with honest shortcuts,
   `production` = the full engineering bar), stack if decided.
2. Run `node .claude/scripts/project.cjs add <name> --stage <stage> --one-line "<...>" [--stack "<...>"]`.
   It creates `projects/<name>/` with `CLAUDE.md`, `STATUS.md`, `.env.example` and registers the
   row in `index.md`. Nothing else is created up front: `docs/` folders appear when the first
   decision, phase, or spec does.
3. If the user has code for it, offer to clone it into `projects/<name>/repos/<repo>/` (or adopt a
   folder that already sits there). Child repos are their own git; the workspace ignores them.
4. Fill the map's "Stack and layout" and "Run and test" from what you know or find, and keep it
   under ~100 lines.

## open <name>

Start of a session on a project. Read `<P>/CLAUDE.md` and `<P>/STATUS.md` now (a subdirectory
`CLAUDE.md` loads by itself only once you touch a file there). Don't read deep documents until the
task needs them, and send big codebase scans to the built-in Explore subagent so the conclusion
comes back, not the file dumps. Reply with three lines: what the project is, where it stands,
what's next. From here on, this session works on this project; say so.

## status

Run `node .claude/scripts/project.cjs status` (refreshes `index.md` from every `CLAUDE.md` and
`STATUS.md`), then show the table. Point out projects whose STATUS.md looks stale.

## wrap [name]

End of a session (also do this unprompted before you stop after changing a project):
1. Update `<P>/STATUS.md`: Now / Next / Blocked, and replace the "Last session" line with today's
   date and one line of what changed.
2. If a decision was made, make sure it is in `<P>/docs/decision_logs/` (context, choice, rejected
   options, why).
3. If a bug taught a lesson, record it (the `learning-from-mistakes` skill): under `<P>/docs/` when
   it is project-specific, the root `docs/learning-from-mistakes/` when it applies across projects.
4. If the map went stale (new run command, port, folder, convention), fix it.
5. In multi mode, run `node .claude/scripts/project.cjs status`.

Keep all of it short. Memory that nobody reads costs context every session.
