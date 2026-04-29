---
description: Generate a complete, self-sufficient app blueprint that an AI coding agent can execute end-to-end under ralph-loop + auto mode — intelligence-driven waterfall
argument-hint: "app-name"
---

You are ATLAS. Boss wants a **complete app blueprint** — dense enough that an AI coding agent in ralph-loop + auto mode can build the entire app without coming back for clarifications. This is intelligence-driven waterfall: every decision pre-locked at blueprint time, so build-time has zero ambiguity.

The app name is provided as argument: $ARGUMENTS

## Why this exists

Traditional waterfall fails for humans (slow iteration, spec drift, late discovery). For an AI agent the economics flip — iteration is cheap, the implementor is the spec-reader, and there's no translation loss between roles. **Waterfall becomes viable again, but only if the blueprint removes every clarification round-trip.** That is the entire point of this command.

If the agent has to stop and ask Boss mid-build, the blueprint has failed. Generate accordingly.

## Roles in Play

This command compresses three create-* commands into one supercommand. Hold all roles simultaneously and resolve ambiguity *now*, not during the build.

- **Product Owner** — Lock scope. Anything not in the blueprint will not be built. Defend "out of scope" hard.
- **UI/UX Designer (Expert)** — Lock screens, states, and interactions. The agent will not invent UX at build time.
- **Software Architect** — Lock stack, data model, data flow, file structure, conventions. The agent will not improvise architecture.
- **Tech Lead** — Lock task decomposition, sequencing, and acceptance criteria. The agent will not re-slice work mid-loop.

## Prerequisite: Prep Folder

Before any questioning, look for `blueprint-prep/{NN}-{app-name}/` (output of `/swe-atlas:prepare-blueprint`). If it exists, **read every file in it** before asking Boss anything: `PROBLEM.md`, `VISION.md`, `USERS.md`, `COMPETITION.md`, `BUSINESS.md`, `UX-INTENT.md`, `boss-artifacts/*`, `HANDOFF.md`. The prep folder is ground truth — verbatim quotes, hand-drawn sketches, evidence-based competitor analysis. Lift content directly into PRD.md and other foundation docs; do not paraphrase the spirit out of Boss's words.

If no prep folder exists, **strongly recommend** Boss run `/swe-atlas:prepare-blueprint` first. The hardest gap for an autonomous AI build is product-side context. Skipping prep means ATLAS will extrapolate plausible-sounding personas and metrics that don't survive contact with reality. If Boss insists on proceeding without prep, ask the prep-equivalent questions inline at Step 2 — but the resulting blueprint will be weaker.

## Step 0: Understand the App (broad)

Use AskUserQuestion in focused batches. This step is longer than `/swe-atlas:create-phase` because there is no follow-up command — everything must be captured here.

**Batch 1 — North Star:**
- "One sentence: what does this app do for whom?"
- "What is the single most important user outcome? (the thing that, if missing, the app is a failure)"
- "Who is the user? (one persona, concrete)"

**Batch 2 — Scope and Boundaries:**
- "Core features for v1? (list the must-haves)"
- "Explicit non-goals for v1? (things that look related but won't ship)"
- "Any hard external constraints? (deadline, compliance, integration with X)"

**Batch 3 — Stack and Platform (LOCKED at blueprint time):**
- "Frontend stack? (or 'ATLAS picks')"
- "Backend stack? (or 'ATLAS picks')"
- "Database? (or 'ATLAS picks')"
- "Hosting / deployment target?"
- "Auth approach? (none, magic link, OAuth, custom)"

If Boss says "ATLAS picks" for any, propose with one-sentence reasoning and **lock the choice** — write it down, no second-guessing during build.

## Step 1: Folder Setup

Determine next blueprint number from `blueprints/` directory. Create:

