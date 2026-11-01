# ATLAS v3: multi-project workspaces, project memory, secrets, psql, deploy

**Date:** 2026-11-01
**Status:** Implemented, awaiting Boss review (version bump left to `npm version major`)
**Source:** the local improvement notes (`gitignored/improvement-notes/`, files 00–12)

## Context

ATLAS had to become one software-engineering agent that holds many projects end to end (intent,
prototype, build, test, deploy), remembers each project without a full repo scan, works on macOS,
Linux and Windows, and stays usable inside one repo or around one project. Meanwhile Claude Code
shipped plan mode, the Explore and Plan subagents, `/code-review`, `/simplify`, `/goal`, and
workflows, which made several ATLAS agents redundant.

## Decisions

1. **Subtract first.** Deleted `code-explorer`, `code-architect`, `code-review`, `code-simplifier`
   (built in now), `/plandev:feature` (it only orchestrated two of them), the wav, and seven skills:
   `anthropic-product-knowledge`, `algorithmic-art`, `mcp-builder`, `pdf`, `theme-factory`, plus
   `postgresql-code-review` and `postgresql-optimization` (the refreshed Supabase skill covers
   Postgres anywhere; three overlapping database skills paid three descriptions per session).
   *Rejected:* keeping the Postgres pair "just in case". They were byte-identical to an upstream
   that hasn't moved since February.

2. **Three workspace modes in `.atlas/config.json`** (`repo`, `project`, `multi`; no file = repo,
   so pre-3.0 workspaces keep working). The project map is `PROJECT.md` in repo/project mode (the
   root `CLAUDE.md` stays the identity and imports it) and `projects/<p>/CLAUDE.md` in multi mode
   (Claude Code lazily loads subdirectory CLAUDE.md files). A marker block in the root `CLAUDE.md`
   (HTML comments, stripped from context) lets a mode switch rewrite the import line safely.
   *Rejected:* the map in `.claude/rules/PROJECT.md` (always loaded but hidden from humans, and
   it would not move cleanly to multi mode); a global "active project" file (breaks parallel
   sessions).

3. **Scripts help, the model orchestrates.** Boss's direction mid-build: deterministic code only
   where determinism is load-bearing. Kept as scripts: `secrets.cjs`, `db.cjs` (values must never
   reach the transcript), `port.cjs`, `project.cjs` (template fill + `index.md` table), and a small
   `mode.cjs` (`current`, `set`: config, CLAUDE.md block, .gitignore lines). The migration itself
   (which files move, conflicts, `git mv`) is a procedure in `/atlas:mode` that the model runs.
   *Rejected:* a ~400-line `mode.cjs` that planned and executed every transition. It was rigid
   and duplicated judgment the model already has. It was dropped before it shipped.

4. **Secrets: one gitignored store, structural guardrails.** `.atlas/secrets/{global.env,
   projects/<p>.env, projects/<p>@<env>.env}` (`@` can't appear in a project name, so env layers never collide with a project called `shop.prod`), dotenv format; `.env.example` is the contract.
   Guardrails: permission deny rules (Read/Edit on the store and real `.env` files) in a committed
   `.claude/settings.json`; a `PreToolUse` Bash hook that blocks shell access; `run` masks every
   stored value in the child's output. `set` reads stdin only.
   *Tradeoff:* `run` executes arbitrary commands with secrets in env, so masking is
   best-effort against deliberate exfiltration (encoding a value would bypass it). The goal is
   no accidental leaks into the transcript, not a sandbox. An adversarial review (clean-context
   subagent, every finding reproduced) found real gaps before release, all fixed: `link --out`
   wrote to any file name (now gitignored names only), the masker leaked a value when output
   paused mid-secret and missed JSON-escaped/multi-line forms, the guard passed multi-line and
   `.env*` / `cd .atlas` commands and anything wrapped in `run`/`db.cjs`, `db.cjs` output was
   unmasked (psql `\!`), rotation never reached `.env.local`, and `updateEnvFile` mangled
   hand-edited multi-line files. Storing values no longer depends on the `!` prefix providing a TTY
   (unverified): your own terminal, `--from-file`, or `! pbpaste | ... set KEY`.

5. **`psql` over the Postgres MCP.** No schemas in every session, one registry with
   per-connection `enabled`/`readonly`, URL passed as `PG*` env vars, parent `PG*` vars stripped,
   captured output masked. Read-only (`default_transaction_read_only`) is an accident guard: a
   session can `SET` it off, so a SELECT-only role is the documented hard guarantee. Verified
   against a real cluster.

6. **Design rules per project.** `DESIGN.md` moved out of `.claude/rules/` (it loaded ~14 KB every
   session) into `.claude/templates/`. `/design:create-design-md` writes
   `.claude/rules/design/<name>.md` with `paths:` frontmatter. Claude Code strips rule frontmatter
   before loading (verified in the docs), so the Stitch token block lives in the body under a
   `paths:`-only frontmatter. *Tradeoff:* Stitch-aware tools won't see the tokens as front matter
   in that file.

7. **Deploy has three modes: `ci`, `instructions`, `cli`.** Boss raised the CI/CD case: when a
   pipeline deploys on merge, ATLAS must not deploy around it. In `ci` mode `/deploy:run` gets the
   change onto a green PR, merges only with an explicit yes (or leaves it to Boss), watches the
   run, then health-checks and smoke-tests. `DEPLOY.md` still records the trigger, migrations,
   health check, rollback and logs, which the pipeline file alone doesn't explain.

8. **`super-product-owner` rewritten from scratch** as a question-and-judgment procedure
   (interview → one-page brief → prototype → taste review → acceptance checks), with a question
   bank and domain-pack format. *Rejected:* keeping the framework encyclopedia; with prototypes
   arriving in minutes, intent travels as brief + prototype + checks, not story backlogs.

9. **QA split by model.** `manual-qa-haiku` (default, explicit steps) and `manual-qa-sonnet`
   (exploratory, visual, re-runs of UNSURE), one identical body checked by a test; `commit` on
   haiku. *Not added:* `manual-qa-opus` (no case needed it; test cases are written by the main
   session).

10. **Cross-platform by construction.** Node-only scripts and hooks, `spawn` with argument arrays,
    a cross-spawn-style `cmd.exe` escape for `.cmd` shims, binaries probed before use, hook
    commands with the `${CLAUDE_PROJECT_DIR}` placeholder (sh, Git Bash, PowerShell; verified in
    the hooks docs), `lsof` replaced by `port.cjs`, `.gitattributes` scoped to ATLAS files so a
    repo-mode install doesn't renormalize the host repo. CI runs the suite on Ubuntu, macOS, and
    Windows with Node 18 and 22.

11. **Vendored skills refreshed and pinned.** supabase, shadcn, frontend-design (as the notes
    found), plus playwright-cli and find-skills (also behind upstream), with licenses and
    `skills.lock.json` + `scripts/skills-lock.cjs check`.

## Open items for Boss

- Run `npm version major` when ready (memory: never hand-edit the version).
- The GitHub repo description/topics/homepage update is proposed, not applied.
- Windows behavior is covered by CI but was not run on a Windows machine in this session.
