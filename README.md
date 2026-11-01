# SWE-ATLAS: an AI software engineer agent for Claude Code

[![npm version](https://img.shields.io/npm/v/swe-atlas?logo=npm&color=cb3837)](https://www.npmjs.com/package/swe-atlas)
[![npm downloads](https://img.shields.io/npm/dw/swe-atlas?logo=npm&color=cb3837)](https://www.npmjs.com/package/swe-atlas)
[![license](https://img.shields.io/npm/l/swe-atlas?color=3b82f6)](https://www.npmjs.com/package/swe-atlas)

![SWE-ATLAS turns Claude Code into a senior AI software engineer agent with skills, subagents, project memory, and engineering judgment](misc/images/swe-atlas.png)

> Turn Claude Code into a senior software engineer that carries your projects end to end: from intent, to prototype, to build, to test, to deploy, and remembers each project across sessions without rescanning the repo.

```bash
npx swe-atlas@latest new-project                 # in your current repo
npx swe-atlas@latest new-project my-workspace    # or a new workspace for many projects
```

One command. Works on macOS, Linux, and Windows.

SWE-ATLAS is an open-source **Claude Code template** and **AI coding agent** setup: skills, subagents, slash commands, hooks, and engineering conventions that make Claude Code behave like a senior engineer who has shipped before. It explores before it builds (wireframes, clickable prototypes, visual plans), keeps a short memory per project, handles API keys without ever showing them in chat, talks to Postgres through `psql`, and writes the deploy runbook. Then it hands execution to Claude Code's own plan mode, `/goal`, and workflows.

It ships in **three CLAUDE.md flavors**, so you choose how much of the wheel to hand over:

- **Vanilla**: minimal footprint, no ATLAS identity.
- **Collaborative** *(default)*: the full senior-engineer identity with a review-and-commit loop; you stay in the driver's seat.
- **Autonomous**: the approval loop removed and **`free-will`** wired in, the skill that lets ATLAS **decide for itself** on the high-stakes forks: hold real alternatives open, ground each in evidence, refute the winner, then log the call in `docs/decision_logs/`. That's what lets it **one-shot an app** and run unattended without going off the rails.

And it runs in **three workspace modes**: inside one repo, around one project with several repos, or as one workspace holding **many projects**. You can switch later with `/atlas:mode`.

---

## Claude Code already has the engine. ATLAS helps you decide what to build.

Claude Code plans before it edits, works toward a goal across turns, runs autonomously with safety checks, reviews and simplifies code, and orchestrates fleets of subagents, natively:

| Native capability | What it does |
|---|---|
| **Plan mode** and the **Explore** / **Plan** subagents | Reads the codebase and proposes a plan; touches no files until you approve |
| **[`/goal`](https://code.claude.com/docs/en/goal)** | Keeps working across turns until a checked completion condition holds |
| **[Auto mode](https://code.claude.com/docs/en/auto-mode-config)** | Approves its own safe tool calls, blocks destructive ones |
| **`/code-review`** and **`/simplify`** | Reviews a diff for bugs; cleans up the code you just changed |
| **[Dynamic workflows](https://code.claude.com/docs/en/workflows)** | Writes a script that fans out dozens of subagents and cross-checks their findings |

> **Kick off a workflow**: describe the task and ask for a workflow in your own words, or include the keyword **`ultracode`**, and Claude writes one for it. Want it always on? Set **`/effort ultracode`** and Claude plans a workflow for *every* substantive task in the session. ([How workflows work →](https://code.claude.com/docs/en/workflows))

That is the execution loop, and it keeps getting better, so ATLAS doesn't rebuild it. This release removed the ATLAS agents that the box now covers (explorer, architect, reviewer, simplifier).

What Claude Code still won't do for you: decide *what's worth building*, prove the shape works before you spend tokens generating it, remember ten projects across sessions, keep your keys out of the transcript, and carry a project all the way to production. That part is ATLAS.

<sub>Auto mode and dynamic workflows are in research preview at the time of writing; plan mode and `/goal` are generally available.</sub>

---

## Why not another spec framework

The popular answer to "make the AI build the right thing" has been to bolt a process framework onto the model: **Spec-Driven Development (SDD)** and the agent frameworks in the same vein (spec-kit, BMAD, Get Shit Done, and the rest). Write exhaustive specifications first, then generate the code from them. A constitution, a spec, a plan, a task breakdown: five to seven Markdown files and a multi-phase pipeline, most of it produced *before a single screen has been seen*.

Four things go wrong:

- **You plan before you've learned.** Most of the requirements and task breakdown are guesses made before anyone has seen the thing work. You pay full freight to formalize guesses, build to them task by task, and find out at the end it isn't what anyone pictured.
- **Text leaves room to disagree.** You and the model can read the same paragraph and picture two different screens, and the gap only surfaces once the code exists. Prose is the wrong medium for *"do we mean the same thing?"*
- **Markdown drifts.** Keeping `spec.md`, `plan.md`, and `tasks.md` consistent with each other and with the code is its own tax, and plain `.md` can't render the wireframe, flow, or matrix it's straining to describe.
- **The loop is already native.** Spec → plan → tasks → implement is what plan mode, `/goal`, and workflows now do on their own. Wrapping a framework around the model to make it loop reinvents what ships in the box, at a heavy token premium.

ATLAS takes the opposite bet: do the *minimum* upfront thinking that actually de-risks the build, make it cheap, fast, and visual, so a human and the model can look at the same thing and agree before a line is written, then hand a clean artifact to the native loop.

---

## What ATLAS does instead

### 1. Explore before you commit

Cheap, throwaway-friendly artifacts that let you *see* the thing before generating code for it:

- **`/brainstorm:wireframe`**: a low-fi wireframe as one self-contained HTML file
- **`/brainstorm:prototype`**: a clickable, multi-screen React prototype
- **`/design:create-design-md`**: three real design variants you compare in a browser, then lock as the project's `DESIGN.md` rule
- **`/plan:visual`**: any non-UI change (refactor, migration, architecture call) as a visual HTML plan with diagrams, a change map, and decision matrices

### 2. Clarify only the essentials

**`/plan:create-phase`** runs the product interview from **`super-product-owner`**: one question at a time, only what's still open, stopping as soon as a one-page brief can be written. The output is a wireframe-first `phase.html` with **acceptance checks** instead of user stories. No constitution, no task ledger.

### 3. Remember every project, cheaply

Each project gets a small memory that a fresh session reads in a few thousand tokens instead of scanning the repo:

| File | Layer | What it holds |
|---|---|---|
| `CLAUDE.md` (multi mode) or `PROJECT.md` | the map, 60–100 lines | what it is, its **stage** (toy / mvp / production), stack, how to run and test it, which document to read for which job |
| `STATUS.md` | the state, under 30 lines | now, next, blocked, last session |
| `DEPLOY.md`, `docs/decision_logs/`, `docs/phases/`, specs | deep, read on demand | the runbook, the why behind decisions, the phase docs |

Memory grows with the project: a new project starts with the map, the status, and an `.env.example`, and folders appear when the first decision or phase does. The stage line sets the engineering bar, so a weekend toy doesn't get production ceremony and production work doesn't get toy shortcuts. `/atlas:project open` loads a project at the start of a session; `/atlas:project wrap` updates its state at the end.

### 4. Bring senior judgment to every turn

A persistent engineering identity (principles, roles, conventions) plus skills that load when the work calls for them. At the center is **`free-will`**: on a medium-to-high-stakes fork (a stack, a schema, deprecating something others depend on) it refuses the first plausible answer, holds real alternatives open, grounds each in evidence, simulates the blast radius, tries to *refute* the winner, then logs the decision. It fires **autonomously** on mechanical triggers, like a fix that failed twice, a new dependency, or a migration. **`adversarial-review`** then attacks what was built: clean-context reviewers with opposing mandates, and every finding reproduced against the running app before anyone believes it.

### 5. Carry it to production

`/deploy:plan` writes the project's `DEPLOY.md` runbook, `/deploy:check` gates the release (tests, missing secrets, migration safety, build), and `/deploy:run` ships it: through your **existing CI/CD pipeline** (PR, green checks, merge with your yes), through the provider's CLI, or as exact steps you run. Then it health-checks, smoke-tests the live URL, and logs the deploy. Provider notes ship for Coolify, Vercel, Netlify, Fly.io, Railway, and Docker Compose over SSH. Production always asks first.

---

## Workspace modes

| Mode | Shape | Good for |
|---|---|---|
| `repo` | ATLAS files inside one code repo, at its root | one app, one repo |
| `project` | ATLAS root wraps one project; code repos live in `repos/<name>/`, each its own git | one product with several services |
| `multi` | many projects in `projects/<name>/`, plus `index.md` (the registry, always loaded) and `general/` for work that belongs to no project | one person or team running many apps from one place |

```
my-workspace/                 (multi mode)
├── CLAUDE.md                 identity + "read index.md, then the project's map"
├── index.md                  | Project | One line | Stage | Stack | Path | Deploy | Status |
├── general/                  scratch, experiments, one-offs
└── projects/
    ├── shop/
    │   ├── CLAUDE.md  STATUS.md  DEPLOY.md  .env.example
    │   ├── docs/  misc/
    │   └── repos/web/  repos/api/      (their own git, ignored by the workspace)
    └── notes/ ...
```

Several Claude Code sessions can work on different projects in one workspace at the same time. There is no global "active project": each session carries its own. Browser sessions are named per project, Playwright MCP runs isolated, databases are registered per project, and every artifact (test runs, screenshots, prototypes) lands under its own project. Two sessions on the same project use git worktrees.

**Switching modes.** `/atlas:mode multi` (or `project`, `repo`) reads the workspace, prints the full migration plan (every move, every file created), and changes nothing until you say yes. Tracked files move with `git mv` so history follows. It warns before moving folders that hold their own git repo (virtualenvs, dev servers, and Claude Code's per-folder session history don't survive a move) and prefers adopting a repo where it sits.

---

## Getting started

### Quick start

```bash
# Inside an existing repo: repo mode is detected
cd your-project
npx swe-atlas@latest new-project

# A new workspace for many projects: multi mode is the default
npx swe-atlas@latest new-project my-workspace
```

The CLI asks for the **CLAUDE.md flavor**, your name, the **workspace mode** (and the project's name and stage), **browser automation** (Playwright MCP or Playwright CLI), **which skills to install** (an interactive checkbox: ↑/↓ move, space toggles, `a` selects all), when to **auto-compact**, and an optional **advisor model**. Then it copies everything from this repo as the single source of truth. Piped input works too: the skills picker falls back to comma-separated numbers (`*` = all) when stdin isn't a terminal.

### Pick your CLAUDE.md flavor

| Flavor | What you get |
|---|---|
| **Vanilla** | Minimal CLAUDE.md: NOTES.md and decision logs, no ATLAS identity |
| **ATLAS — autonomous** | Full identity, no approval loop, built for unattended runs and one-shotting apps. Auto-installs `free-will`, `super-product-owner`, and `super-ui-ux-design`, the skills that stand in for the missing approval loop |
| **ATLAS — collaborative** *(default)* | Full identity with the partner review/commit loop. You stay in the driver's seat |

### A typical first loop

```
/atlas:project add shop             # multi mode: register a project (repo/project mode: /atlas:get-to-know)
/brainstorm:prototype               # validate the idea as a clickable prototype
/design:create-design-md            # lock the visual identity for this project
/plan:create-phase "checkout"       # interview → brief → phase.html with acceptance checks
# → switch to plan mode and let Claude Code build from it
/qa:manual-test-run shop checkout   # run the checks in a real browser
/deploy:plan shop                   # write the runbook, then /deploy:check and /deploy:run
```

### Going autonomous

- **Scaffold the autonomous flavor**: full ATLAS identity with no approval gate.
- **`/atlas:oneshotapp "idea"`**: idea to working app in one shot: a brief with acceptance checks, `free-will` on the founding fork and every mid-build trigger, a walking-skeleton build loop, adversarial-review subagents, and a final conscious pass against the original ask, with the full decision trail in `docs/decision_logs/`.
- **Pair it with Claude Code's native loop**: drop the phase doc into plan mode, then let `/goal` and auto mode run it to completion.
- **Add an advisor**: pick `opus` or `fable` as the advisor model at scaffold time (or later with `/atlas:settings`) for a second opinion on the same forks where `free-will` fires.

### Manual setup

```bash
git clone --recurse-submodules https://github.com/syahiidkamil/Software-Engineer-AI-Agent-Atlas
cd Software-Engineer-AI-Agent-Atlas
```

Then run `/atlas:get-to-know` inside Claude Code.

---

## What's in the box

ATLAS works in seven roles: Software Engineer, Solution Architect, Software Architect, Tech Lead, Business Analyst, Product Owner, and UI/UX Designer.

### 14 Skills

Installed à la carte. The scaffolder pre-checks `super-product-owner`, `super-ui-ux-design`, `frontend-design`, `human-writing`, `adversarial-review`, and `deploy`; the autonomous flavor adds `free-will`, and choosing Playwright CLI adds `playwright-cli`. Heavy document skills (`docx`, `pptx`, `xlsx`, `pdf`) stay out of the package to keep it small; scaffolded workspaces get the canonical versions through the [anthropics/skills](https://github.com/anthropics/skills) submodule at `docs/external-information/skills`.

| Skill | Command | What it does |
|-------|---------|--------------|
| Free Will | `/free-will` | Deliberate choice on medium-to-high-stakes forks: branch, ground in evidence, simulate consequences, refute the winner, log the decision. Fires autonomously on mechanical triggers |
| Super Product Owner | `/super-product-owner` | Decide what is worth building: one-question-at-a-time interview, a one-page brief, a prototype hand-off, a taste review, and acceptance checks instead of user stories |
| Super UI/UX Design | `/super-ui-ux-design` | Design theory (UX laws, heuristics, hierarchy, WCAG) fused with an execution playbook for distinctive, production-grade interfaces |
| Adversarial Review | `/adversarial-review` | Presume what was just built is broken: clean-context reviewers with opposing lenses, every finding reproduced against the running app |
| Deploy | `/deploy` | Provider-agnostic deploys: the DEPLOY.md runbook, a release gate, CI/CD-aware shipping, health checks, smoke tests, rollback. Provider notes for Coolify, Vercel, Netlify, Fly.io, Railway, Docker Compose over SSH |
| Frontend Design | `/frontend-design` | Distinctive, intentional visual design that doesn't read as a template ([anthropics/skills](https://github.com/anthropics/skills)) |
| shadcn | `/shadcn` | shadcn/ui components, presets, registries, design systems, and project init ([shadcn-ui/ui](https://github.com/shadcn-ui/ui)) |
| Supabase Postgres Best Practices | `/supabase-postgres-best-practices` | Postgres anywhere: schema, migrations, RLS, indexes, functions, slow queries, locking ([supabase/agent-skills](https://github.com/supabase/agent-skills)) |
| Playwright CLI | `/playwright-cli` | Token-efficient browser automation through the Playwright CLI instead of MCP tool schemas ([microsoft/playwright-cli](https://github.com/microsoft/playwright-cli)) |
| Human Writing | `/human-writing` | Prose indistinguishable from a skilled human in any language (English and Bahasa Indonesia built in; add more via `languages/{iso}.md`) |
| Learning From Mistakes | `/learning-from-mistakes` | Record a hard-won lesson after a bug is cracked, so it's never relearned |
| Abstraction Power | `/abstraction-power` | Pattern recognition: spot repetition, extract reusable abstractions |
| Find Skills | `/find-skills` | Discover and install agent skills ([vercel-labs/skills](https://github.com/vercel-labs/skills)) |
| Skill Creator | `/skill-creator` | Create, improve, and evaluate skills ([anthropics/skills](https://github.com/anthropics/skills)) |

Vendored skills are pinned in `skills.lock.json`; `node scripts/skills-lock.cjs check` reports which ones are behind upstream.

### 3 Agents

| Agent | Model | What it does |
|-------|-------|--------------|
| manual-qa-haiku | Haiku | Default QA runner: executes written test cases in a real browser, PASS / FAIL / UNSURE with evidence per step |
| manual-qa-sonnet | Sonnet | Exploratory runs, visual judgment, flaky flows, and any case the haiku runner marked UNSURE |
| commit | Haiku | Git commits following the ATLAS convention |

Test cases are written in the main session on your strongest model; the cheap runner only executes them. Model aliases resolve to the latest family.

### Commands

Commands are namespaced by folder under `.claude/commands/`: `brainstorm/prototype.md` becomes `/brainstorm:prototype`.

| Command | What it does |
|---------|--------------|
| `/atlas:get-to-know` | Learn a project: explore its code, record the stage, stack, run commands, env contract, and conventions in the project map |
| `/atlas:project add\|open\|status\|wrap` | Register a project, load one at session start, refresh `index.md`, or wrap a session (update `STATUS.md`, decisions, lessons) |
| `/atlas:mode <repo\|project\|multi>` | Switch workspace modes: full migration plan first, nothing changes until you say yes |
| `/atlas:settings` | View or change this workspace's auto-compaction threshold and advisor model |
| `/atlas:oneshotapp "idea"` | One-shot an app autonomously: brief and acceptance checks, `free-will` at every fork, adversarial review, a conscious final pass |
| `/atlas:change-core-self` | Interview you about the project, then derive a bespoke ATLAS operating posture for it from first principles |
| `/plan:create-phase "name"` | Product interview → wireframe-first `phase.html` with clarifications, matrices, and acceptance checks, to build from in plan mode |
| `/plan:visual "what to plan"` | Any change (refactor, migration, architecture call) as a self-contained visual `plan.html` |
| `/design:create-design-md` | Prototype three visual directions, then lock the project's design as a path-scoped rule in [Stitch format](https://github.com/google-labs-code/design.md) |
| `/brainstorm:wireframe` | A quick standalone low-fi wireframe as self-contained HTML |
| `/brainstorm:prototype` | A clickable multi-screen React prototype for idea validation |
| `/qa:create-test-cases` | Write human-readable manual test cases into the project's `docs/living-test-cases/` |
| `/qa:manual-test-run` | Run them in a real browser with the haiku runner (or sonnet), re-run UNSURE cases on sonnet, file the report and bugs under the project |
| `/deploy:plan` | Write or update the project's `DEPLOY.md` runbook, detecting an existing CI/CD pipeline |
| `/deploy:check` | Gate a release: tests, missing secrets for the target env, migration review, build, runbook, pipeline status |
| `/deploy:run` | Deploy through the pipeline, the provider CLI, or exact steps; then health-check, smoke-test, and log it |
| `/start:be-fe` | Start a project's dev servers in the background, with port checks first |
| `/git:commit` | Commit what's already staged (commit subagent, in the background) |
| `/git:stage-commit` | Stage and commit all working-directory changes in coherent commits |
| `/git:log` | Recent commits with a brief summary and their link to the working tree |

---

## Integrations

### Secrets: enter a key once, reuse it everywhere

Keys you reuse across projects (LLM providers, email, storage, payment test keys, deploy tokens) live in one gitignored store at the workspace root, `.atlas/secrets/`: `global.env`, `projects/<name>.env`, and `projects/<name>@<env>.env`, in that order of priority. A project declares the keys it needs, by name, in its `.env.example`.

```bash
node .claude/scripts/secrets.cjs set OPENAI_API_KEY            # in your terminal: hidden prompt
node .claude/scripts/secrets.cjs keys shop                      # names and sources, never values
node .claude/scripts/secrets.cjs link shop                      # fill .env.local next to each .env.example
node .claude/scripts/secrets.cjs check shop --env prod          # which declared keys are missing
node .claude/scripts/secrets.cjs run shop -- vercel deploy      # run a command with the keys injected
```

A value never goes on a command line or into the chat. Store it in your own terminal (hidden prompt), with `--from-file` for keys and PEMs, or from inside Claude Code after copying it: `! pbpaste | node .claude/scripts/secrets.cjs set KEY` (Linux `wl-paste`, Windows `powershell -c Get-Clipboard`). Re-running `link` after a rotation refreshes `.env.local`; it only writes gitignored names (`.env`, `.env.local`, `.env.<name>.local`).

The guardrails are layered rather than a promise: permission rules deny the Read/Edit tools on the store and on real `.env` files; a `PreToolUse` hook blocks the shell commands an agent plausibly runs on them (`cat .env*`, `cd .atlas && ...`); `run` and `db.cjs` mask stored values, including their JSON-escaped and multi-line forms, in captured output. They stop accidental leaks into the transcript. They are not a sandbox: a command written to get around them (an encoded value, a tool that loads `.env` by itself) can. Prefer `run` over `link` when a command doesn't need the file on disk, and prefer scoped, expiring tokens from your providers.

### Databases: `psql`, one registry, each connection switchable

ATLAS reaches Postgres through the `psql` CLI instead of an MCP server, so there are no tool schemas in every session and every Postgres feature (`\d`, `EXPLAIN ANALYZE`, `-f` files) works. Connections are registered by name in `.atlas/secrets/databases.json`, each with an `enabled` switch and a `readonly` flag (on by default for prod); the URL itself stays in the secret store.

```bash
node .claude/scripts/db.cjs add shop-dev --project shop --url-env SHOP_DEV_DATABASE_URL
node .claude/scripts/db.cjs list
node .claude/scripts/db.cjs shop-dev -c "select count(*) from orders"
node .claude/scripts/db.cjs shop-prod -f report.sql             # prod starts read-only: accidental writes fail
```

The URL reaches `psql` only through `PG*` environment variables, never the command line, and output captured by an agent is masked. Read-only mode starts every transaction read-only, which stops accidents but can be switched off by a session; for a hard guarantee, point prod at a role that only has `SELECT`. Install `psql`:

| OS | Command |
|---|---|
| macOS | `brew install libpq && brew link --force libpq` (or `brew install postgresql`) |
| Debian / Ubuntu | `sudo apt install postgresql-client` |
| Windows | the PostgreSQL installer with only "Command Line Tools" selected, then add its `bin` to PATH |
| Any OS with Docker | `docker run --rm -it postgres:17 psql ...` |

### Browser automation

A scaffold-time choice, with an **isolated** (in-memory, parallel-safe) or **persistent** profile in repo and project mode. Multi mode is always isolated by default; a project that needs a saved login keeps its own profile in `projects/<name>/misc/.playwright/`.

- **[Playwright MCP](https://github.com/microsoft/playwright-mcp)**: rich page snapshots through MCP tools.
- **[Playwright CLI](https://github.com/microsoft/playwright-cli)**: the token-efficient alternative, called through Bash (`playwright-cli -s=shop click e12`); install the binary with `npm install -g @playwright/cli@latest`.

### Spoken notifications

When Claude finishes or needs you, ATLAS says so out loud in a few words: the first word of the project name, the initials of the rest, then the event. `saori-hibana` becomes "saori sh done"; `bank-asset-management` asking a question becomes "bank bam ask input". In multi mode it names the project the session is working on, so parallel sessions are distinguishable by ear. It uses `say` on macOS, `spd-say` or `espeak` on Linux, and Windows speech through PowerShell, and falls back to a bell. Override the name with `ATLAS_NOTIFY_NAME`; turn it off with `ATLAS_NOTIFY=off`.

### Context: compaction and advisor, per workspace

The scaffolder asks two questions and writes the answers into the workspace's own settings (personal `settings.local.json` or shared `settings.json`, your choice), never your global settings:

- **Auto-compact earlier** (recommended 50%): sets `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`. Output quality tends to slip well before the hard limit, and project memory makes a fresh context cheap to rebuild. The variable can only lower the threshold; to change the window itself, use `/autocompact`.
- **Advisor model** (`opus`, `fable`, `sonnet`, or none): sets `advisorModel`, a second opinion Claude can call on hard decisions. The advisor must be at least as capable as your main model, and it uses extra usage.

Change either later with `/atlas:settings`.

### macOS, Linux, Windows

Every script and hook is plain Node (≥ 18, no dependencies): paths through `path`, child processes with argument arrays (never shell strings), binaries probed before use, no symlinks. Hook commands use Claude Code's `${CLAUDE_PROJECT_DIR}` placeholder, which works under sh, Git Bash, and PowerShell. CI runs the scaffolder in all three modes on Ubuntu, macOS, and Windows.

---

## How it works

### Neuron activation through structure

![Neuron activation: structured context fires Claude Code's latent senior-engineering capability](neuron-activation.gif)

AI coding assistants keep deep engineering capability locked behind generic defaults. Ask "write a function" and you get code. Give the same model structured context, engineering principles, and a persistent identity, and you get architected solutions: proper abstractions, error handling, scalability considered. ATLAS supplies those patterns every session.

### Ground truth over guesswork

ATLAS treats its own output as something to verify, not assert. It reads the file before describing the code, runs the thing before calling it done, and looks at the screen before reporting the UI. You can't specify your way out of a wrong assumption; you can only test it.

### Vibecoding with guardrails

ATLAS keeps the conversational speed but anchors it to production-grade, industry-appropriate defaults, scaled to the project's stage: KISS, YAGNI, and DRY applied in balance, not as an excuse to under-build.

---

## FAQ

**Is SWE-ATLAS a Claude Code plugin?**
It's a Claude Code template: plain files (`CLAUDE.md`, `.claude/skills`, `.claude/agents`, `.claude/commands`, hooks, rules, and a few Node scripts) scaffolded into your repo or workspace. Nothing runs outside Claude Code, and everything is readable and editable.

**Can Claude Code manage multiple projects with ATLAS?**
Yes. Multi mode keeps many projects in one workspace with a registry (`index.md`) and a short memory per project, and parallel sessions on different projects don't collide.

**How is it different from spec-kit, BMAD, or other spec-driven development frameworks?**
Those formalize a spec, plan, and task list before anything is seen. ATLAS validates the shape first with a wireframe or clickable prototype, writes one self-contained HTML phase document with acceptance checks, and leaves execution to Claude Code's native plan mode, `/goal`, and workflows.

**Will my API keys end up in the chat or in git?**
Not by accident: keys are referenced by name, values stay in a gitignored store, the Read/Edit tools are denied on it, a hook blocks the usual shell access to it, and `run` / `db.cjs` mask values in output. It is layered protection, not a sandbox. See [Secrets](#secrets-enter-a-key-once-reuse-it-everywhere).

**Does it work on Windows?**
Yes. All scripts and hooks are Node, tested on Windows in CI. Claude Code recommends Git for Windows for its Bash tool.

**Which models does it use?**
Your main session runs whatever model you pick (Opus or Fable for the hardest work). The QA runners use Haiku and Sonnet, the commit agent uses Haiku, and an optional advisor can be Opus, Fable, or Sonnet.

---

## Repository structure

```
├── CLAUDE.md                    # ATLAS identity & entry point (this repo's own)
├── NOTES.md                     # Notes and must-follow rules
├── claude_md_variants/          # CLAUDE.md flavors the CLI scaffolds from
├── bin/install.js               # The scaffolder (npx swe-atlas new-project)
├── .claude/
│   ├── skills/                  # 14 skills, installed à la carte
│   ├── agents/                  # 3 agents (QA runners, commit)
│   ├── commands/                # Slash commands: atlas/ brainstorm/ deploy/ design/ git/ plan/ qa/ start/
│   ├── hooks/                   # notify.cjs (spoken notices), guard-secrets.cjs (secret guard)
│   ├── rules/                   # workspace.md (always loaded); design/<project>.md (path-scoped)
│   ├── scripts/                 # secrets.cjs, db.cjs, project.cjs, mode.cjs, port.cjs, lib/
│   └── templates/               # project map, STATUS, DEPLOY, .env.example, index.md, DESIGN.md
├── docs/
│   ├── decision_logs/           # ADR-style decisions: choice, rejected branches, rationale
│   └── external-information/    # Reference docs + the anthropics/skills submodule
├── misc/self/                   # ATLAS identity & principles (atlas.md, engineering.md)
├── scripts/skills-lock.cjs      # Dev: which vendored skills are behind upstream
├── skills.lock.json             # Upstream source and commit of each vendored skill
└── test/                        # node:test suite: scaffold every mode, scripts, hooks, README drift
```

Run the tests with `npm test`.

---

**`npx swe-atlas@latest new-project` and start building.**

*ATLAS: FAANG experience for scale. Startup experience for pragmatism.*