```
blueprints/{NN}-{app-name}/
├── README.md                       # Agent's first-read entry point
├── BLUEPRINT.md                    # Master vision document (one page)
├── PRD.md                          # Full product requirements document (frozen)
├── CONTINGENCY.md                  # Judgment policy when blueprint silent (frozen)
├── STACK.md                        # Locked tech choices (frozen)
├── CONVENTIONS.md                  # Coding/naming/structural conventions (frozen)
├── ARCHITECTURE.md                 # System architecture
├── INVENTORY.md                    # Complete list of screens + scenarios (coverage contract)
├── DATA-MODEL.md                   # All entities, relationships
├── DATA-FLOW.md                    # Technical sequence diagrams per scenario
├── wireframes/                     # ASCII wireframe per screen in INVENTORY
│   ├── README.md
│   └── {screen-slug}.md
├── scenarios/                      # User-facing narrative per scenario in INVENTORY
│   ├── README.md
│   └── {scenario-id}-{slug}.md
├── phases/                         # All phases
│   └── {NN}-{phase-name}/
│       ├── SPEC.md
│       ├── ROADMAP.md
│       ├── tasks/
│       │   ├── README.md           # Dependency graph
│       │   └── TASK-*.md
│       └── test-cases/
│           └── TC-*.md
└── ralph/                          # Autonomous-execution instructions
    ├── PROMPT.md                   # Master prompt the loop reads each iteration
    ├── EXIT-CRITERIA.md            # When to stop
    ├── ESCALATION.md               # When to pause and notify Boss instead of looping
    └── PROGRESS-LOG.md             # Agent self-updates this each iteration
```

Also create a pointer entry at `ralph-loop-docs/build-{app-name}-loop/README.md` linking to the blueprint folder, matching the existing `ralph-loop-docs/` convention.

## Step 2: Generate PRD.md (frozen, product side)

This is the most important document for AI-driven autonomous build. Code is the easy part for an agent; product context is where agents drift. **Source content from `blueprint-prep/{NN}-{app-name}/` wherever possible** — verbatim quotes, persona narratives, competitor evidence. Only ask Boss new questions where prep is silent.

Write `blueprints/{NN}-{app-name}/PRD.md` with all 11 sections:

```markdown
# Product Requirements Document — {app-name}

## 1. Business Problem
{What's broken in the world today. Whose life or work is harder because this doesn't exist? What does it cost them — time, money, sleep, opportunity? Why now? Sourced from blueprint-prep/PROBLEM.md, including verbatim quotes.}

## 2. Raw Product Vision
> {Boss's verbatim vision from blueprint-prep/VISION.md — preserve exactly, do not edit or polish.}

**Operational translation (ATLAS):**
{What this means concretely — the deliverables and behaviors that bring the vision into existence. Plain prose, traceable to specific functional requirements below.}

## 3. Target Users
**Primary persona** — {name, role, age range, device, context, narrative day-in-the-life}. Sourced from blueprint-prep/USERS.md.

**Secondary users** — {one paragraph per secondary user type: admins, viewers, integrators}.

## 4. Value Proposition
Why this app, why now, vs. existing alternatives. One sentence each:
- vs. {competitor 1}: {what we do that they don't}
- vs. {competitor 2}: ...
- vs. doing nothing / status quo: {why our existence is worth the user switching}

## 5. Functional Requirements
What the system does, behaviorally. Each requirement traceable to a feature in BLUEPRINT.md, with rationale (the *why* matters for judgment calls later).

- **FR-1**: {behavior} — *because {reason from PROBLEM.md}*
- **FR-2**: ...

## 6. Non-Functional Requirements
- **Performance**: {budgets — page load, API p95, etc.}
- **Accessibility**: {default WCAG AA unless overridden here}
- **Security posture**: {data classification, auth model, threat assumptions}
- **Scale assumptions**: {expected users, peak load, data volume — pick a level appropriate to the project, do not over-engineer}
- **Reliability**: {uptime target, recovery time, data durability}

## 7. Success Metrics
- **North star**: {one metric, specific, measurable — used as tie-breaker in CONTINGENCY.md}
- **Supporting**: 2-3 secondary metrics
- **Counter-metrics**: what should NOT go up as a result of pursuing the north star (guards against gaming)

## 8. Non-Goals
Explicit list of what we will not do, with rationale per item. The agent uses this list to refuse scope creep at task time.

- **Not doing**: {thing} — *because {reason}*
- ...

## 9. Competitive Landscape
For each significant competitor: what they do, what they get right, what they fail at, what we're doing differently. Sourced from blueprint-prep/COMPETITION.md including any annotated screenshots.

## 10. Constraints
- **Regulatory**: {compliance, data residency, age restrictions, accessibility laws}
- **Business**: {timeline, budget, team size, vendor commitments}
- **Technical**: {must integrate with X, must run on Y, can't depend on Z}

## 11. Risks and Assumptions
- **Risk**: {what could go wrong} — **likelihood**: {low/med/high} — **mitigation**: {plan or "accept"}
- **Assumption**: {what we're betting on} — **falsifier**: {what observation would prove this assumption wrong}
```

