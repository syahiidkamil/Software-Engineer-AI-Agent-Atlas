# SWE-ATLAS

![SWE-ATLAS](misc/images/swe-atlas.png)

> Turn Claude Code into a senior software engineer with persistent identity, real engineering principles, and production-grade tooling.

```bash
npx swe-atlas@latest new-project
```

One command. Full setup. No copy-pasting prompts every session.

---

## Why This Exists

![Neuron Activation](neuron-activation.gif)

### The Neuron Activation Problem

AI coding assistants have deep engineering capabilities locked behind generic defaults. Ask "write a function" and you get code. Give the same model structured context, engineering principles, and a persistent identity, and you get architected solutions with proper abstractions, error handling, and scalability considerations.

The difference is **neuron activation** — the right instructions firing the right capabilities.

### What Goes Wrong Without It

**Context rot.** Models advertise 200k-1M token windows, but performance degrades long before the limit. The 10,000th token is not as trustworthy as the 10th.

**Vibecoding hangovers.** 25% of Y Combinator startups have 95% AI-generated codebases. Without engineering principles, that code becomes unmaintainable fast.

**Repetitive setup.** Every new session means re-explaining your project structure, conventions, and past decisions from scratch.

### The Fix

ATLAS gives Claude Code a persistent engineering brain: identity files, principles, skills, agents, and conventions that load automatically. No copy-pasting. No re-explaining. Just open the project and build.

---

## Getting Started

### Quick Start

```bash
# Scaffold into an existing project
cd your-project
npx swe-atlas@latest new-project

# Or scaffold into a new folder
npx swe-atlas@latest new-project my-workspace
```

The CLI asks for your name, project type, context templates, and MCP servers. Then scaffolds everything.

### Manual Setup

```bash
git clone --recurse-submodules https://github.com/syahiidkamil/Software-Engineer-AI-Agent-Atlas
cd Software-Engineer-AI-Agent-Atlas
```

Then run `/atlas:get-to-know` inside Claude Code.

### After Setup

```
/atlas:get-to-know                  # Configure ATLAS for your project
/design:create-design-md            # Lock visual identity via HTML variant prototyping
/plan:create-phase "phase-01-mvp"   # Wireframe-first phase doc (phase.html)
/plandev:feature                    # Guided feature development
"Add user authentication"           # Or just describe what you need
```

---

## What ATLAS Brings

**ATLAS** (Adaptive Technical Learning and Architecture System) operates as 7 roles: Software Engineer, Solution Architect, Software Architect, Tech Lead, Business Analyst, Product Owner, and UI/UX Designer.

### 17 Skills

| Skill | Command | What It Does |
|-------|---------|--------------|
| Abstraction Power | `/abstraction-power` | Pattern recognition — identify repeated patterns, extract reusable abstractions |
| Frontend Design | `/frontend-design` | Production-grade web UI with anti-AI-slop methodology |
| shadcn | `/shadcn` | shadcn/ui components, presets, registries, and project init |
| Human Writing | `/human-writing` | Content indistinguishable from skilled human writers in any language — auto-loads language-specific AI-tells from `languages/` (currently English default + Bahasa Indonesia; add more via `languages/{iso}.md`) |
| PDF | `/pdf` | Read, merge, split, watermark, OCR, fill forms |
| PPTX | `/pptx` | Create and edit slide decks |
| DOCX | `/docx` | Create and edit Word documents |
| XLSX | `/xlsx` | Spreadsheets with formulas, charts, data cleaning |
| Canvas Design | `/canvas-design` | Visual art and posters as PNG/PDF |
| Algorithmic Art | `/algorithmic-art` | Generative art using p5.js |
| Theme Factory | `/theme-factory` | 10 professional themes for any artifact |
| MCP Builder | `/mcp-builder` | Guide for creating MCP servers |
| Find Skills | `/find-skills` | Discover and install skills from the Anthropic library |
| Skill Creator | `/skill-creator` | Scaffold a new skill following the canonical format |
| PostgreSQL Code Review | `/postgresql-code-review` | Review SQL/migrations for correctness and safety |
| PostgreSQL Optimization | `/postgresql-optimization` | Diagnose slow queries, suggest indexes and rewrites |
| Supabase Postgres Best Practices | `/supabase-postgres-best-practices` | Idiomatic Supabase + Postgres patterns (RLS, auth, storage) |

