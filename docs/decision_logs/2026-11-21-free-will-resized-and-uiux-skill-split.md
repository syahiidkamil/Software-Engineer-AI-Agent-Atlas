# free-will sized to the fork, and the UI/UX skill split into playbook and reference

**Date:** 2026-11-21
**Status:** Implemented in the working tree, not committed. Awaiting Boss review.
**Source:** Boss: "proceed to make it more efficient, also update the free-will to make it more efficient also more relevant in newer models, not overconsumption/overengineer (current free will might be overengineered for older model)".

## Context

After the first efficiency pass (compaction hook, bounded reviews, output rule), what was left to win was the cost of a skill each time it loads. Measured:

- `free-will/SKILL.md`: 13,560 characters. On every trigger, including "adding a dependency", it prescribed five to ten branches from seven named generators, a fact for each, a forward simulation of each, a pre-mortem, and a refutation that could be a subagent.
- `super-ui-ux-design/SKILL.md`: 36,239 characters, about 9,000 tokens on every UI task. Eleven "nodes" of design theory (Nielsen's heuristics, the UX laws, Gestalt, WCAG ratios, the Double Diamond, a study path, a glossary) came before the 8,000-character execution playbook.
- No ATLAS-owned prompt uses shouted instructions (one match for MUST/NEVER/ALWAYS across all of them, and that one is the sentence saying not to). Nothing to fix there.

The test applied was the one from the bundled prompt-audit guide: could the model already know this? What only the author knows stays (when to pay for deliberation, where the evidence must come from, who decides, where it is logged). What a current model does unprompted, and the scaffolding built for a model that would not, goes.

## Decisions

1. **`free-will` has two passes, and the cost of undoing picks the pass.** 13,560 to 6,668 characters.
   - *Light pass* (a fix failed twice, a new dependency, anything cheap to back out of): in the model's own reasoning; the default, two alternatives that differ in kind (one is always "do nothing or defer"), one outside fact, a choice in two or three lines. No subagent, no document.
   - *Full pass* (schema or migration, deleting what others depend on, a public API, the founding architecture): three to five options, evidence, consequences for the two or three left, a pre-mortem on the leader, choose, refute, log.
   - *Removed:* the Many-Worlds framing and its diagram; the seven mandatory branch generators and the cap of ten; the "intuitive dots" sub-procedure; "inject entropy" as a stand-in for a temperature dial. These were workarounds for a model that collapsed to one answer unless forced apart.
   - *Kept, because they are the author's choices:* the countable triggers; an option must cite a fact from outside the model; precedent and first principles as the two sources that leave the model's prior; the null option; run the probe when it is cheap; decide and own it, escalate only what is the partner's; refute before acting; the decision log and going back to it when consequences land.
   - *Changed:* the refuter for a one-way door is the advisor when the workspace has one, otherwise one subagent. The visible output is the decision and its reasons, not the deliberation.
   - *Cost:* a medium fork gets fewer options than before. That is the intent; the old procedure spent a full deliberation on decisions that take minutes to undo.

2. **`super-ui-ux-design`: the theory map moved, unchanged, to `references/schemata.md`.** `SKILL.md` is now the playbook plus an index of the eleven nodes and four rules that hold on every build (conventional interaction, aesthetics as a multiplier, the WCAG AA contrast floors, judge the rendered screen). 36,239 to 8,930 characters loaded per use; the 27,365 characters of theory load when a review, a conversion diagnosis or an explanation needs a node.
   *Rejected:* deleting the theory. It is Boss's map and useful when critiquing; it only did not need to be read before every build.
   *Cost:* a build no longer has the full map in context. The model knows this material, and the four rules carry what the playbook leaned on.

3. **References aligned:** `/atlas:oneshotapp` (light or full pass per tripwire; full-pass decisions get a log entry, light-pass ones a line in the final report), the autonomous `CLAUDE.md` variant, and three README passages.

## Verification

- `ATLAS_SKIP_SUBMODULE=1 ATLAS_NOTIFY=off npm test`: 119 passing.
- Update path, against a workspace scaffolded by the published 3.1.0: the two skill files and `oneshotapp.md` "Safe to replace", `references/schemata.md` "New in this version"; applied cleanly.
- Live, Sonnet 5.5, headless, in that workspace:
  - *A dependency decision in plain words* ("I was going to add moment for one date format"): the session did not invoke the skill. It made the decision the light pass describes anyway: the default named, the built-in and a runner-up library considered, facts read from `package.json` and the runtime, a choice with what it gives up. One run, so weak evidence, but it points the way Boss suspected: a current model does the small deliberation unprompted, and the skill's weight belongs on the full pass.
  - *`/free-will` on a money-as-FLOAT migration:* a decision, four rejected options with a line each, the order of work, and the checks that would change it; 4,272 characters; one clean-context refuter. Cost $0.57.

Not verified: a side-by-side cost comparison with the old skill on the same prompts (it would have cost more than it told); whether UI output quality holds without the map in context, which only use will show; anything on Fable or Opus.

## Left for Boss

- The other large own prompts load only on their command: `design/create-design-md` (24,044 characters), `brainstorm/prototype` (15,204), `atlas/oneshotapp` (12,578), `plan/create-phase` (11,064), `plan/visual` (10,333). They are step-by-step procedures where order matters, so they are not obvious cuts; each needs reading against real runs before it is shortened.
- `super-ui-ux-design` names `LICENSE.txt` in its frontmatter and the folder has none. It was so before this change.
