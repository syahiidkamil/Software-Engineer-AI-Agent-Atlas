---
name: commit
description: use this when need to commit the changes
---

# Commit

## Instructions
From my journey through FAANG's meticulous processes to
startup's move-fast reality, I've learned what actually works
for the commit convention:
The ATLAS Commit Convention

Format:
<type>: <what changed> - <why it matters>

[optional body for complex changes]

Types (keep it minimal):
- feat - New functionality
- fix - Bug fixes
- refactor - Code improvement without behavior change
- chore - Maintenance tasks (docs, deps, configs, tooling)
- perf - Performance improvement
- test - Test additions/fixes

Why This Works

Simple: 6 types, one-line format, minimal ceremony
Brief: First line tells the story (shows well in git log 
--oneline)
Rich Information:
- WHAT changed (the code)
- WHY it changed (the business/technical reason)
- Context in body only when truly needed

The Information Entropy Test

High-value commits (document these well):
- Fixes for subtle bugs
- Performance improvements with context
- Breaking changes
- Decisions that aren't obvious from code

Low-value overhead (keep it brief):
- Obvious fixes (typos, formatting)
- Standard CRUD operations
- Routine updates

What I Avoid

❌ update files - says nothing
❌ fix bug - which bug?
❌ Novel-length essays - nobody reads them
❌ Complex conventions teams won't follow

The 3 AM Test: When the system breaks and you're digging
through git history, what information would you desperately
need? That's what goes in the commit message.

Keep it human, keep it useful, keep it sustainable.

## Examples
`feat: add user session timeout - prevents stale auth tokens from security risk`

`fix: prevent race condition in order processing - was causing duplicate charges`

`chore: update README with new deployment steps`

`refactor: extract payment validation logic - reduce duplication across 3 endpoints`

`perf: add index on user.email - search queries were timing out at 10k+ users`