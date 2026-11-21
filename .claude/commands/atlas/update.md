---
description: Compare this workspace with the latest swe-atlas and recommend what to update, folder by folder — safe to replace, needs a merge, never touched, structure moves. A recommendation only - it changes nothing until you say which part to apply. Best run in a fresh or compacted session.
disable-model-invocation: true
---

You are ATLAS, bringing this workspace up to date with a newer swe-atlas. Arguments: $ARGUMENTS

The package does the comparing: `swe-atlas update` reads this workspace, renders the template of
the version being run, and sorts every file. `.claude/atlas-manifest.json` draws the line it works
inside: template files it may replace, seeded files it merges (`CLAUDE.md`, `misc/self/`), files
that only gain lines (`.gitignore`, `.gitattributes`, `.claude/settings.json`), and everything
else, which is the user's and is never written: projects, notes, decision logs, secrets, config,
their own skills, commands and rules. Your part is to run it, explain the result, and apply only
what the user approves.

This command recommends. Every run starts with the comparison, which writes nothing, and ends with
a question; an `apply` in the arguments does not skip that. A file is written only after the user
has seen the recommendation and named the part to apply, in this conversation.

## 0. Context first

An update is long: the report, a diff per file that needs a decision, the user's answers. If the
conversation is compacted in the middle, the summary keeps "an update is in progress" and can lose
which files the user approved and which they said to leave alone. So before anything else:

- If this session has already done other work, say so and suggest `/clear` (or `/compact`) and
  then `/atlas:update` again. Go on in this session only if the user prefers to.
- If the conversation was compacted after the user approved something and before it was applied,
  do not apply from the summary. Run the comparison again (it writes nothing), show what is still
  open, and ask again.

## 1. Where the workspace stands

- Installed version: `version` in `.atlas/installed.json` (a workspace scaffolded before that
  file existed has it in `.atlas/config.json`).
- Latest version: `npm view swe-atlas version`.
- `git status`: if the tree is dirty, say so and suggest committing first, so the update is one
  reviewable diff and one `git restore` away from undone.

If the versions match, say so, and run the comparison anyway when `.atlas/installed.json` has a
`pendingBase` line (files still wait from an earlier update) or the user wants to see local edits
and files that drifted. Otherwise stop here.

## 2. Get the recommendation

```
npx --yes swe-atlas@latest update
```

This writes nothing. Read its first lines before the lists:

- **`baseline: none recorded`** means this workspace has no install record, so the tool cannot
  tell an edit of the user's from a change in the template, and every differing file lands under
  "Needs a look". Give it the version that was installed as the base (the folder is ignored by
  git):

  ```
  mkdir -p gitignored/atlas-update
  npm pack swe-atlas@<installed version> --pack-destination gitignored/atlas-update
  tar -xzf gitignored/atlas-update/swe-atlas-<installed version>.tgz -C gitignored/atlas-update
  npx --yes swe-atlas@latest update --base gitignored/atlas-update/package
  ```

- **`Files below still wait on the update that started from <version>`** means an earlier
  `--apply` moved the workspace on while some files were left for a merge or a look. Comparing
  those needs that older package: unpack it the same way and pass it as `--base`.

- **An error that starts `refusing to touch` or `refusing to write`**, or says
  `.atlas/installed.json is not valid JSON`, means the tool stopped before its first write: a
  symlink on the way to a file, a file where a folder has to be, or a damaged record. Show the
  user the path it names. Do not work around it by writing the file yourself; the user decides
  what that path should be.

- **`(read from CLAUDE.md)`** next to the flavor or the partner name means they were inferred.
  If either is wrong, pass `--variant vanilla|atlas-autonomous|atlas-collaborative` or
  `--partner "<name>"`; a wrong one shows up as a false difference in `CLAUDE.md`.

## 3. Present it

Give the recommendation by folder, in this order, with counts. Keep the tool's wording for the
groups so the user can match your summary to its output:

1. **Safe to replace** and **New in this version**: the template changed or added these, and the
   user never edited them. Name the folders and what changed in a line each (read a diff or two
   to say something true: `git diff --no-index <file> <staged new file>`).
