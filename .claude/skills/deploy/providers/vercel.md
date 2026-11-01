# Vercel

Install: `npm i -g vercel`. Checked 2026-11; verify with `vercel --help`.

## Token
`VERCEL_TOKEN` (account settings -> Tokens; scope it to the team, set an expiry), plus
`VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` from `.vercel/project.json` after `vercel link`.
The user stores it: `node .claude/scripts/secrets.cjs set VERCEL_TOKEN`. The CLI reads `VERCEL_TOKEN`
from its environment, so `secrets.cjs run` is enough.

## Deploy
Production (prebuilt, reproducible):
```
node .claude/scripts/secrets.cjs run <project> --env prod -- vercel pull --yes --environment=production
node .claude/scripts/secrets.cjs run <project> --env prod -- vercel build --prod
node .claude/scripts/secrets.cjs run <project> --env prod -- vercel deploy --prebuilt --prod
```
Preview: the same with `--environment=preview` and without `--prod`.

## Logs
`vercel logs --environment production --since 1h` (CLI v64 removed streaming `--follow` and the
positional deployment argument); build logs: `vercel inspect <url> --logs`.

## Rollback
`vercel rollback [deployment-url-or-id]`; undo with `vercel promote <id>`. Hobby plans can only
roll back to the previous production deployment.

## Env vars on the platform
`vercel env add NAME production --sensitive` reads the value from stdin: the user runs it, or pipe
it from the store with `secrets.cjs run ... -- sh -c 'printf %s "$NAME" | vercel env add NAME production --sensitive'`.
