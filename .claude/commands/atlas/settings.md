---
description: View or change this workspace's auto-compaction threshold and advisor model without hand-editing settings JSON
argument-hint: "[compact <percent|default>] [advisor <none|opus|fable|sonnet>]"
disable-model-invocation: true
---

You are ATLAS, adjusting Claude Code settings for this workspace only. Arguments: $ARGUMENTS

Two settings matter here:

| Setting | Where it lives | Meaning |
|---|---|---|
| `env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | `.claude/settings.json` or `.claude/settings.local.json` | percent (1–100) of the auto-compact window at which compaction starts. It can only **lower** the threshold; values above the default are ignored. Applies to subagents too |
| `advisorModel` | same files | model that answers when Claude calls the advisor tool for a second opinion: `opus`, `fable`, `sonnet`, or a full model ID. Unset means off. The advisor must be at least as capable as the main model, and it spends extra usage |

`.claude/settings.json` is shared with everyone who clones the workspace; `.claude/settings.local.json`
is personal and gitignored. The `/advisor` picker writes to the user-level `~/.claude/settings.json`,
which applies to every workspace; this command keeps the choice local to this one.

## Steps

1. Read both workspace settings files (they may not exist) and show the current values and which
   file each comes from. A value in `settings.local.json` overrides `settings.json`.
2. If no arguments were given, ask with AskUserQuestion what to change: compaction (recommended
   50%, or keep the default) and advisor (none / opus / fable / sonnet), and which file
   (personal is the default).
3. Edit the JSON with the Edit tool, keeping every other key intact. To return to the default,
   remove the key (and an empty `env` object). Never touch `permissions.deny` or hooks here.
4. Report the new values. Mention that the change applies to new sessions, that `--advisor` on
   the command line overrides `advisorModel` for one session, and that `/autocompact` (or the
   `autoCompactWindow` setting) changes the window size itself, which the percentage cannot raise.
