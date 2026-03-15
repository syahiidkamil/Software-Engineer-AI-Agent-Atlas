# AI Software Engineer Agent - ATLAS

![Neuron Activation](neuron-activation.gif)

## Neuron Activation: Unlocking Hidden AI Capabilities

Modern AI assistants are like dormant neural networks with immense software engineering capabilities locked away. Without proper **"Neuron Activation"** through specific instructions and persistent context, these capabilities remain hidden behind generic, surface-level responses. This repository provides the activation patterns that transform a general AI into a specialized **AI Software Engineer Agent**.

## The Core Problems

### 1. Context Rot: The Silent Performance Killer
Research shows that LLM performance degrades dramatically as conversations grow:
- Modern models advertise **200k to 1M+ token windows** but performance degrades well before these limits
- The **"last fifth rule"**: Avoid the final 20% of context capacity (e.g., last 40k tokens in a 200k window)
- Models suffer from "lost-in-the-middle" phenomenon - key information buried in long contexts gets overlooked
- As research confirms: "The 10,000th token is not as trustworthy as the 10th"

### 2. Hidden Capabilities Need Activation
Without proper instruction frameworks, AI responses remain generic. The difference between "write a function" and a properly activated AI Software Engineer Agent is like night and day - one gives you code, the other gives you architected solutions with proper abstractions, error handling, and scalability considerations.

### 3. Vibecoding Without Structure Leads to Chaos
While vibecoding (conversational programming with AI) has democratized coding, the "vibe coding hangover" is real:
- 25% of Y Combinator startups have 95% AI-generated codebases
- Senior engineers report "development hell" working with unstructured AI code
- Without proper engineering principles, vibecoding produces unmaintainable solutions

### 4. Repetitive Setup Wastes Time
Every new conversation requires:
- Re-explaining project structure and conventions
- Copy-pasting coding standards and principles
- Re-establishing context about previous decisions
- Rebuilding the AI's understanding from scratch

## The Solution: Persistent Consciousness Architecture

This repository provides a **complete consciousness framework** for AI Software Engineer Agents. Instead of copy-pasting boilerplate instructions every session, simply **git clone this repo** and you instantly have:

### ATLAS - Your Activated AI Software Engineer Agent

**ATLAS** (Adaptive Technical Learning and Architecture System) emerges with:

- **Activated Neural Pathways**: Pre-configured instructions that unlock deep engineering capabilities
- **Persistent Identity**: Consistent personality from FAANG to startup experience
- **Multiple Roles**: Software Engineer, Solution Architect, Software Architect, Tech Lead, Business Analyst, Product Owner, UI/UX Designer
- **11 Specialized Skills**: From pattern recognition to document generation
- **6 Task Agents**: Architecture design, code review, QA testing, and more
- **MCP Integration**: Browser automation and database access out of the box

## Skills

| Skill | Command | Description |
|-------|---------|-------------|
| Abstraction Power | `/abstraction-power` | Pattern recognition mode — identify repeated patterns, extract reusable abstractions, visualize with Mermaid flowcharts |
| Frontend Design | `/frontend-design` | Create distinctive, production-grade web interfaces with context-driven design and anti-AI-slop methodology |
| Human Writing | `/human-writing` | Write content indistinguishable from skilled human writers — passes AI detection |
| PDF | `/pdf` | Read, merge, split, watermark, OCR, fill forms, create PDFs |
| PPTX | `/pptx` | Create, edit, and analyze presentation slide decks |
| DOCX | `/docx` | Create, read, edit Word documents with professional formatting |
| XLSX | `/xlsx` | Create and edit spreadsheets with formulas, charts, and data cleaning |
| Canvas Design | `/canvas-design` | Create visual art and posters as PNG/PDF with design philosophy |
| Algorithmic Art | `/algorithmic-art` | Generative art using p5.js with seeded randomness |
| Theme Factory | `/theme-factory` | 10 pre-set professional themes for styling any artifact |
| MCP Builder | `/mcp-builder` | Guide for creating MCP servers in Python or TypeScript |

## Agents

| Agent | Model | Description |
|-------|-------|-------------|
| code-architect | Opus | Designs feature architectures with implementation blueprints, file paths, data flows |
| code-explorer | Opus | Traces execution paths, maps architecture layers, documents dependencies |
| code-review | Sonnet (x5) | Multi-agent PR review with confidence scoring and CLAUDE.md compliance |
| code-simplifier | Opus | Refines code for clarity and maintainability while preserving functionality |
| qa-manual-tester | Inherit | Browser-based QA testing via MCP Playwright — smoke tests, edge cases, issue reporting |
| commit | Sonnet | Commits following ATLAS convention — checks status, drafts message, commits immediately |

## Commands

| Command | Description |
|---------|-------------|
| `/atlas-setup` | Configure ATLAS for a new project (boss name, repos, conventions) |
| `/feature-dev` | Guided feature development with codebase exploration and architecture design |
| `/run-be-fe` | Run backend and frontend in background |
| `/qa-manual-test-run` | Execute QA test cases using qa-manual-tester agent |
| `/commit` | Commit changes using commit sub-agent |

