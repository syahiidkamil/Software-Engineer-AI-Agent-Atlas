---
description: Switch this ATLAS workspace between repo, project, and multi mode. Prints the full migration plan first and changes nothing until you say yes.
argument-hint: "<repo|project|multi> [project-name]"
disable-model-invocation: true
---

You are ATLAS, moving this workspace to a different mode. Target and options: $ARGUMENTS

| Mode | Shape |
|---|---|
| `repo` | ATLAS files inside one code repo, at its root. Map: `PROJECT.md` |
| `project` | ATLAS root wraps one project; code repos in `repos/<name>/`, each its own git. Map: `PROJECT.md` |
| `multi` | many projects in `projects/<name>/` (map: each one's `CLAUDE.md`), plus `index.md` and `general/` |

## 1. Read the current state

Run `node .claude/scripts/mode.cjs current`, then look at what actually exists: the root
`CLAUDE.md`, `PROJECT.md` (or a legacy `.claude/rules/PROJECT.md`), `STATUS.md`, `DEPLOY.md`,
`.env.example`, `docs/`, `misc/`, `repos/` or `projects/`, `.claude/rules/design/` (and a legacy
`.claude/rules/DESIGN.md`), `.mcp.json`. Check `git status`: if the tree is dirty, say so and
suggest committing first, so the move is easy to review and undo.

If no target was given, ask which mode. If the target needs a project name (project -> multi uses
the current project's name by default), confirm it.

## 2. Write the migration plan

List every move, every file created, edited, or removed. Use these transitions:

| From -> To | What happens |
|---|---|
| project -> multi | `PROJECT.md` -> `projects/<p>/CLAUDE.md`; `STATUS.md`, `DEPLOY.md`, `.env.example`, `.env.local` -> `projects/<p>/`; every `docs/*` except `external-information/` and `learning-from-mistakes/` (lessons stay shared at the root) -> `projects/<p>/docs/`; every `misc/*` except `self/`, `archive/`, `images/` -> `projects/<p>/misc/`; `repos/*` -> `projects/<p>/repos/`; create `index.md` (one row for `<p>`) and `general/.gitkeep` |
| multi -> project | only when exactly one project remains: the reverse. `projects/<p>/CLAUDE.md` -> `PROJECT.md`, everything else in `projects/<p>/` up to the root, merging into existing folders; remove `index.md`; leave a non-empty `general/` in place and say so |
| repo -> project or multi | create a new workspace folder next to the repo (ask for its name; default `<repo>-workspace`); **copy** the ATLAS files (`.claude/` without `worktrees/`, `.atlas/`, `CLAUDE.md`, `NOTES.md`, `misc/self/`, `misc/archive/`, `docs/learning-from-mistakes/`) and the project memory (`PROJECT.md`, `STATUS.md`, `DEPLOY.md`, and ATLAS's own `docs/` and `misc/` folders, not the app's) into the new layout. The repo itself is not moved by you: print the exact `mv` for the user, because moving it breaks dev servers and session history |
| project or multi -> repo | ask which repo receives ATLAS; **copy** ATLAS and that project's memory into it (`projects/<p>/CLAUDE.md` or `PROJECT.md` becomes the repo's `PROJECT.md`); leave the old workspace untouched |

Along with the moves:
- **Design rules** in `.claude/rules/design/*.md` keep working only if their `paths:` follow the
  files: add or strip the `projects/<p>/` or `repos/<name>/` prefix. In multi mode a legacy
  `.claude/rules/DESIGN.md` (no `paths:`, so it loads everywhere) becomes
  `.claude/rules/design/<p>.md` with `paths: ["projects/<p>/**/*.{tsx,jsx,css,scss,html,astro,vue,svelte,mdx}"]`
  added as frontmatter above its content.
- **Parallel safety** in multi mode: if `.mcp.json` gives Playwright `--user-data-dir`, replace it
  with `--isolated`; a shared persistent profile collides between sessions.
- **Conflicts**: never overwrite. If a destination file exists, list it as a conflict and stop
  until the user decides.
- **Folders with their own git** (child repos): warn before moving them. Stop their dev servers
  first; Python virtualenvs store absolute paths and must be recreated; absolute paths in scripts
  and editor workspace files break; Claude Code lists past sessions by folder path, so sessions
  started inside a moved folder won't show from the new path. Prefer adopting a repo where it
  sits over moving it, when the user has a choice.

Show the plan as a short table or list, then ask with AskUserQuestion: "Apply this plan?" Change
nothing before the answer is yes.

## 3. Apply

- Tracked files move with `git mv` so history follows (`git ls-files -- <path>` tells you whether
  a path is tracked). Untracked and ignored folders, including child repos, move with plain `mv`.
  Create destination parents first.
- Edit design rule `paths:` and `.mcp.json` as planned.
- Finish with the bookkeeping helper, which writes `.atlas/config.json`, rewrites the managed
  workspace block in the root `CLAUDE.md`, and adds the `.gitignore` lines the new mode needs:
  `node .claude/scripts/mode.cjs set <mode> [--project <name>]`
  (for repo -> project/multi and -> repo, run it from the new location's copy:
  `node <new-root>/.claude/scripts/mode.cjs set <mode>`).

## 4. Verify and report

Run `mode.cjs current` again, check that every planned destination exists and that no source was
left half-moved, and in multi mode run `node .claude/scripts/project.cjs status` to refresh
`index.md`. Report what moved, the warnings that apply, and the next steps (for example the `mv`
of the repo, or opening Claude Code in the new folder). Remind the user to review with
`git status` and commit.