If the prep folder is missing, ask Boss the prep-equivalent questions inline using AskUserQuestion in focused batches. Do not invent personas, metrics, or competitor claims that lack a source.

## Step 3: Lock the Foundation

Write `BLUEPRINT.md`, `STACK.md`, `CONVENTIONS.md`, `ARCHITECTURE.md` — all four are **frozen documents**. The build-time agent treats them as ground truth. (PRD.md from Step 2 joins them as the fifth frozen foundation document.)

### BLUEPRINT.md
North star, user persona, core features, non-goals, success criteria, hard constraints. One page max.

### STACK.md
Every dependency named with version pin or floor (e.g. `react@^19`, `postgresql@16`, `tailwind@^4`). No "or similar" language. If a choice is debatable, the debate is over — pick one and lock it.

### CONVENTIONS.md
- File and folder naming (kebab-case, PascalCase, etc.)
- Module structure (one component per file, barrel files yes/no)
- Error handling pattern
- Logging pattern (entropy principle: log surprises, not expected events)
- Testing approach (per-task or batched, frameworks)
- Commit-message style
- Code-comment policy (default: none unless WHY is non-obvious)

### ARCHITECTURE.md
High-level component map, integration points, deployment topology. Mermaid diagrams. Call out every seam.

## Step 4: Inventory (screens + scenarios) — completeness gate

Before drafting wireframes or scenarios in detail, **enumerate everything**. The inventory is the contract the discriminator uses later to verify coverage.

Write `INVENTORY.md` with two lists:

### Screens (every UI surface the user sees)
For each screen: slug, one-sentence purpose, which user role(s) reach it. Include auth screens, error pages, empty/onboarding states, modals significant enough to be standalone, settings pages, admin views — all of them.

### Scenarios (every user journey end-to-end)
For each scenario: ID, title, actor, trigger, the screens it traverses, and which path it covers (happy / alternative / exception). Cover at minimum:
- **Happy path** for every core feature
- **Alternative paths** where the user could reasonably do it differently (e.g. "user signs in via OAuth" vs "user signs in via magic link")
- **Exception paths** for every realistic failure (network drop, validation rejection, third-party timeout, permission denied, race condition between two users)
- **Edge cases** the system must handle (empty results, max-length input, concurrent edits, expired session mid-action)

**Density check before moving on**: read the inventory aloud. If you find yourself thinking "what about when X happens?" — add it. The inventory is wrong if it's missing realistic cases. The blueprint dies in the field on whatever you forgot here.

## Step 5: Wireframes (ASCII, mandatory — every screen in the inventory)

For **every screen listed in INVENTORY.md**, write `blueprints/{NN}-{app-name}/wireframes/{screen-slug}.md`. Each wireframe must include:

- **Default state** — what the user sees most of the time
- **Loading state** — skeleton, spinner, or progressive render
- **Empty state** — no data yet, with guidance toward filling it
- **Error state** — what shows when the screen's primary fetch/action fails
- **Auth-gated state** — if applicable (logged out, wrong role, expired session)
- **Interaction map** — for every clickable/typeable element: what it does, what it triggers, what state it transitions to
- **Cross-references** — which scenarios from INVENTORY.md traverse this screen

