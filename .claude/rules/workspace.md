# Workspace

The mode lives in `.atlas/config.json` (no file means `repo`). `node .claude/scripts/mode.cjs current` prints it.

| Mode | Project root `<P>` | Code |
|---|---|---|
| `repo` | `.` (the map is `PROJECT.md`) | the root itself |
| `project` | `.` (the map is `PROJECT.md`) | `repos/<name>/`, each its own git |
| `multi` | `projects/<name>/` (the map is its `CLAUDE.md`) | `projects/<name>/repos/<name>/`, or the project folder itself |

## Which project

Every command that reads or writes project files resolves `<P>` first: the project named in the
arguments, else the project this session is already working on, else ask once (list the projects
from `index.md`, plus `general/` for work that belongs to none). There is no global "active
project": several sessions may run in parallel on different projects, so each session carries its
own. Before working on a multi-mode project, read its `CLAUDE.md` and `STATUS.md`.

## Where things go

Project artifacts live under `<P>`, never in a shared root folder: `docs/decision_logs/`,
`docs/phases/`, `docs/plans/`, `docs/living-spec-docs/`, `docs/living-test-cases/`,
`docs/deploys.md`, `misc/prototypes/`, `misc/wireframes/`, `misc/test-runs/`, `misc/screenshots/`.
Create a folder when its first file appears; memory grows with the project. Lessons that apply
across projects go in the root `docs/learning-from-mistakes/`, project-specific ones under `<P>`.
Before ending a session that changed a project, update its `STATUS.md` (Now / Next / Blocked, one
line under Last session).

## Parallel safety

- Browser: Playwright CLI sessions are named per project (`playwright-cli -s=<project> ...`); a
  persistent profile, when needed, lives in `<P>/misc/.playwright/profile`. Playwright MCP runs
  `--isolated`.
- Dev servers: ports are recorded in the project map; check with `node .claude/scripts/port.cjs <port>`.
- Two sessions on the same project use git worktrees.

## Secrets

Secret values never appear in chat, logs, commits or command output. Refer to keys by name only.
Use `node .claude/scripts/secrets.cjs keys|check|link|run` (names only; `run` masks values in
output). Never read `.atlas/secrets/` or real `.env` files; `.env.example` is the contract and is
fine to read and edit. When a key is missing, ask the user to store it themselves: in their own terminal
`node .claude/scripts/secrets.cjs set KEY` (hidden prompt), or from Claude Code after copying it,
`! pbpaste | node .claude/scripts/secrets.cjs set KEY` (Linux `wl-paste`, Windows
`powershell -c Get-Clipboard`). Never ask them to paste a key into chat.

## Databases

Use `node .claude/scripts/db.cjs <name> -c "..."` (registered connections; `db.cjs list`).
Default to the dev connection; touch staging or prod only when the user names it. Production
entries start every transaction read-only (an accident guard, not enforcement; a SELECT-only role is
the hard guarantee), and never switch that off. Show any destructive statement and ask before running it on a writable
connection. Migrations run through the project's migration tool, never as ad-hoc SQL against prod.
