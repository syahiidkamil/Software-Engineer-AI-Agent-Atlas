# Adversarial-review: a standalone skill, canonical and target-agnostic

**Date:** 2026-06-16
**Status:** Accepted
**Method:** `free-will` deliberation (medium stakes — a new always-in-context skill that overlaps existing review tooling)

## Context

ATLAS already contains the *idea* of adversarial review, but only embedded in `/atlas:oneshotapp`
Phase 4 (spawn reviewer subagents with opposing mandates + clean contexts; lenses
correctness/security/empty-world; reproduce-before-fixing triage). It is unreachable outside that
one-shot flow. Separately there is a `/code-review` skill and a `code-review` agent — both are
*static, conservative, confidence-scored* reviews of a diff/PR that **explicitly do not run the app**
(`code-review.md`: "Do not check build signal or attempt to build... These will run separately").

The fork: how to scope/structure a new `adversarial-review` skill so it is genuinely reusable and
does not duplicate or conflict with those neighbors.

## Branches held open

1. **Urge** — copy Phase 4 into a SKILL.md ~verbatim, self-contained. *Sacrifice:* two copies of the
   same protocol that will drift; no clear line vs `/code-review`.
2. **Contrarian** — don't add a skill; bolt an "adversarial mode" onto `/code-review`. *Sacrifice:*
   contradicts the explicit ask, and muddies `/code-review`'s deliberately static/diff scope with
   app-running reproduction. Rejected — but it sharpens the differentiator.
3. **Synthesis (chosen)** — make `adversarial-review` the *single canonical* definition of the
   protocol in ATLAS: target-agnostic (diff / feature / running app / whole codebase), encoding the
   invariants below, with an explicit "when to use this vs `/code-review`" boundary. *Sacrifice:* to
   stay DRY, `oneshotapp` Phase 4 should later point at it rather than restate it (small follow-up
   edit, deferred so this change's blast radius stays minimal).
4. **Out-of-box** — make it an *agent* not a skill (rejected: the ask is a skill, and a skill can
   itself fan out subagents); or a pure protocol skill reused by both `/code-review` and oneshotapp.
5. **Null branch** — don't build it; the concept lives in oneshotapp already. Rejected: that is
   exactly the gap — you cannot adversarially review an arbitrary existing codebase on demand today.
6. **Precedent (retrieved)** — ATLAS's own oneshotapp Phase 4 (presumed-broken mandate, lenses,
   reproduce-before-fix); the `free-will` "subagent refutation" pattern (clean opposing context); the
   `code-review` agent's 0–100 confidence triage. Reuse all three.
7. **First principles (derived)** — a review is *adversarial* iff the reviewer is incentivized to find
   failure (not confirm success) **and** runs without the builder's context (so it can't inherit the
   builder's blind spots). Invariants: (1) presumed-broken mandate, (2) context isolation, (3)
   empirical reproduction to separate real from imagined, (4) senior triage + report. Lenses and
   reviewer count scale to the target.

## Decision

Create `.claude/skills/adversarial-review/SKILL.md` as the canonical, on-demand, **empirical**
adversarial review. Differentiator vs `/code-review`, stated in the skill: `/code-review` reads a
static diff for bugs/cleanups and never runs the app; `adversarial-review` presumes the thing is
broken, fans out clean-context reviewers with diverse lenses, and **reproduces findings by running the
target** before believing them. Default invocation (description stays in context) so ATLAS can reach
for it autonomously after building something.

## Refutation (survived)

- *"Duplicates `/code-review`, users won't know which to run"* → explicit boundary section in the skill.
- *"Drifts from oneshotapp Phase 4"* → skill is canonical; Phase 4 dedup logged as follow-up.
- *"Target-agnostic = vague"* → concrete target modes (diff · feature · running app · whole codebase)
  with a stakes-scaling dial for reviewer count.

## Follow-up

- Wire `/atlas:oneshotapp` Phase 4 to reference this skill instead of restating the protocol (DRY).
