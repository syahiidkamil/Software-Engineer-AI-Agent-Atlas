---
description: Create a development phase with specs, test cases, and implementation structure
argument-hint: "phase-name"
---

You are ATLAS. Boss wants to create a new development phase. Your job: understand the phase deeply, define clear specs, set up test cases, and create an actionable implementation structure.

The phase name is provided as argument: $ARGUMENTS

If no phase name is provided, use AskUserQuestion to ask: "What is the phase name? (short, descriptive, e.g. 'user-auth', 'payment-integration', 'dashboard-ui')"

## Step 1: Understand the Phase

Use AskUserQuestion to gather context. Ask in focused batches.

**Batch 1 — What and Why:**
- "What does this phase deliver? (one sentence — the user-visible outcome)"
- "Why now? (what depends on this, or what is this blocking?)"

**Batch 2 — Scope and Boundaries:**
- "What's IN scope for this phase? (list the key deliverables)"
- "What's explicitly OUT of scope? (things that look related but aren't part of this phase)"
- "Any hard constraints? (deadlines, tech limitations, dependencies on other phases)"

**Batch 3 — Technical Direction:**
- "Any architectural decisions already made? (framework, patterns, database schema)"
- "Should I explore the existing codebase first to understand the current state?" (if yes, spawn code-explorer agent)

If Boss says to explore the codebase, spawn a **code-explorer** agent:
"Analyze the codebase focusing on areas relevant to {phase-name}. Identify: existing patterns to follow, integration points, files that will likely be modified, and any technical debt that might affect this phase."

## Step 2: Define the Spec

Create the phase directory and spec:

```
phases/{NN}-{phase-name}/
├── SPEC.md                    # Phase specification
├── DECISIONS.md               # Technical decisions (locked vs flexible)
├── test_cases/                # Test case definitions
│   └── .gitkeep
└── test_runs/                 # Test execution results
    └── .gitkeep
```

**Determine phase number:** Check existing `phases/` directory for the next available number (01, 02, 03...).

### SPEC.md Structure

Write `phases/{NN}-{phase-name}/SPEC.md`:

```markdown
# Phase {NN}: {Phase Name}

## Objective
{One paragraph — what this phase delivers and why it matters}

## Deliverables
{Bulleted list of concrete, verifiable outcomes}

## Out of Scope
{What this phase explicitly does NOT include}

## Dependencies
- **Requires:** {phases or systems that must exist first}
- **Enables:** {what future phases this unblocks}

## Technical Approach
{High-level architecture decisions — how this will be built}

## Acceptance Criteria
{Numbered list of conditions that must ALL be true for this phase to be complete}
1. {Observable user behavior or system state}
2. {Measurable outcome}
3. ...

## Implementation Notes
{Any specific patterns, files, or approaches identified from codebase exploration}
```

### DECISIONS.md Structure

Write `phases/{NN}-{phase-name}/DECISIONS.md`:

```markdown
# Phase {NN}: Technical Decisions

## Locked (non-negotiable)
{Decisions Boss has confirmed — do not deviate}

## Flexible (ATLAS discretion)
{Areas where ATLAS can make implementation choices}

## Open Questions
{Things that need to be resolved during implementation}
```

## Step 3: Generate Test Cases

Based on the acceptance criteria and deliverables, generate test cases.

Write test case files in `phases/{NN}-{phase-name}/test_cases/`:

### TC-{NN}-001.md (one per test scenario)

```markdown
# TC-{NN}-001: {Test Case Title}

## Type
{smoke | happy-path | edge-case | regression}

## Preconditions
{What must be set up before this test}

## Steps
1. {Action}
2. {Action}
3. {Action}

## Expected Result
{What should happen — observable and verifiable}

## Priority
{critical | high | medium | low}
```

Generate test cases covering:
- **Smoke tests** — does the basic flow work at all?
- **Happy path** — does the main use case work correctly?
- **Edge cases** — what happens with unexpected input or states?
- **Error handling** — does the system fail gracefully?

Use AskUserQuestion: "I've drafted {N} test cases. Want to review them, add more, or proceed?"

## Step 4: Summary

Report what was created:

```
Phase created: {NN}-{phase-name}

├── SPEC.md              — {brief summary of objective}
├── DECISIONS.md         — {N} locked, {N} flexible, {N} open
├── test_cases/          — {N} test cases
│   ├── TC-{NN}-001.md  — {title}
│   ├── TC-{NN}-002.md  — {title}
│   └── ...
└── test_runs/           — ready for execution

Next steps:
- Review the spec: phases/{NN}-{phase-name}/SPEC.md
- Start implementation: /feature-dev
- Run tests: /qa-manual-test-run
```

Remind Boss: "Run `git diff` to review. When ready, I'll commit."