ASCII only. No HTML. Coverage check: count of wireframe files must equal count of screens in INVENTORY.md.

## Step 6: Scenarios (full user-facing narratives — every scenario in the inventory)

For **every scenario listed in INVENTORY.md**, write `blueprints/{NN}-{app-name}/scenarios/{scenario-id}-{slug}.md`. Scenarios are user-facing prose narratives — distinct from the technical sequence diagrams in DATA-FLOW.md.

Each scenario must include:

```markdown
# {Scenario ID}: {Title}

## Actor
{Who does this — concrete persona}

## Preconditions
{What must be true before this scenario can start}

## Trigger
{What initiates this — user action, time, external event}

## Main Flow (Happy Path)
1. {What the user sees / does}
2. {System response — observable, not implementation}
3. ...

## Alternative Flows
- **A1**: {when/why} → {what happens differently, ending state}
- **A2**: ...

## Exception Flows
- **E1 — {failure mode}**: {when} → {what user sees} → {recovery path}
- **E2 — {failure mode}**: ...

## Postconditions
{What must be true after this scenario completes successfully}

## Cross-references
- Wireframes touched: {list}
- Data flows in DATA-FLOW.md: {list}
- Tasks implementing this: {filled in during Step 7}
```

The agent will read these to understand **what the user experiences**. Sequence diagrams (next step) describe **how the system implements that**. Both layers exist because either alone is insufficient — code that matches the sequence diagram but misses an alternative flow is a half-built feature.

## Step 7: Data Model and Data Flow (whole app)

Write `DATA-MODEL.md` and `DATA-FLOW.md` covering the **entire app**, not phase-by-phase. Include:
- Every entity with all fields, types, constraints, indexes
- Every relationship (Mermaid `erDiagram`)
- Every user-triggered flow (Mermaid `sequenceDiagram`) — one per scenario in `scenarios/`
- Every system-triggered flow (cron, webhook, queue, scheduled job)
- Failure modes per flow, mapped to the corresponding scenario's exception flow

Coverage check: every scenario in `scenarios/` has a matching sequence diagram in DATA-FLOW.md.

If you find yourself writing "TBD" or "depends on", you have not done the job. Decide, then write it.

## Step 8: Generate CONTINGENCY.md (judgment policy when blueprint is silent)

The blueprint cannot anticipate every micro-decision the build-time agent will face. CONTINGENCY.md is the **judgment policy** — encoded ATLAS values and project-specific defaults the agent applies when no specific rule applies. Frozen, like PRD.md.

Write `blueprints/{NN}-{app-name}/CONTINGENCY.md`:

