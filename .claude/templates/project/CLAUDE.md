# {{PROJECT}}

Stage: {{STAGE}}
Kind: {{KIND}}
One line: {{ONE_LINE}}

State: @STATUS.md

<!-- The map of this project: 60 to 100 lines. Point at deep documents, never @import them
     (imports load in full every session). Stage sets rigor: toy = simplest thing that works,
     mvp = sound core and honest shortcuts, production = the full engineering bar. Kind says what
     running, verifying and releasing mean here (.claude/reference/kinds.md). -->

## Stack and layout
- {{STACK}}
- <where things live: source, tests, migrations, assets, repos/<name>/ ...>

## Run and test
- run: `<command that starts or invokes it locally>` (port <n>, if it listens on one)
- test: `<command>`
- build: `<command, if there is a build step>`
- verify: <how a change is seen working: a URL, a simulator, a command and its output, a plan diff>
- port check: `node .claude/scripts/port.cjs <port>`

## Read before working on...
- an area not touched before, or something behaving oddly -> `node .claude/scripts/knowledge.cjs list{{PROJECT_ARG}}` (gotchas and lessons, one line each; read the ones that match)
- deploying or releasing -> DEPLOY.md
- <the public interface (API, CLI, file format) -> docs/living-spec-docs/...>
- <the data model -> docs/decision_logs/0001-schema.md>

## Conventions
- <only the few that are not obvious from the code>
