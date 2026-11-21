---
name: deploy
description: Take a project from working locally to running in production, provider-agnostic — write the DEPLOY.md runbook, gate a release, deploy through the existing CI/CD pipeline, the provider's CLI or API, or exact printed steps, then health-check, smoke-test, and log it. Use when deploying, shipping, releasing, setting up hosting, rolling back, or reading production logs.
---

# Deploy

A deploy is a runbook, a gate, an action, and a check. `Mode:` in `DEPLOY.md` decides who
performs the action:

| Mode | The action | ATLAS's part |
|---|---|---|
| `ci` | a pipeline deploys on merge or tag (GitHub Actions, GitLab CI, or the provider's git integration: Vercel, Netlify, Coolify, Railway, Fly) | get the change onto a PR, wait for green checks, merge only with an explicit yes (or leave the merge to the user), watch the pipeline, then check the deployed app. Never run provider CLIs around the pipeline |
| `instructions` (default without a pipeline) | the user runs the steps | print the exact steps, then check |
| `cli` (opt-in) | ATLAS runs the provider's CLI or API | run it after the gate, then check |

When a pipeline exists, `ci` is the right mode: deploying by hand next to it creates releases the
pipeline doesn't know about. Production always needs an explicit yes in chat, whichever mode.

## The runbook: `<P>/DEPLOY.md`

One per project, from `.claude/templates/project/DEPLOY.md`: provider, mode, environments,
app identifiers (ids, never secrets), domains, build/start/port, env keys (names, pointing at
`.env.example`), database entry and migration command, health check URL, smoke flows,
rollback, logs, last deploy. Missing fields are asked for once and written down; the next deploy
should need no questions.

## Detecting a pipeline

Look for `.github/workflows/*.yml`, `.gitlab-ci.yml`, `bitbucket-pipelines.yml`, `.circleci/`, or
similar with a deploy job, and note its trigger (`on: push: branches: [main]`, tags) and whether it
runs migrations. Provider git integrations (Vercel, Netlify, Coolify auto-deploy, Railway, Fly
GitHub app) leave little or no trace in the repo, so ask once and record the answer.

## The gate (before any deploy)

In `ci` mode the pipeline runs its own checks; the gate still runs locally first so a red pipeline
is a surprise, not a routine, and it adds what CI usually doesn't check (secrets for the target
env, migration safety, the runbook).

1. Tests pass (the project's test command from its map).
2. `node .claude/scripts/secrets.cjs check <project> --env <env>` reports nothing missing.
3. Migrations reviewed: they run **before** the new release goes live and are backward compatible
   with the release still running (add columns before using them; drop only after nothing reads
   them). For Postgres, use the `supabase-postgres-best-practices` skill when it is installed.
   A project with no database skips this item.
4. The build succeeds locally (`Build:` command).
5. `DEPLOY.md` has a health check, a rollback, and how to read logs.

A failed item stops the deploy. Say which and why.

## The action

- **CI mode**: the change goes through the repo's normal flow. Push the branch and open a PR
  (`gh pr create`), wait for checks (`gh pr checks --watch`), and report. Merging to the branch
  that deploys production is a production deploy: ask for an explicit yes, or leave the merge to
  the user. After the merge, follow the pipeline run (`gh run watch`, or the provider's dashboard
  for git integrations) until it finishes, then go to "After every deploy".
- **Instructions mode**: print the numbered steps with the real ids and commands from
  `DEPLOY.md`, including migrations, the deploy, and the health check.
- **CLI mode**: run provider commands through the secret store so tokens reach the CLI's
  environment without appearing anywhere:
  `node .claude/scripts/secrets.cjs run <project> --env <env> -- <provider command>`.
  When a command needs a token inside an argument (a curl header), let the child shell expand it,
  in single quotes: `... -- sh -c 'curl -H "Authorization: Bearer $TOKEN" ...'`.
  Never put a token value in a command you write.
- Production: show the exact commands and ask for a yes every time, even in an autonomous session.

## After every deploy

1. Hit the health check until it returns 200 (bounded retries), or report the failure and offer
   the rollback from `DEPLOY.md`. In `ci` mode, first confirm the running version is the merged
   commit (a version endpoint, response header, or the pipeline's deploy log); a green pipeline
   that deployed the previous build is a common trap.
2. Smoke-test the deployed URL with the `manual-qa-haiku` runner: the read-only flows listed under
   "Smoke test" in `DEPLOY.md`. Never create, pay, delete, or email against production.
3. Append one line to `<P>/docs/deploys.md` (date, env, version or commit, result) and update
   `Last deploy` in `DEPLOY.md` and the project's `STATUS.md`.

## Providers

Read only the provider the project uses, from `providers/`:

| Provider | File | Route |
|---|---|---|
| Coolify | `providers/coolify.md` | REST API or the `coolify` CLI |
| Vercel | `providers/vercel.md` | `vercel` CLI |
| Netlify | `providers/netlify.md` | `netlify` CLI |
| Fly.io | `providers/fly.md` | `fly` CLI |
| Railway | `providers/railway.md` | `railway` CLI |
| Docker Compose over SSH | `providers/docker-compose-ssh.md` | `docker compose` with an SSH context |

Provider CLIs change. Before relying on a flag, check `<cli> --help` or the provider's docs, and
correct the provider file when it drifted. Adding a provider means adding one file here.

## Releases that are not a hosted deploy

The runbook, the gate, the action and the check apply to every kind of project
(`.claude/reference/kinds.md`); the fields mean something else when nothing is hosted:

| Release | Provider line | Health check becomes | Rollback really is |
|---|---|---|---|
| A package (npm, PyPI, crates.io, a container registry) | the registry | install the published version in a clean folder and run it | a patch release; a published version number is spent and cannot be reused |
| Binaries (a CLI, a desktop app) | where they are published (a releases page, an update feed) | download the artifact, check its checksum or signature, run it | a new release; pull the bad artifact if the host allows |
| A mobile build | the store, or the internal track (TestFlight, internal testing) | the build installs and opens on a device or simulator | a new submission; halt the staged rollout meanwhile |
| Infrastructure (Terraform, Pulumi, Kubernetes manifests) | the tool and the target account or cluster | the plan matches what was approved, then the resources report healthy | a reverting apply, or a restore from backup for anything destroyed |
| A data pipeline or a model | the scheduler or the model registry | a run on real inputs passes its data checks | re-point to the previous version; reprocess what the bad run wrote |

There is no provider file for these: use the tool's own documentation and write the exact
commands into `DEPLOY.md`. Publishing a version, submitting a store build and applying a plan that
destroys anything cannot be taken back, so each needs an explicit yes at the moment of the action
in every mode, including `ci` when a tag or a merge triggers the publish.

## Safety

- No production deploy, publish, store submission or infrastructure apply without a passing gate
  and an explicit yes.
- Tokens live in the secret store (`global.env` for account tokens, the project's `@<env>` layer
  for per-environment ones). Prefer scoped, expiring tokens. Never ask for one in chat: the user
  stores it themselves (`secrets.cjs set KEY` in their terminal, or `! pbpaste | ... set KEY`).
- Databases on a server are reached through the provider's secure path (SSH tunnel, private
  network), as `DEPLOY.md` describes, never by opening the port publicly.
