# Coolify

Self-hosted (or Coolify Cloud) PaaS. Two routes: the REST API, or the `coolify` CLI.
Checked against Coolify v4.5 and coolify-cli v1.11 (2026-11); verify with `coolify --help`.

## Token
- Create it in the dashboard: Keys & Tokens -> API Tokens. On self-hosted, an admin first enables
  Settings -> Advanced -> API access.
- Abilities: deploying needs `deploy` (or `root`); `write` does **not** include deploy. Reading
  logs over the API needs `read:sensitive`. Prefer `deploy` plus an expiry.
- The user stores it once (global): `node .claude/scripts/secrets.cjs set COOLIFY_API_TOKEN`, and
  the base URL as `COOLIFY_URL`. App UUIDs go in `DEPLOY.md` (they are not secrets).

## Deploy (REST API, works anywhere with curl)
`POST {COOLIFY_URL}/api/v1/deploy?uuid=<app-uuid>&force=false`, header `Authorization: Bearer <token>`.
Since v4.2 this is POST; GET returns 405.
```
node .claude/scripts/secrets.cjs run <project> -- sh -c 'curl -fsS -X POST -H "Authorization: Bearer $COOLIFY_API_TOKEN" "$COOLIFY_URL/api/v1/deploy?uuid=<app-uuid>&force=false"'
```
The response lists `deployments[].deployment_uuid`. `tag=<tag>` deploys every resource with a tag.

## Deploy (CLI)
- Install: `brew install coollabsio/coolify-cli/coolify-cli`, or the install script in the
  coollabsio/coolify-cli README.
- One-time context with the token: the CLI has no token env var, so the user runs
  `coolify context add -d <name> <url> <token>` **in their own terminal**, not through `!` (the
  command text would land in the transcript).
- Deploy: `coolify deploy uuid <app-uuid>` (`--force` rebuilds without cache); watch with
  `coolify deploy list` / `coolify deploy get <deployment-uuid>`.

## Environments
Staging is a separate resource (its own UUID) or a separate Coolify environment. PR previews:
`--pull-request-id <id>` (CLI) or `pr=<id>` (API).

## Logs
`coolify app logs <app-uuid> -n 100`; build logs: `coolify app deployments logs <app-uuid> [deployment-uuid]`.

## Rollback
No CLI command. API (v4.3+): `GET /api/v1/applications/<uuid>/rollback-images`, then
`POST /api/v1/applications/<uuid>/rollback` with `{"commit":"<tag>"}` (needs `deploy`). Or the
dashboard's Rollback tab.

## Env vars on the server
`coolify app env sync <app-uuid> --file <file>` (adds and updates, never deletes) or set them in
the dashboard. Do not sync a file holding production values from chat; the user does it.
