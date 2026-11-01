# Railway

Install: `brew install railway` or `npm i -g @railway/cli`. Checked 2026-11; verify with
`railway --help`.

## Token
- `RAILWAY_TOKEN`: a **project token**, scoped to one environment of one project. Best for deploys;
  staging needs its own token (store it under `--env staging`).
- `RAILWAY_API_TOKEN`: an account or workspace token, broader. If both are set, `RAILWAY_TOKEN` wins.

## Deploy
```
node .claude/scripts/secrets.cjs run <project> --env prod -- railway up --ci -s <service> -e production
```
`--detach` returns without streaming build logs.

## Logs
`railway logs --deployment -n 100` (or `--build`).

## Rollback
No CLI command: use the dashboard (deployment -> Rollback). `railway redeploy` rebuilds the latest
deployment, which is not a rollback.

## Variables on the platform
`railway variable set KEY --stdin -s <service> -e production` reads the value from stdin (the old
`railway variables --set` form is deprecated).
