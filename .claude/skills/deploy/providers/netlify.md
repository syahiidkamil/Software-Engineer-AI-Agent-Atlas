# Netlify

Install: `npm install -g netlify-cli` (v27 needs Node 22.13+). Checked 2026-11; verify with
`netlify --help`.

## Token
`NETLIFY_AUTH_TOKEN` (user settings -> Applications -> personal access tokens, with an expiry) and
`NETLIFY_SITE_ID` (the dashboard now calls it Project ID). Both are read from the environment.

## Deploy
```
node .claude/scripts/secrets.cjs run <project> --env prod -- netlify deploy --prod
```
It builds locally unless `--no-build`. Without `--prod` you get a draft deploy; `--alias=<name>`
gives a stable preview URL.

## Logs
`netlify logs --source deploy|functions|edge-functions --since 1h` (the old `logs:deploy`,
`logs:function` commands were removed in v25).

## Rollback
Dashboard (Deploys -> pick one -> Publish deploy), or through the API:
`netlify api restoreSiteDeploy --data '{"site_id":"<id>","deploy_id":"<id>"}'`.

## Env vars on the platform
`netlify env:set KEY value --context production --secret` puts the value in a command, so the user
runs it in their own terminal, or `netlify env:import <file>` from a file they control.
