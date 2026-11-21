# The update path, hardened after an independent review found it could remove a user's files

**Date:** 2026-11-21
**Status:** Implemented in the working tree, not committed. Awaiting Boss review; the version bump and the publish are his.
**Source:** Boss asked to be told when the repo is ready to republish. Before saying so I gave the update path (added on 2026-11-20) to a reviewer that had not written it, with the brief to presume it broken and reproduce every finding with the real CLI. The fixes went to a second reviewer, who found more, and those fixes to a third, who found more again, and those to a fourth, and the fourth round's diff alone to a fifth. Each round is a section of this log. Where they disagree, the later one is what the code does: decisions 9 and 10 were replaced in round two, and decision 16 was tightened in round three.

## What the first review found

All reproduced, none caught by the 67 tests that were passing at the time.

| # | Finding | Severity |
|---|---|---|
| 1 | A user's own file at a path an older ATLAS shipped (`.claude/agents/code-review.md`, anything in `.claude/commands/plandev/`) was listed under "Safe to remove" and deleted by `--apply`, even with `--keep`. | blocking |
| 2 | `update --apply` ran on any Claude Code repo that had a `CLAUDE.md` and a `.claude/` folder. | blocking |
| 3 | Writes followed a symlink out of the workspace. A folder of the user's own with a shipped skill's name was treated as an installed skill and written into. | blocking |
| 4 | The "lines to add" merge of `.claude/settings.json` removed the user's own hooks when the command merely contained `/task-complete.cjs`. `--keep` was ignored for `.claude/settings.json` and `.gitignore`. | blocking |
| 5 | A line the user added inside the managed block of `CLAUDE.md` was invisible to the comparison and dropped on replace. | blocking |
| 6 | `--apply` with no baseline recorded the new version, and the hint to pass `--base` disappeared while files still waited for a merge. | should fix |
| 7 | `--stage` without `--base` wrote only `new/` and said it had written the base and the merge. | should fix |
| 8 | Small: `update --help` errored; a bad second `--take` wrote the first one before failing; `knowledge.cjs` crashed on a folder named `*.md`, refused a title with no ASCII letters, and let a line break in `--when` break the front matter; `readLineValue` read the next line when a value was empty (in 3.0.0 as well). | low |

Looking at the same class of bug in the scaffolder turned up one more, present since 3.0.0: `new-project` inside an existing repo deleted the same "legacy" paths without asking whose they were, and unwired a hook that ran `.claude/hooks/task-complete.cjs`.

## Decisions

1. **A file is removed only when a recorded hash says ATLAS wrote it and it has not changed.** A path on the manifest's `removed` list used to be enough. Now each file under it needs a baseline (the record, or `--base`) that matches. Without one it is listed under a new group, "Dropped by the template, left for you", and never removed.
   *Cost:* a 2.x leftover in a workspace with no baseline is no longer cleaned up automatically. The user deletes it or keeps it. That is the right side to err on: a leftover file costs nothing, a deleted agent costs work.

2. **`--keep` wins over removal and over added lines, and is remembered.** The path goes into `kept` in `.atlas/installed.json`; from then on it is listed as the user's and is no longer offered removal or lines. Deleting the entry undoes it.

3. **An ATLAS workspace is recognised by a file only ATLAS writes.** `CLAUDE.md` plus one of `.atlas/installed.json`, `.atlas/config.json`, `.claude/scripts/lib/atlas.cjs`. Anything else gets an error that names `new-project`.

4. **Nothing is read or written through a symlink.** `place()` and `guard()` check every component of the path; the plan lists such a path as "(a symlink: left alone)". A workspace whose skills are symlinked from a shared folder gets no updates to them through ATLAS, which is correct: those files live somewhere ATLAS does not own.

5. **A skill is installed when the record says so.** With no record (a 3.0.0 workspace) a folder counts only when at least one file in it is identical to the one this template or the base ships.
   *Cost:* a 3.0.0 skill whose every file was edited, or whose every file changed upstream, is treated as the user's unless `--base` is given. `--take .claude/skills/<name>` installs it explicitly.

