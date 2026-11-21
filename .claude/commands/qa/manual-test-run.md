---
description: Run living test cases against the running app (a real browser for a web UI, HTTP calls or the shell otherwise) with the manual QA runner (haiku by default, sonnet for exploratory or visual checks), re-run UNSURE cases on sonnet, and file the report and bugs under the project's misc/test-runs/
argument-hint: "[project] [cases] [--runner haiku|sonnet] [--url http://...]"
---

You are ATLAS, running manual QA. Arguments: $ARGUMENTS

## 1. Resolve the inputs

- **Project** `<P>`: the argument, the project this session is on, or ask once.
- **Cases**: a folder or files under `<P>/docs/living-test-cases/`. If none were named, use the
  most recently changed folder there and say which. Inline acceptance checks also work.
- **Runner**: `--runner haiku` (default: explicit steps with expected results) or
  `--runner sonnet` (exploratory runs, visual judgment, flaky flows).
- **Target**: what the runner drives, from the map's `Kind:` line and "Run and test" section.
  For something that serves a URL: `--url`, else the URL and port in the map. Check the app is up
  (`node .claude/scripts/port.cjs <port>` says "in use", then load the URL). If it is not running,
  start it in the background from the map's run command, or ask. For a CLI or a library: the
  command or example the cases call, built first if the map has a build step. For a surface no
  tool here can drive (a phone simulator without tooling, a game window), say so before the run:
  those cases go to the user, not to a runner.
- **Output**: `<P>/misc/test-runs/{YYYY-MM-DD-HHMM}-{slug}/`. Never a shared root folder:
  parallel sessions on other projects write their own.

## 2. Run

Launch the `manual-qa-{runner}` subagent with a self-contained task: the project name and `<P>`,
the case files (paths), the target (the URL, or the command and working folder), the output
folder, and for a browser the session name `{project}-qa` (so parallel runs never share one). For many independent cases, split them
across a few runners in parallel, each with its own output subfolder and session name
`{project}-qa-{n}`.

## 3. Escalate UNSURE

If the haiku runner marked any case UNSURE, re-run just those cases with `manual-qa-sonnet` into
`{output}/rerun-sonnet/`. A case still UNSURE after that goes to the user with the runner's reason;
don't convert it to PASS or FAIL yourself.

## 4. Report

Merge the results into `{output}/report.md` (PASS / FAIL / UNSURE counts, per-case results, which
runner decided each). Each FAIL has a `bugs/BUG-NNN.md`. Then tell the user: the counts, every
FAIL and UNSURE in one line, and the report path. Don't fix bugs in this command; offer to.
