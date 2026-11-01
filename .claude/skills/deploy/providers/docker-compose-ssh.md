# Docker Compose over SSH

For a server you manage. No provider token: access is your SSH key. The host goes in `DEPLOY.md`
(user@host, or an SSH config alias), never in shipped files.

## One-time setup
```
docker context create <name> --docker "host=ssh://<user>@<host>"
```
The remote user needs access to the Docker socket. An SSH `ControlMaster` entry in
`~/.ssh/config` keeps repeated calls fast.

## Deploy
```
docker --context <name> compose -f compose.yaml -f compose.production.yaml pull
docker --context <name> compose -f compose.yaml -f compose.production.yaml up -d --wait --remove-orphans
```
Pin image tags (not `latest`) so a rollback has something to go back to. Migrations: run the
migration service or one-off command (`compose run --rm <app> <migrate>`) before `up`.

## Logs
`docker --context <name> compose logs -f -n 200 --since 30m <service>`.

## Rollback
Set the previous image tag (in the env file or compose override) and run `up -d` again.

## Secrets
Compose reads `env_file` / `.env` on the machine running the command, and `secrets:` mounts files
at `/run/secrets/<name>`. Keep server-side secret files on the server (created by the user), not in
the repo. Bind-mount paths resolve on the remote host.
