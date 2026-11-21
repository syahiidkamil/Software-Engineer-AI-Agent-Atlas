# Knowledge notes per project, a computed index, and a Sonnet "dream" to keep them short

**Date:** 2026-11-21
**Status:** Implemented in the working tree, not committed. Awaiting Boss review.
**Source:** Boss asked for a memory system that saves gotchas and knowledge per project, is not auto-loaded, is kept short by a Sonnet "dream", and holds up under his three ways of working: one session moving between projects, one session spawning a team per project, and separate sessions per project.

## Context

Project memory had a map (what the project is), `STATUS.md` (where it stands), decision logs (why) and lessons (long postmortems). Nothing held the small facts that cost twenty minutes to find and are not visible in the code. They were lost when the session ended. Claude Code's own auto-memory does not fill the gap: it is local to one machine and one working directory, and is not in git.

Boss's stated worry was overlap and duplicated knowledge across projects.

## Decisions

1. **One fact per file under `<P>/docs/knowledge/`.** A note is a title that states the fact, a `when:` line that names the task someone would be doing when it matters, and a few lines of body.
   *Rejected:* one growing `gotchas.md` per project. Two sessions or two subagents appending to one file collide, and a long file is read whole or not at all.

2. **No index file; the index is computed.** `knowledge.cjs list <project>` builds the list from the notes each time: one path, title and "read when" per note. An earlier sketch had a generated `INDEX.md`. I dropped it: a stored index is stale the moment a note is written without regenerating it, and it is the one file every writer would touch. A computed one cannot be stale and cannot conflict.
   *Tradeoff:* a person browsing the folder on GitHub sees file names, not an index. The slug is the title, so the folder still reads.

3. **Nothing is loaded automatically.** The map carries one pointer line, and `workspace.md` carries the rule (seven lines, always loaded). Notes are opened only when their "read when" matches the task.
   *Risk accepted:* "not auto-loaded" can become "never read". The rule and the map pointer are the trigger; path-scoped loading (a `paths:` scope like the design rules) is the next step if notes turn out to be missed.

4. **One home per fact.** A fact true for several projects lives once in the root `docs/knowledge/` (`add --shared`). `list <project>` prints the project's notes, then the shared ones, then the lessons in `docs/learning-from-mistakes/`, so a writer sees an existing lesson before writing a note that repeats it.

5. **Duplicates are stopped at write time where a script can see them.** `add` refuses a title that reads like an existing one and prints the note to update instead. The comparison is word overlap between titles, so it catches near-identical wording only. Two notes that say the same thing in different words pass it; finding those takes reading, which is the dream's job. `check` is therefore an input to the dream, not a gate on it.

6. **The dream is a Sonnet subagent, run per project, on demand.** `knowledge-dream` (`model: sonnet`, the alias, so it follows the family) merges duplicates, re-checks each note against the code, deletes what is no longer true, moves shared facts to the root, and shortens. `/atlas:dream [project|all]` launches one agent per project, which fits a team per project. It works in its own context and returns a report; the result is a git diff.
   *Rejected for now:* a `SessionEnd` or `PreCompact` hook that spawns a headless model over the transcript. A hook cannot ask the session's own model anything once the session is over, so it would pay for a second read of the whole transcript every session, write unattended, and need a guard against triggering itself. It also tends to save noise. It can be added later as an opt-in in `/atlas:settings`.

7. **Deletion is bounded.** The agent deletes a note only when its content now lives in the note it was merged into, or when git can bring it back (tracked and unmodified). Anything else is reported under "Would delete". A memory that cannot forget rots, and one that forgets uncommitted work loses it.

8. **Capture belongs to the session that learned the fact.** The rule says to write the note when it is learned; `/atlas:project wrap` asks again at the end. The dream consolidates and does not invent notes from history.

9. **Search scope, made explicit.** Multi and project mode gitignore the code repos, and ripgrep honours that: a search from the workspace root or from the project folder silently skips the code. `workspace.md` now says to search code with the repo folder as the path and project documents with `<P>` as the path, and that a subagent's brief names both. Measured with ripgrep on a scratch layout, not with Claude Code's Grep tool itself.

10. **Notes are the user's.** `docs/knowledge/**` is in the manifest's `user` class (project folders already were), so `swe-atlas update` never writes them.

## Also changed

`workspace.cjs` `today()` returned the UTC date, which is a day early before 07:00 in UTC+7. It now returns the local date; `STATUS.md` seeds and note dates use it.

## Known limits

- Existing project maps do not have the pointer line; they are the user's files and update does not write them. The always-loaded rule covers the gap.
- `check` flags a note as due for a re-check after 90 days and the folder as due at 30 notes. Both numbers are guesses to be tuned by use.
- No secret scanning of notes. The rule and the agent say to name the key and never write the value.

## Verification

- `npm test`: 67 passing (62 before; 5 new for `knowledge.cjs`, plus assertions for the map pointer and the local date).
- `npm pack --dry-run`: `knowledge.cjs`, the agent and the command are in the tarball.
- The dream was run three times on Sonnet against a scratch multi-mode workspace seeded with seven notes: a duplicated pair in different words, two notes the code contradicted, one about a hosted dashboard, one about the workspace itself, and one false note not yet in git. All three runs merged the pair, corrected the two contradicted notes, left the uncommitted note in place under "Would delete", reported the dashboard note as unverified, wrote only under `docs/knowledge/`, and left the code repo untouched (checked with `git status` after each run).
- The first run did not move the workspace-wide note to the shared folder. The instructions said "true for more than one project", and it read that as needing a second project's note. The step now asks whether a note is about this project or about something every project meets. The third run, on the new wording, moved it; so did the second, which the harness ran on the old wording, so the move is not reliable evidence for the rewording by itself.
- Each run also reported what it had to guess (renaming a note when its title is corrected, a note that is only partly checkable, where "today" comes from, what the count means). Those are now stated in the agent file.
- Read-only update plan against Boss's own workspace: the script, agent and command arrive as new files and `workspace.md` as safe to replace; `git status` there was identical before and after.
- Not run: `/atlas:dream` end to end as a slash command (the agent was launched directly), several dream agents in parallel, and any of this on Windows or Linux.