2. **Lines to add**: what `.gitignore`, `.gitattributes` and `.claude/settings.json` would gain.
   Lines are only added: no hook, rule or line of the user's is removed or reordered.
3. **Safe to remove**: files the template dropped that still match what ATLAS installed, with
   the reason the manifest gives.
4. **Needs a merge** and **Needs a look**: for these, show the difference. Stage them first:

   ```
   npx --yes swe-atlas@latest update [--base ...] --stage gitignored/atlas-update/stage
   ```

   `stage/new/<path>` is the new template's file, `stage/base/<path>` what was installed, and
   `stage/merged/<path>` a three-way merge (the output says which merge cleanly and which have
   conflicts). `base/` and `merged/` are written only when the run has `--base`; without it the
   output says which version to unpack. For each file say what the user changed, what the
   template changed, and what you recommend: take the template's, keep theirs, or the merged
   result.
5. **Dropped by the template, left for you**: a path an older ATLAS shipped, where the file was
   edited or nothing records that ATLAS installed it, so it may be the user's own. The tool never
   removes these. Read the file and ask: `--keep <path>` if it is theirs, delete it by hand if it
   is a leftover.
6. **Has a shipped skill's name, origin unknown**: a folder in `.claude/skills/` named like a
   shipped skill, where nothing records who put it there and no file in it matches a shipped one.
   The tool writes nothing into it until this is settled. If ATLAS installed it, the `--base` of
   the installed version proves it and the skill is updated like the rest. Otherwise ask:
   `--keep .claude/skills/<name>` if it is the user's own, `--take .claude/skills/<name>` to
   replace its files with the template's.
7. **Your edits, kept** and **Deleted by you**: one line, so nothing is a surprise later.
8. **Never touched**: the list the tool prints, as it is. This is the part the user most wants to
   see is safe. A path marked `(a symlink: left alone)` is skipped because the file behind the
   link may be outside the workspace; one marked as a file where the template needs a folder (or
   a folder where it ships a file) is skipped until the user moves it.
9. **Structure this version expects**: files or folders the new version looks for in a different
   place. The tool never moves them. Say which command does each move (`/atlas:mode`,
   `/atlas:get-to-know`, `/design:create-design-md`) and offer to run it after the update.
10. **Skills you have not installed**: mention them only if one fits the user's projects.

Then stop and ask what to apply. The recommendation is the whole job until the user answers.

## 4. Apply what was approved

Each of these is a separate, explicit step; none of them can write a path the manifest calls the
user's. Run only the ones the user named, one at a time, and say what each wrote before the next.

- The safe part (new, replaced, added lines, removed): `npx --yes swe-atlas@latest update --apply`
  (repeat `--base ...` if step 2 needed it). It also writes `.atlas/installed.json`, so the next
  update needs no base.
- Take the template's version of a file or folder: `--take <path>`. It also installs a skill
  (`--take .claude/skills/<name>`) and restores a file the user deleted. It is refused on a
  folder of the user's own that shares a shipped skill's name: they move it aside first.
- Keep the user's version and stop reporting it: `--keep <path>`. On a file under "Safe to
  remove", "Dropped by the template" or "Lines to add" it makes the path the user's from then on
  (recorded under `kept` in `.atlas/installed.json`; deleting the line there undoes it). A path
  that matches nothing in the report is an error and the run writes nothing: check the spelling
  against the report. `--keep <folder>` settles the files that are there and need a decision; a
  file new in this version is still offered afterwards, and one already up to date is not counted.
- A merge: write the merged content into the file yourself (start from `stage/merged/<path>`,
  resolve any conflict markers with the user), then run `--keep <path>` so the record knows this
  file already contains the new version's changes.

`--take` and `--keep` can be repeated and combined with `--apply` in one run.

## 5. Finish

Run the plan once more and report what is left. Show `git status --short` so the user sees the
update as one diff, and say that a new Claude Code session is needed before changed commands,
rules, hooks and `CLAUDE.md` take effect. Remove `gitignored/atlas-update/` when done. Commit only
the way this workspace's `CLAUDE.md` says to.

To try a template that is not published yet, run its checkout instead of npx:
`node <path to swe-atlas>/bin/install.js update <this workspace>`.
