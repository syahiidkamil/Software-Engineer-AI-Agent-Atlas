# swe-atlas

Scaffold an **ATLAS** (Adaptive Technical Learning and Architecture System) — AI Software Engineer Agent for [Claude Code](https://claude.ai/claude-code).

ATLAS transforms Claude Code into a specialized Software Engineer with persistent identity, engineering principles, and professional-grade tooling.

## Quick Start

```bash
# Scaffold into your existing project
cd your-project
npx swe-atlas new-project

# Or scaffold into a new folder
npx swe-atlas new-project my-workspace
```

If no folder name is provided, the current directory is used.

## What It Does

The CLI interactively asks:

1. **Your name** — ATLAS refers to you as "Boss"
2. **Project type** — Single repo (add to existing project) or Multi repo (workspace with `repos/` folder)
3. **Context templates** — Backend API, React + Vite + Tailwind v4 + shadcn/ui, JavaScript/TypeScript
4. **MCP servers** — Playwright (browser automation), PostgreSQL (database access)

Then scaffolds the full ATLAS setup:

```
your-project/
├── CLAUDE.md               # ATLAS identity & entry point
├── IMPORTANT_NOTES.md       # Critical lessons & warnings
├── .claude/
│   ├── skills/             # 11 specialized skills
│   ├── agents/             # 6 task-specific agents
│   ├── commands/           # 5 slash commands
│   ├── hooks/              # Task completion hooks
│   └── settings.json       # Permissions config
├── self/ (or atlas/self/)   # Identity & engineering principles
├── context-templates/       # Development conventions
└── .mcp.json               # MCP server configuration
```

## Single vs Multi Repo

| | Single Repo | Multi Repo |
|---|---|---|
| Use case | Add ATLAS to an existing project | Workspace managing multiple projects |
| Identity files | `atlas/self/` | `self/` |
| Projects | Your existing code stays as-is | `repos/backend/`, `repos/frontend/` |
| Command | `npx swe-atlas new-project` | `npx swe-atlas new-project my-workspace` |

## What You Get

### 11 Skills

| Skill | Description |
|-------|-------------|
| `/abstraction-power` | Pattern recognition — identify and extract reusable abstractions |
| `/frontend-design` | Production-grade web UI with anti-AI-slop methodology |
| `/human-writing` | Content indistinguishable from skilled human writers |
| `/pdf` | Read, merge, split, watermark, OCR, fill forms |
| `/pptx` | Create and edit presentation slide decks |
| `/docx` | Create and edit Word documents |
| `/xlsx` | Create and edit spreadsheets with formulas |
| `/canvas-design` | Visual art and posters as PNG/PDF |
| `/algorithmic-art` | Generative art using p5.js |
| `/theme-factory` | 10 professional themes for any artifact |
| `/mcp-builder` | Guide for creating MCP servers |

### 6 Agents

| Agent | Description |
|-------|-------------|
| code-architect | Feature architecture design with implementation blueprints |
| code-explorer | Trace execution paths, map architecture layers |
| code-review | Multi-agent PR review with confidence scoring |
| code-simplifier | Refine code for clarity and maintainability |
| qa-manual-tester | Browser-based QA testing via Playwright |
| commit | Git commits following ATLAS convention |

### 5 Commands

| Command | Description |
|---------|-------------|
| `/atlas-setup` | Configure ATLAS for your project |
| `/feature-dev` | Guided feature development with codebase exploration |
| `/run-be-fe` | Run backend and frontend in background |
| `/qa-manual-test-run` | Execute QA test cases |
| `/commit` | Commit using sub-agent |

## After Setup

Open your project in Claude Code and:

```
# Configure ATLAS for your project
/atlas-setup

# Start guided feature development
/feature-dev

# Or just talk to ATLAS
"Add user authentication with JWT tokens"
```

## Links

- [GitHub Repository](https://github.com/syahiidkamil/Software-Engineer-AI-Agent-Atlas)
- [Claude Code](https://claude.ai/claude-code)

## License

MIT
