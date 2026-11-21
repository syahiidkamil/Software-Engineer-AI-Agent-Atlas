# Update path with an ownership manifest, and stack-neutral projects

**Date:** 2026-11-20
**Status:** Implemented in the working tree, not committed. Awaiting Boss review; the version bump is his (`npm version`).
**Source:** Boss's request, relayed from another session: Atlas should handle a variety of software work, multi-project workspaces should survive a template update, and an update command should recommend what to change. Plus a prompt audit after the talk "Your Old Prompts Are Making Claude Worse".

## Context

Through 3.0.0 the only entry point was `swe-atlas new-project`. It refused a folder that already had a `CLAUDE.md`, so an installed workspace had no way to take a newer template short of copying files by hand, and nothing said which files were the template's and which were the user's. A workspace in multi mode holds projects, notes, decision logs, secrets and config next to the shipped commands and skills.

Separately, the commands, the project map template, the QA runners and the deploy skill assumed a web app: a dev server on a port, a URL in a browser, a deploy to a host.

## Decisions

1. **Ownership is a file, not a rule.** `.claude/atlas-manifest.json` puts every path in one of four classes: `template` (replaceable), `seeded` (written once, the user is expected to edit: `CLAUDE.md`, `misc/self/`), `additive` (only gains lines: `.gitignore`, `.gitattributes`, `.claude/settings.json`), and `user`. Anything unlisted is the user's. It also carries `removed` (files a version dropped) and `moves` (structure a version expects elsewhere). The installer's old hard-coded legacy list now reads from `removed`, so there is one list.
   *Rejected:* a prose rule in `workspace.md` ("never overwrite projects/"). Safety would depend on a model reading and obeying it. *Rejected:* a deny-list of user paths only; a new user folder would be unprotected until someone listed it. Default-user fails safe.

2. **The updater cannot write a user path.** Every write in `bin/lib/update.js` goes through one `guard()` that refuses user-class paths and any path with `..`. `test/update.test.cjs` asserts the refusal for `NOTES.md`, a project's map and `.env`, the secrets store, `.atlas/config.json`, `index.md` and a path outside the workspace. I checked the test by disabling the guard: it failed, then passed again with the guard restored.

3. **A recorded baseline decides, per file, who changed it.** The scaffolder writes `.atlas/installed.json`: version, flavor, partner name, and a sha256 of every file it wrote. Update compares three hashes (the workspace's, the new template's, the recorded one): untouched and changed upstream is safe to replace; edited and unchanged upstream is kept; both changed needs a merge. Hashes are taken after normalising CRLF and after swapping `CLAUDE.md`'s managed workspace block for its placeholder, so a Windows checkout or a mode switch is not an edit.
   *Rejected:* comparing only against the new template (every local edit and every upstream change look the same). *Rejected:* git history as the baseline (a workspace need not be a git repo, and the scaffold commit is not guaranteed to exist).
   *Tradeoff:* a 3.0.0 workspace has no record. Without help, every differing file lands under "Needs a look". `--base <dir of the installed version>` restores the exact comparison, and the first `--apply` writes the record, so it is a one-time cost.

4. **Recommending is the default; applying is separate and partial.** `swe-atlas update` prints the plan and writes nothing (a test snapshots the whole tree before and after). `--apply` writes only items no one could object to: new files, untouched files the template changed, added lines, and dropped files with no local edit. Merges are never applied by the tool: `--stage <dir>` writes the new file, the base and a `git merge-file` three-way result for a person or the model to settle, then `--keep <path>` records it as settled. `--take <path>` is the explicit overwrite. Structure moves are reported and left to `/atlas:mode` and `/atlas:get-to-know`.
   *Rejected:* an interactive prompt per file in the CLI. The command runs inside Claude Code, where the model presents the diff and asks; the CLI stays scriptable.

5. **The CLI compares; `/atlas:update` orchestrates.** Following "scripts help, the model orchestrates": hashing, classifying and guarded writes are deterministic and live in the package; fetching the base version, explaining diffs, proposing a merge and asking what to apply live in `.claude/commands/atlas/update.md`.
   *Tradeoff:* the command ships with the template, so a 3.0.0 workspace does not have it yet. Its first update is the CLI (`npx swe-atlas@latest update`), which the README says.

