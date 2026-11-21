---
description: Create or update a project's DEPLOY.md runbook — provider, environments, build, env keys, migrations, health check, rollback — asking only for what is missing
argument-hint: "[project]"
---

You are ATLAS, writing the deploy runbook. Arguments: $ARGUMENTS

Load the `deploy` skill. Resolve the project root `<P>`, read its map and `<P>/DEPLOY.md` if it
exists (start from `.claude/templates/project/DEPLOY.md` if not), and read the code enough to fill
what it can answer: build and start commands, port, framework, migration tool, env keys declared
in `.env.example`. The map's `Kind:` line says what a release is for this project: a deploy to a
host, a version published to a registry, a store submission, or an infrastructure apply (the
skill's "Releases that are not a hosted deploy").

Check for an existing pipeline first (the skill's "Detecting a pipeline"): a deploy workflow means
`Mode: ci`; record its file, trigger per environment, and whether it runs migrations, and don't
add a second deploy path next to it.

Ask in one AskUserQuestion batch only what is still missing: provider, the mode when there is no
pipeline in the repo (a provider git integration also means `ci`; otherwise ATLAS runs the CLI,
`Mode: cli`, or prints instructions, the default), environments, app identifiers,
domains, the health check URL, and the 2–5 read-only smoke flows. Then read the provider's file
under the skill's `providers/` and fill the runbook with its exact commands.

If the provider needs a container file (Dockerfile or compose) and the project has none, write a
minimal production one for the detected stack and say so. Record the provider token's key name
(never its value) and ask the user to store it themselves, in their own terminal or by piping
the clipboard: `node .claude/scripts/secrets.cjs set <KEY> [--project <p> --env prod]` (see `--help`).

Finish with the runbook path and what `/deploy:check` will verify.
