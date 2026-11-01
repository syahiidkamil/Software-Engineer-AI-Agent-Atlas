# Fly.io

Install: `brew install flyctl` or `curl -L https://fly.io/install.sh | sh`. Binary `fly`.
Checked 2026-11; verify with `fly --help`.

## Token
`FLY_API_TOKEN`: an app-scoped deploy token, `fly tokens create deploy -x 720h` (set an expiry;
the default is 20 years). The user creates it and stores it with
`node .claude/scripts/secrets.cjs set FLY_API_TOKEN --project <p> --env prod`.

## Deploy
```
node .claude/scripts/secrets.cjs run <project> --env prod -- fly deploy --remote-only -a <app>
```
Strategies: `--strategy rolling|bluegreen|canary|immediate`. Migrations: a `release_command` in
`fly.toml` runs before the new machines take traffic.

## Environments
No built-in environments: staging is a separate app (`fly deploy -a <app>-staging -c fly.staging.toml`).

## Logs
`fly logs -a <app>` (`--no-tail` for a snapshot).

## Rollback
No command. List images with `fly releases -a <app> --image`, then
`fly deploy -a <app> --image registry.fly.io/<app>:<deployment-tag>`. Secrets and config are not
reverted.

## Secrets on the platform
`fly secrets import -a <app>` reads `NAME=VALUE` lines from stdin (it triggers a deploy; add
`--stage` to defer). Pipe from the store with `secrets.cjs run ... -- sh -c '...'`, never by
typing values into a command.