6. **The managed `CLAUDE.md` block is ATLAS's only when ATLAS wrote those exact bytes.** The record keeps the hashes of the block for each mode (`blocks`); a block with any other content is compared as the user's text. The block's text did not change between 3.0.0 and now, so a 3.0.0 workspace needs no special list.

7. **The record remembers which version pending files came from.** `pendingBase` is set while a merge or a look is open and cleared when the last one is settled. The report and `--stage` name that version, so the hint survives `--apply`.

8. **Every `--take` is checked before the first write.** One bad path leaves nothing half done.

9. *(Replaced by decision 11.)* The scaffolder removed legacy files only where an ATLAS scaffold had been before. "ATLAS was here once" says nothing about who wrote a given file, and the second review deleted a user's agent with it.

10. *(Replaced by decision 12.)* The update dropped `settings.json` hooks that ran a retired script.

## What the second review found

Verdict: do not publish. All reproduced against the first round's fixes.

| # | Finding | Severity |
|---|---|---|
| B1 | `update --apply` still removed a user's own hook from `settings.json` when its command contained a retired script's path (`…/task-complete.cjs.bak`, a wrapper that took the path as an argument). | blocking |
| B2 | `new-project` in a repo with any ATLAS trace, or run a second time, deleted the user's own files at legacy paths and unwired their hooks; `kept` was ignored and then erased by the rewritten record. | blocking |
| S1 | A `--keep` was forgotten by a later `--apply --base`. | should fix |
| S2 | A skill 3.0.0 installed whose every file changed upstream was taken for the user's own and never updated, with no way back. | should fix |
| S3 | `new-project` wrote through symlinks (`CLAUDE.md`, `.claude/`, `.atlas/`, settings) to files outside the folder. | should fix |
| S4 | `new-project` overwrote the user's same-named files without asking: commands, `.mcp.json`, `.playwright/cli.config.json`. | should fix |
| S5 | `update` walked into symlinked folders, and some guards ran after the first write. | should fix |
| S6 | `new-project` run again defaulted to a different mode than the workspace was in. | should fix |
| L1–L7 | `--stage` at or above the workspace overwrote workspace files; odd `settings.json` shapes were clobbered or crashed; the flavor was guessed from a heading; a folder of the user's with a shipped skill's name was offered as "available" and `--take` wrote into it; CRLF files were rewritten as LF and the user's `eol` rules contradicted; `--keep <typo>` silently did nothing and a hand-edited record crashed the reader; a folder where the template ships a file crashed mid-write. | low |

## Decisions, second round

11. **A legacy file is removed only when its content is the content ATLAS shipped.** Each entry in the manifest's `removed` list carries the sha256 of what the old release put there (line endings normalised). `new-project` removes a file at such a path only on a match, and never one the record lists under `kept`. A hook is unwired only when the script it ran was removed in that same run. *(Replaces 9.)*
    *Considered:* the install record as proof (a 2.x workspace has none), and asking per file (nine prompts on every upgrade, answered by habit). Content is the only evidence that exists in every workspace.
    *Cost:* a 2.x leftover the user edited is kept, and its hook stays wired. They delete it by hand. The manifest now has hashes to maintain when a release retires a file; a test compares them with byte-exact 2.6.4 fixtures.

12. **`update` never removes a hook.** The settings merge only adds what is missing. A hook pointing at a script that a later step removes is left for the user, who sees Claude Code report it. *(Replaces 10.)*
    *Cost:* a stale hook entry can outlive its script. That is a visible error with a one-line fix; the alternative deleted working hooks on a pattern match.

13. **`kept` survives every write of the record**, in `update` and in `new-project`. The scaffolder also leaves `.gitignore`, `.gitattributes` and `.claude/settings.json` alone when they are kept.

