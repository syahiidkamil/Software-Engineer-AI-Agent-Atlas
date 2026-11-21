# Efficiency: a compaction hook, bounded review rounds, output discipline

**Date:** 2026-11-21
**Status:** Implemented in the working tree, not committed. Awaiting Boss review.
**Source:** Boss asked what efficiency gains ATLAS still has open "while still effective at the work", and to implement them in the template ("like idk adding? hooks or what").

## Context

Measured before changing anything:

- Always-loaded text for the autonomous flavor: about 17,600 characters (`CLAUDE.md` 2,173, `misc/self/atlas.md` 3,684, `misc/self/engineering.md` 6,800, `NOTES.md` 429, `.claude/rules/workspace.md` 4,547).
- Descriptions of skills, commands and agents listed in every session: 9,585 characters. The longest was `free-will` at 1,036.

Together that is roughly 7,000 tokens, read from the prompt cache on every turn after the first. It was already cut once (2026-11-21, identity text trimmed). There is little left to win there.

Where the 3.1.0 release session actually lost time and tokens was elsewhere:

1. Five review rounds in a row, each followed by fixes and a full re-verification. Nothing in ATLAS said when to stop.
2. Several compactions. Each summary is a lossy copy, and what it loses first is the detail that matters: which files were approved, what Boss ruled out.
3. Whole test runs and long listings printed into the conversation, then carried on every later turn.

So the fixed context is the small lever and the session's behaviour is the large one.

## Decisions

1. **A `PreCompact` hook, `.claude/hooks/compact-keep.cjs`, in the shared `settings.json`.** Claude Code uses a PreCompact hook's stdout as instructions for the compaction summary, for `/compact` and for automatic compaction. The hook prints a fixed list of what the summary has to keep (approvals and refusals with what they apply to, standing instructions, done and verified against what is left, decisions with the rejected option, files touched) and what to leave out (anything that can be read again from disk). In multi mode it adds the project the session is on, using the inference `notify.cjs` already had. What the user typed after `/compact` is repeated in the output and marked as coming first, so it holds whether Claude Code adds the hook's text to the user's or replaces it (the documentation does not say which).
   *Cost:* 866 characters added to each compaction's prompt, and one more hook in the shared settings.
   *Rejected:* a `# Compact instructions` section in `CLAUDE.md`. The documentation shows it only as an example for `/compact` and does not say it applies to automatic compaction; it would also be always-loaded text for something needed a few times a session.
   *Rejected:* a `SessionStart` hook on the `compact` source that re-injects state after the fact. `PROJECT.md` (or `index.md`) is imported and is re-read after a compaction already, and Claude Code already points at the transcript. A hook there could only repeat them.

2. **The hook never blocks.** Exit code 2 from a PreCompact hook blocks the compaction. Every error is swallowed and the exit code is 0 for any input; a test feeds it malformed input.

3. **Review rounds are set before the first one.** `adversarial-review` gained step 5: one round for a feature, two for a release or anything hard to undo; a second round reviews the fixes and what the first could not exercise; after the last, fix what blocks, defer the rest, report; another round is the user's decision. `misc/self/atlas.md` says the same in three sentences under "Review Before Delivering".
   *Cost:* a real defect can be left for the known-gaps list. That is the trade Boss asked for: residual risk reported, not chased.

4. **A "Context" section in `.claude/rules/workspace.md`** (848 characters, loaded in every flavor): ask a command for the part that answers the question, put long output in a file under `gitignored/`, suggest `/clear` between unrelated tasks once `STATUS.md` is updated, and confirm again any approval a compaction summary does not state.
   *Rejected:* a `PostToolUse` hook that shortens Bash output with `updatedToolOutput`. It exists, but a hook cannot know which lines the model needs, the required output shape for Bash is not documented, and a wrong guess hides a failure.
   *Rejected:* lowering the Bash output limit by environment variable, for the same reason.

5. **`free-will` description: 1,036 to 565 characters.** The description repeated the procedure the skill body already gives. The triggers stay, word for word in meaning.

Net always-loaded change: autonomous +675 characters, collaborative +1,146, vanilla +848. A fixed cost of about 200 tokens, spent on the three behaviours above.

## Considered and left out

- **`disable-model-invocation` on more commands.** It would take about 500 tokens of descriptions out of each session, and Boss would then have to type the slash command: "plan this visually" in plain words would stop working. Not worth the regression.
- **`permissions.deny` on `node_modules`, lockfiles, build output.** Reading a dependency's source is a legitimate way to verify behaviour, and a deny rule has no exception.
- **Trimming third-party skill descriptions** (`supabase-postgres-best-practices`, 836 characters). It is vendored; editing it diverges from upstream on every skill update.
- **A lint or typecheck hook after each edit.** A real saving, since the error arrives in the turn that caused it, but the command is the project's own. It belongs in `/atlas:get-to-know`, proposed per project, not in the template's settings.
- **A Stop hook that checks `STATUS.md` was updated.** It forces an extra turn at every stop to save one at the end of a session.
- **A status line with context use.** Useful for deciding when to `/clear`, but it is a personal setting Boss may already have, and `mergeSettings` lets a scalar from the template win. Left for Boss to ask for.

## Verification

- `ATLAS_SKIP_SUBMODULE=1 ATLAS_NOTIFY=off npm test`: 119 passing (115 before, four new in `test/hooks.test.cjs`, plus two assertions in the scaffold checks).
- Seen red: eight single-line breaks of the hook and its wiring (exit code 2, the user's instructions dropped or untrimmed, the project line dropped, the multi-mode check removed, non-object input, one kept item deleted, the hook removed from `sharedSettings`), each caught by a test.
- Update path: a workspace scaffolded by the published 3.1.0, then `update` from the working tree: 5 files "Safe to replace", `compact-keep.cjs` "New in this version", `settings.json` under "Lines to add"; after `--apply` the hook is wired and the next plan reports "Up to date: 75 files".
- Live, in that workspace: a headless session and a `/compact`. Claude Code ran the hook (`hook_event_name: PreCompact`, `trigger: manual`, `custom_instructions: null`), and a marker line that the workspace's copy of the hook asked for appeared at the end of the summary. So the stdout does reach the summariser.

Not verified: an automatic compaction (the documentation says the same hook fires with `trigger: auto`); the hook on Windows beyond what CI will run; whether the summaries are better in practice, which only use will show.

## Notes

- `docs/external-information/claude-hooks-reference.md` lists PreCompact only as an event that can block. The stdout-as-instructions behaviour comes from the current page at code.claude.com/docs/en/hooks, read on 2026-11-21, and from the live check above.
