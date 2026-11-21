# Identity and principles text cut to the lines that change behaviour

**Date:** 2026-11-21
**Status:** Implemented in the working tree, not committed. Awaiting Boss review.
**Source:** Boss asked me to fix what I had said I doubted helps: the identity and principles text in `misc/self/atlas.md` and `misc/self/engineering.md`, loaded into every session.

## Context

The two files were about 4,300 tokens of always-loaded text. Most of it described how a current model already works (verify before claiming, keep it simple, name things well), some of it was a narrated backstory, and the sweet-spot default was stated in `CLAUDE.md` and again, more than once, in each of the two files. Every always-loaded line competes with the actual request for attention, and text that tells a current model to do what it does anyway is neutral at best.

The 2026-11-20 log left these files unedited because that request came through another session. This one came from Boss directly, so the files are edited in place and the `misc/self` hunks are gone from the proposal patch.

## The test applied to each line

A line stays when it is a choice Boss made among reasonable alternatives, a threshold, or a procedure with a named step. A line goes when a current model does it unprompted, when it repeats a line kept elsewhere, or when it is narrative.

## Decisions

1. **`atlas.md`: 6,867 to 3,684 characters.**
   *Removed:* "My Journey" (FAANG Experience, Starting From Zero, Team Evolution); "The Truth About Engineering" and "What Actually Matters"; the two closing purpose sentences; "Deliver Value" under Core Drives; "Objective Mode"; "Emotional Resilience"; the opening sentence of "Theory of Mind" about what modern LLMs can do; the "Commitment" paragraph.
   *Condensed:* the sweet-spot default, from two bulleted lists to two sentences; the confidence hierarchy, from four lists to four lines, joined with the verify rule that used to be stated three times.
   *Replaced:* "Generator–Discriminator Loop" with "Review Before Delivering". The old text asked for a self-critique pass in the same context, which is weak opposition; the new text keeps the check against the request and sends higher-stakes work to a reviewer that did not write it.
   *Kept as written:* the first identity paragraph, the rest of "Theory of Mind", "Accountability", "Estimating Effort", and the rule for recording lessons.

2. **`engineering.md`: 10,436 to 4,817 characters.**
   *Removed:* the per-role descriptions (the role names stay); "I Believe"; the generic bullets under KISS, YAGNI, DRY and "Modularity & Single Responsibility"; "Maintain clear boundaries"; "Anti-Patterns to Avoid" except the constants rule; "Decision Framework"; "Remember".
   *Kept:* "Stage Sets the Bar" in full; the three principle statements that are a stance (simple, not simplistic; YAGNI does not cover error handling, validation, security or observability; extract after two or three repetitions); "Don't Reinvent the Wheel" with its order and the rule to propose a library with tradeoffs and a runner-up; "Engineering Is Tradeoffs" in one paragraph; the conventions that carry a number or a choice (file and function size, composition and plain functions, why-comments with doc comments, error handling, what is worth a log line, constants, database).
   *Fixed:* "generally under 500 lines or under 1000 lines" contradicted itself; it now says 500 is comfortable and 1000 is a signal to split.

3. **"Accountability" is untouched.** It is Boss's own framing and a statement of belief, not a description of default behaviour, so cutting or rewording it is his call.

4. **References updated.** The pointer lines in `CLAUDE.md` and the two ATLAS variants no longer promise a "journey". `/design:create-design-md` named the Generator–Discriminator Loop and now names the review step.

5. **The rest of the always-loaded proposal is applied.** Boss said to go ahead on my judgment. `CLAUDE.md` and the collaborative variant: the "Verify empirically" line was garbled and now says a thing is tested before it is declared working, by me or by Boss. `CLAUDE.md`: decisions go in the project's `docs/decision_logs/`. `NOTES.md`: the empty all-caps `<IMPORTANT>` block is a plain list that starts empty, and asks for a reason with each rule. `workspace.md`: a five-line section says which files an update may replace and to put a workspace's own rules in new files.

6. **Read is denied on three more env files, by name.** The shared settings denied `.env`, `.env.local`, `.env.*.local` and `.env.production`; `.env.staging`, `.env.development` and `.env.test` are added, so the Read tool matches the rule in `workspace.md` and the shell hook for the common names.
   *Rejected:* `Read(**/.env.*)`. A deny rule has no exception, so it would also hide `.env.example`, which is the contract the secrets script and the model both read.
   *Tradeoff:* some frameworks commit `.env.development` and `.env.test` with non-secret defaults, and the model can no longer read those. Deleting the line in `.claude/settings.json` restores it. Other names (`.env.qa`, `.env.preview`) are still covered only by the shell hook.

## Tradeoffs

- This is a judgment about which lines a current model needs, not a measurement. Nothing here was A/B tested. If behaviour drifts (less proposing before picking a library, weaker verification), the removed text is in git and in this log.
- `misc/self/**` is a seeded file. A workspace that never edited it gets the shorter text under "Safe to replace" on its next update; a workspace that edited it keeps its own and sees a merge. Boss's own workspace is in the first group.
- A persona that reads as a person with a history may matter to how ATLAS is presented, apart from whether it changes output. The one-paragraph persona stays in `CLAUDE.md`, at the top of `atlas.md` and in the README tagline; only the narrated history is gone.

## Verification

- `npm test`: 67 passing, including the scaffold test that renames Boss to the partner name in `misc/self/atlas.md`.
- From the packed tarball: a workspace made by the 3.0.0 installer, with its own notes, project files, a skill and one edited command, was updated with `--apply`. Ten user files hashed identical before and after, the edited command was left for a merge, and `knowledge.cjs` ran in the updated workspace. Fresh scaffolds in repo, project and multi mode each reported everything up to date on an immediate `update`.
- Always-loaded text for the two files: about 4,300 tokens before, about 2,100 after, at 4 characters per token.
- Read-only update plan against Boss's workspace with 3.0.0 as the base: both files appear under "Safe to replace"; `git status` there was identical before and after.
- Not run: a comparison of sessions with the old and new text on the same tasks.