14. **A skill folder with a shipped name and no proof of origin is "unsure", and nothing is written into it.** It gets its own group in the report and is settled by evidence (`--base` shows a matching file), by `--take` (replace it), or by `--keep` (it is the user's, recorded in `kept`). The record carries `unsure` so the question survives `--apply`. A folder that appears later in a workspace with a record, where ATLAS never listed it, is the user's: not offered as "available", and `--take` on it is refused with "move it aside first".
    *Cost:* a 3.0.0 user who edited every file of a skill has one more thing to answer. The earlier rule answered it for them, wrongly in one direction or the other.

15. **`new-project` looks before it writes.** A preflight walks every path it is about to write: a symlink on the way, a file where a folder has to be, a folder where a file goes, or a `settings.json` / `.mcp.json` that is not valid JSON stops the run with nothing written and the reasons listed. `update` does the same in `apply()`: every decision is made and every path guarded, the record's path included, before the first write.

16. **`new-project` asks before replacing a file of the user's.** Files at template paths that differ from the template, and that nothing says ATLAS installed, are listed, with one y/N for the lot; No keeps them and writes everything else, and the kept files are not entered in the record as ATLAS's. `.mcp.json` is merged (the user's servers stay), and `.playwright/cli.config.json` is written only when absent. Both are now user class in the manifest.
    *Considered:* never overwrite (a 2.x upgrade would then keep every stale command), or always overwrite (finding S4). One question is the smallest thing that covers both.
    *Cost:* a 2.x upgrade sees this prompt, because every old command file differs and a 2.x workspace has no record. Answering yes there is right, and the prompt says what it covers.

17. **`new-project` over an ATLAS workspace defaults to the mode in `.atlas/config.json`.**

18. **Smaller rules.** `--stage` refuses a folder whose `new/`, `base/` or `merged/` would be the workspace or hold it. A `settings.json` key in a shape the merger does not expect is left exactly as it is. The flavor is not `atlas-*` unless `misc/self/atlas.md` exists. A CRLF file stays CRLF, and ATLAS adds no `.gitattributes` line for a pattern the user already sets `text`, `eol` or `binary` on. A `--keep` that matches nothing is an error. The record reader turns anything that is not a list of strings into an empty list, and an unreadable record is an error that names the file.

The record's fields are now `version`, `variant`, `partner`, `pendingBase` (optional), `blocks`, `skills`, `unsure` (optional), `kept`, `files`. A record written by an earlier cut reads as empty lists for the fields it lacks.

## What the third review found

Verdict: do not publish. `update` held under everything it ran (all of B1 to L7 verified, a second `--apply` writes nothing); the new findings are in `new-project`, plus one in `--take`.

| # | Finding | Severity |
|---|---|---|
| F1 | `new-project` over a 3.0.0 workspace overwrote the user's own files at paths the new version ships, with no listing: decision 16 treated every template path as agreed in an ATLAS workspace that has no record. With a record, a file settled by `update --keep` was overwritten too, because the record lists it. | blocking |
| F4 | `new-project` deleted a user's `.claude/rules/DESIGN.md` whenever it contained the text `{{PROJECT_NAME}}`, filled in or not. | blocking |
| F2 | On a disk that ignores case, `update --take .claude/skills/shadcn` overwrote the user's own `Shadcn/` folder, and the plan offered that command. | blocking |
| F3 | `new-project` added the shipped skill's files into a user's own folder of the same name and recorded the skill as installed, also when the folder was under `kept`. | should fix |
| F5 | `new-project` run again with Enter renamed the project to the folder's name (orphaning its stored secrets) and dropped other keys from `.atlas/config.json`. | should fix |
| F6 | `--stage <dir>` wrote through a symlink at `<dir>/new` into the workspace. | should fix |
| F7 | `new-project` in a subfolder of a git repo creates a nested repo, and its default commit (`git add -A`) takes unrelated uncommitted work. Both are in 3.0.0. | should fix |
| F8, F9 | `settings.json` holding `null` left a half-written scaffold; a file where a template folder belongs crashed `update` with a raw `ENOTDIR`. | low |
| — | `settings.json` re-indented to two spaces and LF; a user's `* text=auto eol=crlf` overruled for `*.md`; a `kept` entry with a trailing slash ignored; `blocks` written with a duplicate. | low |

## Decisions, third round

19. **In `new-project`, only a recorded hash that still matches proves a file is ATLAS's and untouched.** That file is replaced silently. Every other file that differs from the template is listed and asked about, in any folder, ATLAS workspace or not: "ATLAS was here" and "the record lists this path" both say nothing about who wrote the bytes. The earlier yes to "Overwrite existing ATLAS files?" covers `CLAUDE.md`, which that prompt names. *(Tightens 16.)*
    *Considered:* refusing `new-project` in a workspace with no record and pointing at `update`. Rejected for now because re-running the scaffolder was the upgrade path before `update` existed, and refusing it is a breaking change that is Boss's to make.
    *Cost:* in a 3.0.0 or 2.x workspace the list is every file the new version changed (29 in the reviewer's case), and the choice is all or none. The prompt says so and names `update` as the tool that sorts them one by one. With No, the record gets `pendingBase` so `update` knows which package to ask for.

20. **A skill is written whole or not at all.** A skill folder that is under `kept`, or holds a file the user just said to keep, or has the skill's name and none of its files (asked about as a folder), gets nothing written into it and is not recorded as installed.

21. **The record `new-project` writes carries over what only the record knows**: the baseline hash of every file it did not write this run, skills installed earlier that were not ticked again, `unsure`, `kept`, and the block hashes of older versions.

22. **The 2.x `DESIGN.md` is removed on a hash match only**, like every other legacy file. Its hash is on the `moves` entry in the manifest; it was the same from 2.1.0 to 2.6.4.

23. **Skill folders are looked up by the shipped name, not matched against a directory listing**, so a disk that ignores case answers the way a write would behave. A link to a folder is still not a folder.

24. **`.atlas/config.json` is merged, and the project prompt defaults to the name the workspace has.** JSON that ATLAS merges into (`settings.json`, `.mcp.json`, the config) is written back with the indentation and line endings it had. Settings that parse to something other than an object are refused before the first write, by `new-project` and by `update`.

25. **The commit prompt defaults to No when the repo had uncommitted changes before the scaffold**, and says why.

26. **Smaller rules.** `--stage` refuses a stage folder with a symlink on the way to a file it would write. A file where a template folder belongs is reported and skipped. A `* … eol=` rule of the user's keeps ATLAS's `*.md` line out of `.gitattributes`; ATLAS's lines for its own folders are still added.

## What the fourth review found

Verdict: do not publish. Scope was narrower: `new-project` over existing folders, the newest `update` paths, and sequences of the two. The round-three rules held (a 3.0.0 workspace with edits through `new-project`, `update`, `--base` and `--apply` came out byte-identical; `--keep`'d paths survived a `y`; symlinks, case variants and traversal were all refused). The new findings are in what `new-project` reads and merges, plus two in `update`.

| # | Finding | Severity |
|---|---|---|
| F1 | A damaged `.atlas/config.json` was read as empty and rewritten from the answers, without a word: the mode, the project name and any key of the user's in it were gone. `update` refused the same file. | blocking |
| F4 | The question about replacing the user's files printed 12 paths and "…and N more"; `y` replaced all of them, the unnamed ones included. | blocking |
| F2 | A hook group whose `hooks` is an object, not a list, crashed the settings merge with a raw `TypeError` after the template files were written, leaving the install record describing the previous run. `update` then died on the same file. | major |
| F3 | A 2.x hook line the user had extended (`node …/task-complete.cjs; my-own-logger`) was deleted whole, and the output mentioned only the removed script. | major |
| F6 | On a disk that ignores case, `--stage <dir>` from a workspace under `<dir>/New/` wrote `new/CLAUDE.md` over the user's file above the workspace. | major |
| F5 | Choosing Playwright MCP turned the user's `"enableAllProjectMcpServers": false` into `true`. | minor |
| F9 | In a folder that had files and no git, Enter at the commit prompt committed all of them: `.env.staging`, `credentials.json`, `node_modules`. | minor |
| F7 | `update` listed an installed skill's folder under "Never touched (yours)" because of one extra file in it, and `--apply` then wrote into that folder. | minor |
| — | The summary counted skills ticked, not skills written; `--stage ""` was ignored; `--keep <folder>` counted files that were already up to date. | minor |

Found while checking the cases that review said it had not reached: `--keep <folder>` marked a file new in this version as kept, so the next plan showed it as "deleted by you" and `--apply` never added it; with `.atlas` a file, the refusal named an unreadable record instead of the file.

## Decisions, fourth round

27. **Every JSON file `new-project` rewrites is checked before the first write**, `.atlas/config.json` now among them. Unparseable or not an object: the run stops with nothing written and the file is left to repair. The paths are checked before the install record is read, so a file or a link at `.atlas` is refused for what it is.

28. **The question about the user's files names every path it covers.** `y` is consent to exactly that list, so no part of it may be summarised. *Cost:* on a 3.0.0 workspace the list is 30 lines or more.

29. **A hook is ATLAS's to remove only when its command does nothing but run the retired script.** A command with `;`, `&`, `|`, a newline, a backtick or `$(` in it is the user's line: it is kept whole and printed with the file it is in, and the user takes the script out. *Considered:* cutting the script out of the command. Rejected: that is editing shell the user wrote, with a pattern. *Cost:* the kept line now starts with a script that no longer exists; what follows a `;` still runs, what follows `&&` does not, and the output says so.

30. **The settings merge reads a hook group only when its `hooks` is a list.** Any other shape has no commands to compare and stays as it is, in `new-project` and in `update`.

31. **`enableAllProjectMcpServers` is the user's once it is set.** A server ATLAS adds is enabled by name in `enabledMcpjsonServers`, which is enough for it to load.

32. **The commit prompt also defaults to No in a folder that held files and had no git**, and says why. A new or empty folder keeps Yes.

33. **`--stage` resolves `<dir>/new`, `base` and `merged` through the disk before comparing them with the workspace**, so another spelling of the same folder is the same folder.

34. **`--keep` settles only a file that is in the workspace and waiting on a decision.** One already up to date is not counted, one new in this version stays offered, and a `--keep` that settles nothing is an error.

35. **A run that stops after its first write says so**, and that the same command can be run again: every step reads what is on disk and writes what is missing. (This first said the install record is written last. It is not: project files, `.mcp.json`, the Playwright config and `git init` come after it. The fifth review caught the message repeating that; see decision 39.) Not made atomic: see below.

36. **Smaller rules.** `update` lists a file of the user's inside an installed skill by its path, not as the folder. The scaffold summary counts skills written. `--stage ""` is an error.

## What the fifth review found

The fifth reviewer got only the round-four diff (98 changed lines) and the tarball. Verdict: do not publish yet, on one finding.

| # | Finding | Severity |
|---|---|---|
| F1 | An upgrade from 2.x that stops partway (a read-only file) has already deleted the 2.x hook scripts. The rerun, which the new message calls safe, found nothing to delete, so it took no hooks out of the settings: `Stop` and `PreToolUse` kept running two scripts that no longer exist, an error on every stop and every question, with no warning. `update` never touches `settings.local.json`, so it stayed | major |
| F2 | `node .claude/hooks/task-complete.cjs; say done`, the very form the code comment names, was not recognised as running the script (nothing but a space or a quote was accepted after the name), so it was kept without the warning | minor |
| F3 | The "stopped partway" message said the install record was not written. For a stop in the later steps it had been | minor |
| F4 | Listing a user's files inside an installed skill by path (round four) had no limit: 400 files under `node_modules` there made a 421-line report | minor |
| nits | The `--keep` error said such a path is not in the report when "Never touched" lists it. An empty `.atlas/config.json`, or one with a byte-order mark, was refused with no hint. A line told the user `update` shows kept paths under "Needs a look", which is not where a kept skill folder appears | nit |
| outside the diff | 2.1 to 2.6.2 shipped the two hook scripts as `.js`, and the manifest knew only the `.cjs` names of 2.6.3 and 2.6.4. Checked against every 2.x tag: same content, same hashes, other names. A workspace from those nine releases kept both scripts and both hooks, so every notification came twice | major, in 3.0.0 as published too |

## Decisions, fifth round

37. **A 2.x hook goes when the script it runs is one an older ATLAS shipped and that file is not in the workspace**, whichever run deleted it. Before, only the scripts deleted in the same run counted, which is what made the rerun incomplete. The proof asked for is the same in kind: the path is one from the manifest, the file is not there, and the command does nothing but run it. A script of that name the user rewrote is still there, so its hook stays. *Cost:* a hook of the user's own that points at one of those four paths with no file behind it is removed too. That hook could only fail. The run now says how many hooks it took out of which file.
38. **The `.js` names of 2.1 to 2.6.2 are in the manifest's `removed` list**, with the same hashes, and the hook pattern accepts `.js` as well as `.cjs`. *Not covered:* 2.1.0 wrote the hook with an absolute path, and a command with an absolute path is never treated as this workspace's.
39. **The pattern accepts a shell character straight after the script name** (`;`, `&`, `|`, `<`, `>`, `)`), so a compound line is seen as running the script and gets the warning; the script with only a redirect after it is dropped like the bare one. The warning now says the hook runs the script "inside a longer command", which is true of every case it fires for.
40. **The partway message says what is true at any point**: some files are written and others are not. The order of steps is unchanged. Moving the record to the very end was the alternative; a record that is one step early costs nothing on the rerun, and reordering the last steps a day before release is the larger risk.
41. **The report folds a folder of more than eight of the user's files inside an installed skill into one line with a count.** The plan and `--json` still carry every path. The question `new-project` asks before replacing files stays uncapped: there the list is what the answer applies to.
42. **Wording.** The `--keep` error points at "Never touched". An empty JSON file and one with a byte-order mark are still refused, with the reason and the way out. The kept-paths line says `update` lists them, not where.
43. **`/atlas:update` is a recommendation, and says so.** Boss, after the fifth round: "the update should only give suggestion, and carefull, beware of compaction (suggest to compact or clear first before doing it)". The command had an `apply` argument that went from the report to writing in one go. It is gone: every run starts with the comparison, which writes nothing, and stops at a question; only the parts the user then names are applied, one at a time. A new first step tells the user to `/clear` or `/compact` before starting, and says that after a compaction between approval and apply the comparison is run again instead of applying from the summary. The CLI is unchanged: `swe-atlas update` writes nothing, and `--apply`, `--take` and `--keep` are flags the user types. *Open for Boss:* whether the CLI should lose `--apply` as well. That would remove the only way to update without Claude Code, so it is his call.
44. **This is the last review round** (Boss: "make sure it will be the last review and fixes, otherwise it will become infinite review and fix loops"). The rule for next time is in the "No sixth review" note below: the number of rounds is set before the first one.

## Left as it is, and why

- **`new-project` in a subfolder of an existing git repo still runs `git init` there** (F7, first half; 3.0.0 does the same). Not creating the nested repo is right for `packages/app` and wrong for a workspace made inside a home directory that is itself a dotfiles repo, where `git add -A` would then reach everything. The honest fix is a question, and adding a prompt changes every scripted install. Boss's call.
- **`new-project` replaces the `playwright` entry in `.mcp.json`** when Playwright MCP is chosen at the prompt, because choosing it is the request to set it. The output now says when an existing entry was replaced. Other servers stay.
- **With no baseline, `update --apply` re-adds a file the user deleted** and a `.gitignore` line they removed: without a record nothing distinguishes "deleted" from "never had". `--base` settles it.
- **A `docs/** eol=crlf` rule of the user's is still overruled for `.md` files under it** by ATLAS's later `*.md` line. Only a rule on `*` or `*.md` is recognised.
- **A file `new-project` cannot write (read-only, a full disk) still stops the run partway.** Checking writability up front is unreliable across systems (Windows ACLs, network drives), and a false refusal is worse than a run that can be repeated. The run now says it stopped partway and that repeating it is safe (decision 35); a test repeats it.
- **The ATLAS `.gitignore` lines cover `.env`, `.env.local`, `.env.*.local` and `.env.production`, not `.env.staging` or other `.env.<name>` files.** A blanket `.env.*` would also ignore the `.env.development` and `.env.test` files some frameworks commit on purpose, in the user's own repo. Decision 32 removes the case where this bit (an unasked first commit); widening the list is Boss's call.
- **`bin/install.js` is now about 1350 lines**, past the point where this repo's own conventions say to split. The scaffold steps belong in `bin/lib/`. Not done here: moving 600 lines the day before a release trades a known cost for an unknown one.
- **Two backstops in the scaffolder have no test of their own**: the symlink check inside `writeFileSync`, and the "not a JSON object" check inside `writeSettings`. The preflight refuses first, so both are unreachable while the preflight is right; they are there for the day it is wrong.
- **`echo .claude/hooks/task-complete.cjs` as a hook is removed** although it only prints the path, and a line such as `node <script> > /dev/null 2>&1` is kept with the warning although nothing of the user's runs in it. Telling these apart means parsing shell. Both outcomes are safe, and no ATLAS release wrote either form.
- **The summary line "Skills: N installed" counts the skills written in this run.** After `update --keep` on a skill, the record still counts that skill as installed. Left: the line above it says "written".
- **No sixth review.** Five rounds each found something, each less than the round before (this one: one major in an interrupted upgrade, and one outside its brief). The fixes of this round were checked against the reviewer's own reproduction script instead. A sixth reviewer would very likely find a sixth list; what remains is recorded here. Looking back, "review until a reviewer finds nothing" was the wrong stopping rule for an installer with this many input states: it does not end. Two rounds decided up front, then known gaps written down, would have reached the same release hours earlier.
- **The 2.x notification sound** (`.claude/hooks/*.wav`) has its hash in the manifest and no fixture in the repo (127 KB).
- **Not reproduced, not fixed:** Windows reserved names as note slugs (`con`, `nul`), `knowledge.cjs add` on an interactive console with no stdin, CRLF files in `git merge-file`, a BOM in `settings.json`, NTFS junctions and case-insensitive paths in the symlink checks.

## Verification, first round

- `npm test`: 79 passing (67 before). New tests cover each finding above; three earlier tests that asserted the old removal behaviour were changed to assert the new one.
- Each fix was broken on purpose, one at a time (14 mutations: the `..` guard, the symlink skip, the baseline requirement, `--keep` precedence, `pendingBase`, `--take` ordering, the two skill rules, the trusted block, the workspace markers, the hook pattern, `readLineValue`, the local date, the scaffolder's legacy check in both directions). Every one fails at least one test. The first run of this check used a wrong test command that failed with nothing mutated, so its results were discarded and it was run again with `node test/run.cjs`.
- From the packed tarball, with the package version set to 3.1.0 in the unpacked copy: a workspace made by the 3.0.0 installer was given the user's own files at two "legacy" paths, an own skill, an own hook in `settings.json`, a line inside the managed block, an edited command, a note and a knowledge note, then committed. `--apply` without a base wrote 7 files, left 28 for a decision and recorded `pendingBase: 3.0.0`. `--apply --base` wrote 24 more. Twelve user files compared against that commit with `git diff`: all unchanged. `settings.json` gained three deny lines and kept the user's hook. `--keep` on the two legacy files and on `CLAUDE.md` settled the rest and cleared `pendingBase`.
- Also from the tarball: a plain Claude Code repo was refused with nothing written; `--take` through a symlinked skill folder was refused and the target folder was unchanged; `--stage` wrote `new/` only without a base and all three folders with one; fresh scaffolds in repo, project and multi mode each reported 73 files up to date.
- Read-only plan against Boss's workspace with 3.0.0 as the base: 27 safe to replace, 6 new, 1 file gaining lines, nothing to remove, nothing needing a look; his own `sprout` skill is listed as his. `git status` and `HEAD` there were identical before and after.
- A second independent review of the fixed code: the table above.

## Verification, second and third rounds

- `npm test`: 104 passing.
- Mutations, each a fix broken on purpose and the whole suite run (`node test/run.cjs`): 64 for the second round and 34 for the third. Of the 64, 55 still apply to the code as it is and all 55 fail a test; the other 9 target lines the third round rewrote, and each has a third-round mutation of the same rule in its place. Of the 34, 32 failed a test on the first run and 2 did not: nothing asserted the message that a kept skill folder got no files, and nothing ran `new-project` a second time with fewer skills ticked. Both now have a test and both mutations fail it. After each run the four source files were compared byte for byte with copies taken before it.
- From the packed tarball with the version set to 3.1.0 (180 files; no tests, fixtures, decision logs or `gitignored/` in it): the 30 end-to-end checks of the second round pass, among them the 3.0.0 workspace with the user's own files followed through `--apply`, `--apply --base` and `--keep`, and a fresh scaffold in each mode reporting 73 files up to date.
- The third review's 13 reproductions, run against that tarball: all pass. The F1 sequence in full: a 3.0.0 workspace with four files of the user's at paths 3.1.0 ships; `new-project` listed them with the other differing files, No kept all of them, and the record got `pendingBase: 3.0.0`. `update --base` then sorted 25 files as safe to replace and left the user's three files and their `shadcn` folder alone; `--apply` wrote the 25; the four files still held the user's text.
- Read-only plan against Boss's workspace with 3.0.0 as the base, run from the tarball: 27 safe to replace, 6 new, 1 file gaining lines, his `sprout` skill listed as his. `HEAD` and `git status` there were identical before and after.
- Not run: anything on Windows or Linux. CI runs `npm test` on all three systems, but only on a push, and none of this is pushed, so the update tests have run on macOS alone. The first push should be allowed to go green before `npm version`. Also not run: `/atlas:update` end to end as a slash command in a Claude Code session, and an install from the real registry.

## Verification, fourth round

- The fourth review's findings were reproduced against the working tree before anything was changed: 18 of the 20 checks written from its commands failed. After the fixes all 20 pass, against the working tree and against the tarball.
- `npm test`: 114 passing (104 before). Ten new tests, one per finding or group of findings, plus assertions added to two existing ones.
- Mutations: 19 for this round (each fix broken on purpose, whole suite run); all 19 fail a test. One was first written against a line that a second guard made redundant, so breaking it changed nothing; it was replaced by a mutation of the guard that decides. The 98 mutations of the earlier rounds were run again against the changed source: 88 still apply and all 88 fail a test; the other 10 target rewritten lines and each has a later mutation of the same rule.
- A mistake in that re-run, and how it was caught: partway through it I edited the README and named a retired script in it, which fails the drift test that checks retired names are referenced nowhere. From then on every mutation run had that one failure whatever was mutated. The run reports the first two failing tests per mutation, and every affected run lists a second test, so no catch rests on the README failure alone. The README line was reworded and the suite is green.
- From the tarball packed after the last change (version set to 3.1.0, 180 files, none of them tests, fixtures, decision logs or `gitignored/`; `bin/` compared byte for byte with the working tree): the 30 end-to-end checks pass from a clean folder, the third review's 13 reproductions pass, the fourth review's 20 pass.
- Read-only plan against Boss's workspace with 3.0.0 as the base, from that tarball: 27 safe to replace, 6 new, 1 file gaining lines, `sprout` listed as his, the same as before round four. `HEAD` and `git status` there were identical before and after.
- A fifth reviewer then got the round-four diff alone. Its findings and what was done are in the sections above and below.
- Not run: the same as above. Nothing on Windows or Linux until the first push; `/atlas:update` as a slash command; an install from the real registry. The round-four tests that depend on the disk (the `--stage` case test, the read-only file test) skip themselves where they do not apply.

## Verification, fifth round

- Both of the reviewer's reproductions (`review5/repro.sh`: a real 2.6.4 workspace, an upgrade stopped by a read-only `CLAUDE.md`, the rerun; and the two compound hooks) were run again against the new tarball. After the rerun the settings hold only the `notify.cjs` hooks; both compound lines are kept and named.
- `npm test`: 115 passing. One new test (the 2.6.4 upgrade that stops and is rerun, the `.js` names, a script the user rewrote), and assertions added to four others (compound forms with nothing after the name, a stop after the record, the folded folder, the two hints and the `--keep` wording).
- Mutations: 12 for this round, all 12 fail a test. The earlier sets were run again against the changed source: round four's 18 all fail a test; of round three's 34, 33 fail a test and one targets a line this round rewrote (the rule it guarded is decision 37, which has three mutations of its own). The 64 of rounds one and two were not run again: Boss asked for this to be the last round, and nothing they mutate was touched.
- From the tarball packed after the last change (3.1.0, 180 files, `bin/`, the manifest and the README compared byte for byte with the working tree): 30 end-to-end checks, the third review's 13 and the fourth review's 20 all pass.
- After decision 43 the tarball was packed once more and all of the above run again on it, with the same results. Read-only plan against Boss's workspace: the output is identical, line for line, to the one before this round. `HEAD` and `git status` there unchanged.
- Not run: as before. Also not exercised: a real workspace from 2.1 to 2.6.2 (the `.js` test uses the 2.6.4 file content under the older name, which the tags show is the same bytes; the installers of those releases were not run), and the absolute-path hook of 2.1.0.