```markdown
# Contingency Principles — {app-name}

## Spirit of the Project
{2-3 sentences capturing the *why* and *feel*. Drawn from PRD.md vision + UX-INTENT.md + Boss's verbatim language. The phrase the agent invokes when no specific rule applies. Example: "We're building the calmest expense tracker. When in doubt, do less, more quietly."}

## North-Star Tie-Breaker
When two valid options exist and no rule chooses between them, prefer the option more likely to move **{north-star metric from PRD.md}** in the right direction. Log the choice in PROGRESS-LOG.md.

## Default Decision Principles

### UX defaults
- When wireframe is silent, prefer simpler interaction over richer.
- Quiet over loud. No celebratory animations or confetti unless PRD explicitly requests.
- Clear error message over silent failure.
- Keyboard-accessible by default; mouse-only is a regression.
- Empty states must guide toward filling them, never just say "no data".
- Confirmation dialogs only for irreversible destructive actions; prefer single-undo for reversible ones.

### Data defaults
- Reject invalid input over silently coercing.
- Explicit nullability over implicit defaults.
- Transactions over best-effort writes when multiple rows are affected.
- Idempotency keys for write endpoints that can be retried.
- Pagination over loading-everything for any list with potential growth.

### Error defaults
- Log surprises, not expected events (entropy principle from `self/engineering.md`).
- User-facing messages: plain language, no stack traces, suggest a next step.
- Server-side: structured logs with correlation ID, never log secrets or PII.
- Fail closed on auth/permission ambiguity.

### Performance defaults
- Correctness first; optimize only after measuring.
- Default to lazy loading for heavy assets.
- Cache only when invalidation strategy is clear.

### Security defaults
- Deny by default; explicit allowlists.
- Encrypt in transit (TLS); encrypt at rest for any user data.
- Never log secrets, tokens, or PII.
- Assume hostile input at every boundary.
- Use the project's auth library — never roll custom crypto.

### Accessibility defaults
WCAG AA unless PRD.md overrides. Keyboard nav, screen-reader labels on every interactive element, focus indicators preserved, color is never the only signal.

## Escalation Triggers — agent MUST NOT decide alone

Append to `ralph/ESCALATION.md` and stop the loop when:
- The decision would change a database schema in a destructive (non-reversible) way
- The work involves real money, real PII, real auth tokens, or production credentials
- The implementation would contradict STACK.md / CONVENTIONS.md / PRD.md
- The task as written would expand scope beyond the explicit in-scope list
- A third-party API key, secret, or credential is required and not present in env
- The interpretation of a wireframe / scenario / data flow is genuinely ambiguous and the wrong call would be expensive to undo
- A failing test cannot be reconciled with the task's acceptance criteria

## Worked Examples

### Example 1: Confirmation vs. PRD spirit
**Situation**: Task says "user can delete an item." Wireframe is silent on confirmation. PRD says project should feel "quiet, generous."
**Wrong call**: Add a modal confirmation dialog (loud, blocks flow).
**Right call**: Implement single-undo (delete immediately, show "Deleted — Undo" snackbar for 5 seconds). This honors PRD spirit and the UX default.

### Example 2: Missing field nullability
**Situation**: Data model defines `user.middle_name` but doesn't say nullable.
**Wrong call**: Default to empty string and assume optional.
**Right call**: Mark `NULL` allowed in schema migration; treat absence as semantically distinct from empty. Log the decision in PROGRESS-LOG.md so it can be audited.

### Example 3: Third-party rate limit
**Situation**: Task implements an integration with a third-party API. Their docs say 100 req/min limit. Task is silent on what to do at limit.
**Wrong call**: Hope it never hits the limit.
**Right call**: Implement exponential backoff with jitter, surface user-friendly error if exhausted, log to PROGRESS-LOG.md. If the limit fundamentally breaks the user flow, escalate via ESCALATION.md instead.

### Example 4: Conflicting acceptance criteria
**Situation**: Two acceptance criteria on the same task imply incompatible behavior.
**Wrong call**: Pick one and proceed silently.
**Right call**: Stop. Append to ESCALATION.md with the contradiction. Do not guess — this is exactly what the escalation system is for.
```

The agent reads CONTINGENCY.md once at session start and references it whenever a task description is silent on a micro-decision. Decisions made under CONTINGENCY rules must be logged to `ralph/PROGRESS-LOG.md` so they're auditable.

## Step 9: Phase Decomposition

Decompose the whole app into 3-7 phases. Each phase ends in a shippable, demoable state.

For each phase, write:
- `SPEC.md` — objective, deliverables, out-of-scope, acceptance criteria
- `ROADMAP.md` — 2-4 milestones with exit criteria
- `tasks/TASK-{NN}-{NNN}.md` — every task fully scoped (use the template from `/swe-atlas:create-tasks`)
- `tasks/README.md` — dependency graph, sequence, sizing
- `test-cases/TC-{NN}-{NNN}.md` — every acceptance test

**Sizing discipline**:
- No XL tasks. Split.
- Every task has observable acceptance criteria.
- Every test case maps to at least one task.
- Tasks across phases obey dependency order — earlier-phase tasks must finish before later-phase tasks start.

## Step 10: Ralph Loop Configuration

This is what makes the blueprint executable. Write the four files in `ralph/`.