### 7 Agents

| Agent | Model | What It Does |
|-------|-------|--------------|
| code-architect | Opus | Feature architecture with implementation blueprints |
| code-explorer | Opus | Trace execution paths, map architecture layers |
| code-review | Sonnet (x5) | Multi-agent PR review with confidence scoring |
| code-simplifier | Opus | Refine code for clarity while preserving functionality |
| qa-manual-tester | Inherit | Browser-based QA testing via Playwright |
| commit | Sonnet | Git commits following ATLAS convention |

### Commands

Commands are namespaced by prefix: `atlas:` (onboarding), `plan:` / `plandev:` (planning & building), `design:` / `brainstorm:` (UX & visuals), `qa:` (testing), `start:` (run), `git:` (version control).

| Command | What It Does |
|---------|--------------|
| `/atlas:get-to-know` | Initialize project context — understand the project, configure conventions, set up project rules |
| `/plan:create-phase "phase-01-mvp"` | Ambiguity-driven, wireframe-first phase — resolve unknowns via Q&A, then produce a self-contained `phase.html` (low-fi wireframe + clarifications + matrices) to implement from in plan mode |
| `/plandev:feature` | Guided feature development with codebase exploration |
| `/design:create-design-md` | Lock visual identity — prototype 3 distinct HTML variants for browser comparison, iterate, then write `.claude/rules/DESIGN.md` in [Stitch format](https://github.com/google-labs-code/design.md) (YAML tokens + canonical sections) |
| `/brainstorm:wireframe` | Quick standalone low-fi wireframe as self-contained HTML (gray boxes, no framework) |
| `/brainstorm:prototype` | Clickable multi-screen React prototype for idea validation (`misc/prototypes/`) |
| `/qa:create-test-cases` | Author human-readable manual test cases (markdown) into `docs/living-test-cases/` |
| `/qa:manual-test-run` | Execute living test cases via the qa-manual-tester agent + Playwright MCP; results land in `misc/test-runs/` |
| `/start:be-fe` | Run backend and frontend in the background |
| `/git:commit` | Commit what's already staged (commit subagent, runs in background) |
| `/git:stage-commit` | Stage and commit all working-directory changes (commit subagent) |
| `/git:log` | Recent commits with a brief summary + continual context |

### MCP Integration

Pre-configured in `.mcp.json`:

- **Playwright** — Browser automation for QA testing and UI verification
- **PostgreSQL** — Database access for queries and schema inspection

---

## Repository Structure

```
├── CLAUDE.md                        # ATLAS identity & entry point
├── NOTES.md                         # Regular notes and important must-follow rules
├── repos/                           # Your projects (multi-repo mode)
├── .claude/
│   ├── skills/                     # 17 specialized skills
│   ├── agents/                     # 7 task-specific agents
│   ├── commands/                   # Slash commands
│   ├── hooks/                      # Task completion hooks
│   └── rules/                      # Project rules — conventions + DESIGN.md (auto-loaded)
├── docs/                            # Project documentation
│   ├── external-information/       # Git submodules (Anthropic plugins & skills)
│   └── living-test-cases/          # Manual test cases (markdown), maintained as the product evolves
├── misc/                            # Working files
│   ├── self/                       # ATLAS identity & principles (atlas.md, engineering.md)
│   ├── test-runs/                  # QA test-run results
│   ├── context-templates/          # All convention templates
│   └── prompts/                    # Prompt templates
└── .mcp.json                        # MCP server configuration
```

---

## How It Works

### Neuron Activation Through Structure
Just as biological neurons need specific patterns to fire, AI capabilities need structured activation. ATLAS provides those patterns — transforming generic responses into specialized engineering expertise.

### Context Engineering > Context Size
Rather than relying on ever-larger context windows, ATLAS uses strategic context organization through CLAUDE.md files and modular conventions to maintain focus where it matters.

### Vibecoding With Guardrails
Natural conversational programming with engineering discipline. Production-grade, industry-appropriate best practices are the default — with KISS, YAGNI, and DRY applied in balance. Every session starts with the same standards.

---

**`npx swe-atlas@latest new-project` and start building.**

*ATLAS — FAANG experience for scale. Startup experience for pragmatism.*
