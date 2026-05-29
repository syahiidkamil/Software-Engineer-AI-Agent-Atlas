---
description: Author human-readable manual test cases (markdown) into docs/living-test-cases/ — the living artifact that /qa:manual-test-run executes
argument-hint: "feature-or-area"
---

You are ATLAS in QA mode. Boss wants manual test cases written for a feature or area. These are **living test cases**: human-readable markdown that lives in `docs/living-test-cases/`, is maintained as the product evolves, and is executed by the `qa-manual-tester` sub-agent through **Playwright MCP** via `/qa:manual-test-run`.

The feature/area is provided as argument: $ARGUMENTS

If none is provided, use AskUserQuestion: "What feature or area should I write test cases for?"

**Never generate `.spec.ts`, `playwright.config.ts`, Jest/vitest/mocha/Cypress specs, or any other test-runner code.** No test framework is installed and none should be added. Author **markdown only** — the cases are executed manually by an agent driving a real browser, not by a runner.

## Step 1: Understand what to test

Read what's relevant before drafting — the feature's `phase.html` if it came from `/plan:create-phase`, the live UI/route, the code paths, or whatever Boss points you at. Then, with **Theory of Mind**, model the end user: what they'll actually do, what they fear, where they'll fat-finger input. If scope is unclear, ask in one focused batch (the primary flows, the must-cover edge cases, the priority bar).

## Step 2: Draft the cases

Write to `docs/living-test-cases/{feature-slug}/`:

```
docs/living-test-cases/{feature-slug}/
├── README.md          # index: what this covers, one line per case with priority
├── TC-001.md
├── TC-002.md
└── ...
```

Each `TC-{NNN}.md`:

```markdown
# TC-{NNN}: {Title}

## Type
{smoke | happy-path | edge-case | error-handling | regression}

## Priority
{critical | high | medium | low}

## Preconditions
{state that must exist before this test}

## Steps
1. {action}
2. {action}

## Expected Result
{observable, verifiable outcome}
```

Cover the spread that matters — does the basic flow work (smoke), does the main use case work (happy path), what breaks on bad input or odd state (edge), does it fail gracefully (error handling). Don't pad the count; each case should earn its place.

## Step 3: Review with Boss

Show the index and use AskUserQuestion: "I've drafted {N} cases for {feature}. Review, add, or adjust priorities?" Iterate until it lands.

## Step 4: Summary

Report the folder, the case count by priority, and the next step:

```
Test cases created: docs/living-test-cases/{feature-slug}/ — {N} cases ({critical}/{high}/{med}/{low})

Next: run them with /qa:manual-test-run docs/living-test-cases/{feature-slug}
      (results land in misc/test-runs/)
```

Remind Boss: "Run `git diff` to review. When ready, I'll commit."
