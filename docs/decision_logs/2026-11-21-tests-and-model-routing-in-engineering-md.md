# Test and model-routing rules go into the always-loaded engineering file

**Date:** 2026-11-21
**Status:** Implemented in the working tree, not committed. Awaiting Boss review.
**Source:** Boss asked which models to use for what, said that in his experience unit and end-to-end tests written by an agent are often a formality (they pass, do not cover the critical path, and bloat the code), had the strategies written into the README, and then asked how the main agent would know any of it when it is in neither `CLAUDE.md` nor a skill description.

## Context

It would not know. A README is read by people. A session loads `CLAUDE.md`, the files it imports (`misc/self/atlas.md`, `misc/self/engineering.md`, `NOTES.md`), the rules in `.claude/rules/`, and the one-line descriptions of skills, agents and commands. The README section "Which model for which job" was therefore advice to the user only.

Two of the six README strategies need the model to act differently:

- **Tests.** Nothing loaded said what makes a test worth writing. This release is the evidence that the default is not good enough: the suite was green at over 100 tests while three independent reviews each found blocking bugs, and when each of the 34 fixes of the third round was broken on purpose, two had no test that failed.
- **Models.** The main agent picks the model of every subagent it starts. Nothing loaded said how.

## Decisions

1. **Two sections added to `misc/self/engineering.md`: "Tests That Can Fail" and "Models and Delegation".** They pass the test the identity trim set the same day (`2026-11-21-identity-text-trimmed.md`): each line is a choice among reasonable alternatives or a procedure with a named step, and none is something a current model does unprompted.
   *Tests:* derived from the agreed acceptance checks, not from the code; a fix that matters is broken on purpose to see a test fail, and a test that cannot fail is deleted; a few runs through the real app or artifact over many tests of helpers; the stage sets how many.
   *Models:* the session's model and effort are Boss's settings and the subagent's model is the agent's choice; the cheapest model that can do the job, by alias (`haiku`, `sonnet`, `opus`), so the text does not go stale with each model release; work that needs the whole conversation stays in the session, because no subagent has it whatever its model; delegate independent work and keep dependent chains; escalate by verifying, then effort, then a bigger model, and say so rather than grind on.

2. **Not a new rule file.** A file in `.claude/rules/` would reach the vanilla flavor too and would be replaced cleanly by `update`. Rejected because it adds a shipped file the day of a release (the counts in the end-to-end checks and the reviewed tarball change), and because these are engineering principles, which already have a home. The vanilla flavor ships no identity text by design.

3. **Model names stay out of the loaded text.** Versions and prices are in the README, dated, with the link to Anthropic's guide (<https://claude.dev/blog/which-claude-model-should-you-build-with/>). The loaded text uses the aliases Claude Code resolves.

4. **The README says where the rules live**, so a reader does not assume the model reads the README.

## Tradeoffs

- **`engineering.md` grows from about 780 to about 1,120 words** on the same day it was cut from 10,436 to 4,817 characters. Every always-loaded line competes with the request. These lines were added because the behaviour they ask for was demonstrably missing; if they prove not to change behaviour, they should go by the same test.
- **`misc/self/engineering.md` is a seeded file.** A workspace whose owner edited it sees it under "Needs a merge" in `update`. It was already changed in this release by the trim, so this adds no new merge for anyone.
- **The rule on effort is advice the model can only pass on.** A subagent's effort is set by its definition or by the user, so "ask for more effort" means telling Boss, not changing a setting.
- **Not measured.** Whether the test rules reduce formality tests in practice is unverified: nothing here ran a project before and after.