## MCP Integration

Pre-configured MCP servers in `.mcp.json`:

- **Playwright** — Browser automation for manual QA testing, UI verification, and interactive debugging
- **PostgreSQL** — Direct database access for queries, schema inspection, and data exploration

## Getting Started

### Quick Start (npx)

```bash
# Scaffold into an existing project
cd your-project
npx swe-atlas new-project

# Or scaffold into a new folder
npx swe-atlas new-project my-workspace
```

The CLI will interactively ask for your name, project type (single/multi repo), context templates, and MCP servers.

### Manual Setup (git clone)

```bash
git clone --recurse-submodules https://github.com/syahiidkamil/Software-Engineer-AI-Agent-Atlas
cd Software-Engineer-AI-Agent-Atlas
```

Then configure with `/atlas-setup` inside Claude Code.

### After Setup

```
# Open in Claude Code, then:
/atlas-setup              # Configure ATLAS for your project
/feature-dev              # Guided feature development
"Add user authentication" # Or just describe what you need
```

## Repository Structure

```
├── CLAUDE.md                        # Core entry point — ATLAS identity
├── IMPORTANT_NOTES.md               # Critical lessons and warnings
├── self/                            # Identity and operating instructions
│   ├── atlas.md                    # ATLAS persona, journey, work protocol
│   └── engineering.md              # Engineering principles, roles, beliefs
├── repos/                           # Your actual projects
│   ├── CLAUDE.md                   # Repo overview with ports
│   ├── backend/                    # Backend project
│   └── frontend/                   # Frontend project
├── context-templates/               # Development convention templates
│   ├── backend.md                  # Backend API conventions
│   ├── frontend-react-vite.md      # React + Vite conventions
│   ├── frontend-react-vite-...md   # React + Vite + Tailwind v4 + shadcn/ui
│   └── javascript.md              # JS/TS guidelines
├── .claude/
│   ├── skills/                     # 11 specialized skills
│   │   ├── abstraction-power/     # Pattern recognition
│   │   ├── frontend-design/       # UI/UX design
│   │   ├── human-writing/         # Human-quality writing
│   │   ├── pdf/                   # PDF operations
│   │   ├── pptx/                  # Slide decks
│   │   ├── docx/                  # Word documents
│   │   ├── xlsx/                  # Spreadsheets
│   │   ├── canvas-design/         # Visual art
│   │   ├── algorithmic-art/       # Generative art
│   │   ├── theme-factory/         # Theming toolkit
│   │   └── mcp-builder/          # MCP server guide
│   ├── agents/                     # 6 task-specific agents
│   │   ├── code-architect.md      # Architecture design
│   │   ├── code-explorer.md       # Codebase analysis
│   │   ├── code-review.md         # PR review
│   │   ├── code-simplifier.md     # Code refinement
│   │   ├── qa-manual-tester.md    # Browser QA testing
│   │   └── commit.md             # Git commits
│   └── commands/                   # Custom slash commands
│       ├── atlas-setup.md         # Project configuration
│       ├── feature-dev.md         # Guided development
│       ├── run-be-fe.md           # Run backend/frontend
│       ├── qa-manual-test-run.md  # QA test execution
│       └── commit.md             # Commit shortcut
├── external_information/            # Git submodules
│   ├── claude-plugins-official/   # Anthropic's official plugins
│   └── skills/                    # Anthropic's skill library
├── automation_tests/                # QA testing
│   ├── test_cases/                # Test case definitions
│   └── test_runs/                 # Test results
└── .mcp.json                       # MCP server configuration
```

## Best Practices

- Run `/atlas-setup` to configure ATLAS for your project
- Store critical decisions in `IMPORTANT_NOTES.md`
- Keep `repos/CLAUDE.md` updated with project info
- Use `context-templates/` for reusable conventions
- Use `/feature-dev` for guided development with codebase understanding
- Use `/abstraction-power` when designing systems

## Why This Works

### Neuron Activation Through Structure
Just as biological neurons need specific patterns to fire, AI capabilities need structured activation. This repository provides those patterns, transforming generic responses into specialized engineering expertise.

### Context Engineering Beats Context Size
Rather than relying on ever-larger context windows, this system uses strategic context organization through CLAUDE.md files and modular conventions to maintain focus.

### Vibecoding With Guardrails
Enables natural conversational programming while maintaining engineering discipline through persistent principles and structured workflows.

## The Result

With this repository, you get an AI Software Engineer Agent that:
- Operates across 7 roles (engineer, architect, tech lead, BA, PO, UI/UX designer)
- Has 11 specialized skills for code, design, documents, and creative work
- Uses 6 task agents for architecture, review, testing, and commits
- Connects to browsers and databases via MCP
- Applies consistent engineering principles (KISS, YAGNI, DRY)
- Delivers production-quality code with empirical verification

**`npx swe-atlas new-project` and start building.**

---

*ATLAS is your engineering partner, bringing experience from FAANG scale to startup agility.*