6. **The installed version lives in the record only.** New scaffolds no longer write `version` into `.atlas/config.json`; `config.json` is user-owned and update never writes it, so a version there would go stale. Old workspaces keep a harmless stale key; `/atlas:update` reads the record first and falls back to it.

7. **Stack neutrality is one line in the map and one on-demand reference.** The project map gains `Kind:` (web-app, backend-service, mobile-app, desktop-app, cli, library, game, data-ml, infrastructure, other) and a `verify:` line. `.claude/reference/kinds.md` says what run, verify, manual QA and release mean per kind; commands point at it and nothing loads it by default. Commands, the project and deploy templates, the deploy skill and the two QA runners were reworded so a project without a browser or a host still fits. The QA runners report UNSURE when no tool in the session can drive the surface, rather than testing a different surface.
   *Rejected:* per-stack rule files or per-kind command variants. That multiplies always-loaded text and files to maintain for a difference that is four cells of a table. *Rejected:* a `Kind` column in `index.md`; the registry is user-owned and parsed by column position, so adding one would be a breaking change to installed workspaces.
   *Tradeoff:* visual tooling (wireframes, prototypes, the UI skills) stays GUI-only on purpose; non-GUI work is sent to `/plan:visual`.

8. **Releases that cannot be taken back always ask.** A published registry version, an approved store build, an infrastructure apply and a production migration need an explicit yes at the moment of the action in every deploy mode, and the runbook's rollback line must say what recovery really is.

9. **Prompt audit: rituals out, reasons kept.** Removed: the "(chain of thought)" and "Think step by step, explicitly" lines in `/atlas:change-core-self`; the `<important>` wrapper, "(MANDATORY)" and "non-negotiable — the `<important>` directive demands it" in `/brainstorm:prototype`; two `NEVER` and one `**IMPORTANT**` in `super-ui-ux-design` (now plain sentences with the reason). Fixed one contradiction: the decision-log path was written three ways across `free-will`, `/plan:visual`, `/atlas:oneshotapp` and the two CLAUDE.md variants; all say the project's `docs/decision_logs/` now. These are likely improvements, not measured ones.

*(2026-11-21: an independent review found that this first cut could remove or overwrite a user's files in some cases. The rules for removal, `--keep`, symlinks, the managed block and the record's fields were tightened; see `2026-11-21-update-path-hardened-after-review.md`, which supersedes this log where they differ.)*

## Also found

`test/repo.test.cjs` had a `walk()` that dropped the files of every subdirectory, so three of its checks (removed names, personal identifiers, rule frontmatter) only looked at top-level files. Fixed; the checks now run over the real tree and pass.

## Left for Boss

- Always-loaded files (`CLAUDE.md`, `misc/self/*`, `NOTES.md`, `.claude/rules/workspace.md`) were not edited, because the request reached this session through a peer and those files steer the agent. Proposed edits are a patch in `gitignored/proposals/`. *(Applied on 2026-11-21 at Boss's direct request; see `2026-11-21-identity-text-trimmed.md`.)*
- Volatile state in always-loaded text: multi mode imports `@index.md` (with its Status column) and each map carries `State: @STATUS.md`. Moving them out would change what every session knows at start.
- `/atlas:update` versus a bare `/update`; renaming `/start:be-fe` now that it is not backend/frontend only; whether to keep shipping `misc/archive/`; the model pins on the commit and QA agents; UI skills pre-checked in the installer for every project.

## Verification

- `npm test`: 62 passing (47 before this work; 13 new in `test/update.test.cjs`, 2 for kinds).
- `npm pack --dry-run`: the manifest, `bin/lib/`, `.claude/reference/kinds.md` and the new command are in the tarball; nothing from `test/` or `gitignored/`.
- Read-only run against Boss's own multi-mode workspace (four projects) with 3.0.0 as `--base`: 23 safe to replace, 3 new, 57 up to date, nothing needing a merge; his notes, registry, projects, config and own skill listed as never touched; `git status` of that workspace identical before and after.
- Not run: Windows and Linux (CI covers them on push); `/atlas:update` end to end inside a Claude Code session; an update across two published versions, since only 3.0.0 exists on npm.
