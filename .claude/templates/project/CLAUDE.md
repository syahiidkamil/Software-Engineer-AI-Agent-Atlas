# {{PROJECT}}

Stage: {{STAGE}}
One line: {{ONE_LINE}}

State: @STATUS.md

<!-- The map of this project: 60 to 100 lines. Point at deep documents, never @import them
     (imports load in full every session). Stage sets rigor: toy = simplest thing that works,
     mvp = sound core and honest shortcuts, production = the full engineering bar. -->

## Stack and layout
- {{STACK}}
- <where things live: src/app, src/lib, migrations, repos/<name>/ ...>

## Run and test
- dev: `<command>` (port <n>)
- test: `<command>`
- free a port check: `node .claude/scripts/port.cjs <port>`

## Read before working on...
- deploying -> DEPLOY.md
- <the API -> docs/living-spec-docs/api.md>
- <the data model -> docs/decision_logs/0001-schema.md>

## Conventions
- <only the few that are not obvious from the code>