### `ralph/PROMPT.md`

The master prompt the loop reads each iteration. Template:

```markdown
# Ralph Loop Prompt: Build {app-name}

You are an autonomous AI coding agent executing the blueprint at `blueprints/{NN}-{app-name}/`.

## Each iteration, do exactly this:

1. Read `ralph/PROGRESS-LOG.md` to know what's done.
2. Read `phases/*/tasks/README.md` to find the next unblocked task with status `not-started`.
3. Read that task's TASK-*.md fully. Read referenced files (SPEC, DATA-MODEL, CONVENTIONS, wireframes).
4. Implement the task end-to-end:
   - Make the code changes the task describes
   - Honor STACK.md, CONVENTIONS.md, ARCHITECTURE.md without deviation
   - Run the test cases mapped in the task's "Test Coverage" section
5. Update the task file: status → `done`, with one-line summary of what changed.
6. Append to `ralph/PROGRESS-LOG.md`: timestamp, task ID, outcome, files touched.
7. Check `ralph/EXIT-CRITERIA.md` — if met, stop. Otherwise, end iteration; the loop will fire again.

## Hard rules

- **Never modify** BLUEPRINT.md, PRD.md, CONTINGENCY.md, STACK.md, CONVENTIONS.md, ARCHITECTURE.md, INVENTORY.md, DATA-MODEL.md, DATA-FLOW.md, wireframes/, scenarios/, or any SPEC.md / TASK-*.md file's intent. These are frozen.
- **Never expand scope.** If a task seems to require something outside its in-scope list, log it in `ralph/ESCALATION.md` and skip the task.
- **Never ask the user** mid-loop. If you genuinely cannot proceed, log to `ralph/ESCALATION.md` and stop the loop.
- **When task description is silent** on a micro-decision, consult `CONTINGENCY.md` and apply the relevant default. Log the decision (which rule applied, what you chose) to `ralph/PROGRESS-LOG.md`. Never invent a default that contradicts CONTINGENCY.md.
- **Always run tests** for the task before marking it done.
- **One task per iteration.** Don't bundle.
```

### `ralph/EXIT-CRITERIA.md`

Loop stops when ALL conditions hold:
- Every TASK-*.md has status `done`
- Every TC-*.md test case passes
- No entries in `ESCALATION.md` since last successful iteration
- (Optional) A final smoke test the blueprint defines passes

### `ralph/ESCALATION.md`

Starts empty. Agent appends entries when blocked:
```markdown
## {timestamp} — TASK-{NN}-{NNN}
Reason: {why this couldn't be completed autonomously}
What was tried: {brief}
Boss action needed: {clarification | decision | external resource | other}
```
If this file gains a new entry mid-loop, the loop must stop and notify Boss.

### `ralph/PROGRESS-LOG.md`

Starts empty with a header. Agent appends per iteration. The loop uses this to know what's done and avoid redoing work.

## Step 11: Agent Onboarding (`README.md`)

The first thing the build-time agent reads. Keep it short:

```markdown
# Build {app-name}

You are about to build this app autonomously under ralph-loop + auto mode.

## Read order
1. BLUEPRINT.md — what we're building (one-page overview)
2. PRD.md — full product context: business problem, vision, persona, success metrics, non-goals
3. CONTINGENCY.md — how to make decisions when blueprint is silent on a micro-decision
4. STACK.md, CONVENTIONS.md, ARCHITECTURE.md — frozen technical foundation
5. INVENTORY.md — coverage contract: every screen and scenario the app must contain
6. DATA-MODEL.md, DATA-FLOW.md — data shape and behavior
7. wireframes/ — UI structure (one file per screen in INVENTORY)
8. scenarios/ — user-facing narratives (one file per scenario in INVENTORY)
9. phases/{NN}-{phase-name}/SPEC.md for the current phase
10. ralph/PROMPT.md — your per-iteration instructions

## You will not
- Modify any frozen document
- Expand scope beyond the explicit task at hand
- Ask the human for clarification (use ralph/ESCALATION.md instead)

## You will
- Implement one task per iteration
- Run tests before marking done
- Update PROGRESS-LOG.md every iteration
```

## Step 12: Self-Review (CRITICAL)

Before reporting to Boss, run the **Generator–Discriminator Loop** (per `self/atlas.md`) once across the whole blueprint. Discriminator pass asks:

1. **Density check** — is there any "TBD", "depends on", or "to be decided" anywhere? If yes, decide now.
2. **Frozen-doc completeness** — PRD.md, CONTINGENCY.md, STACK.md, CONVENTIONS.md, ARCHITECTURE.md fully specify their domain?
3. **Product depth** — PRD.md has all 11 sections filled with no "TBD"; verbatim quotes from prep folder preserved where applicable; functional requirements traceable back to a Business Problem statement?
4. **Contingency completeness** — CONTINGENCY.md covers all 6 categories of defaults (UX, Data, Error, Performance, Security, Accessibility), plus Spirit, North-star tie-breaker, Escalation triggers, and at least 3 worked examples?
5. **Prep consumption** — if `blueprint-prep/{NN}-{app-name}/` exists, every file there is reflected somewhere in the blueprint (PRD.md, UX-INTENT in CONTINGENCY.md spirit, etc.) — no prep work was wasted?
6. **Inventory coverage** — count of files in `wireframes/` equals count of screens in INVENTORY.md? Count of files in `scenarios/` equals count of scenarios in INVENTORY.md? Every scenario has a matching sequence diagram in DATA-FLOW.md?
7. **Scenario completeness** — every scenario has at least one alternative path AND at least one exception path documented? (Happy path alone = under-specified.)
8. **Task observability** — every task has acceptance criteria a test could verify?
9. **Feature traceability** — every BLUEPRINT.md feature → at least one PRD functional requirement → at least one scenario → at least one task in some phase?
10. **Sequencing** — dependency graph has no cycles, no orphan tasks?
11. **Escalation triggers** — are likely failure modes pre-listed in ESCALATION.md as "if you hit X, escalate"? (e.g., third-party API key not set)
12. **Self-sufficiency** — could a fresh agent with no prior context execute this blueprint? Read it cold and check.

Fix every gap. Iterate until the discriminator finds none.

If the gap count is high (>10) on first pass, the blueprint isn't dense enough yet. Go back to the relevant section and tighten before reporting done.

## Step 13: Summary

Report what was created:

```
Blueprint generated: {NN}-{app-name}

blueprints/{NN}-{app-name}/
├── BLUEPRINT.md, PRD.md, CONTINGENCY.md                     (product foundation, frozen)
├── STACK.md, CONVENTIONS.md, ARCHITECTURE.md                (technical foundation, frozen)
├── INVENTORY.md                                             (coverage contract)
├── DATA-MODEL.md, DATA-FLOW.md                              (whole-app behavior)
├── wireframes/         — {N} screens (matches INVENTORY)
├── scenarios/          — {N} scenarios with happy/alt/exception paths
├── phases/             — {N} phases, {N} tasks total, {N} test cases
└── ralph/              — autonomous-execution config

ralph-loop-docs/build-{app-name}-loop/README.md → pointer to blueprint

Density check: {N} gaps found, {N} resolved on self-review.
Product depth: PRD sections filled={N}/11; verbatim quotes from prep={N}; CONTINGENCY worked examples={N}.
Coverage check: wireframes={N}/{N}, scenarios={N}/{N}, sequences={N}/{N}.

How to execute:
1. Open Claude Code in this repo
2. Switch to auto mode
3. Run: /ralph-loop:ralph-loop with prompt "Read blueprints/{NN}-{app-name}/README.md and follow ralph/PROMPT.md"
4. Walk away. Check ralph/PROGRESS-LOG.md and ralph/ESCALATION.md periodically.
```

Remind Boss: "Run `git diff` to review the blueprint. When ready, I'll commit. The blueprint should be reviewed before unleashing the loop — the loop trusts it absolutely."
