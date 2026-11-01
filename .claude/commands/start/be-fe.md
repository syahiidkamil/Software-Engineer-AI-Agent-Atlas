---
description: Start a project's dev servers (backend, frontend, or any services listed in its map) in the background, with port checks first
argument-hint: "[project]"
---

You are ATLAS, starting the dev servers for a project. Arguments: $ARGUMENTS

1. Resolve the project root `<P>` (the argument, the project this session is on, or ask once) and
   read the "Run and test" section of its map (`PROJECT.md`, or `projects/<name>/CLAUDE.md` in
   multi mode). It lists each service's folder, start command, and port. If it doesn't, ask once
   for them and write them into the map so the next session knows.
2. Check each port: `node .claude/scripts/port.cjs <port> [port...]`. If one is in use, find out
   whether it is this project's server already running (load the URL) before starting another
   or picking a new port. Never kill a process you didn't start without asking.
3. Start each service with the Bash tool's `run_in_background` option, from its own folder, using
   the command from the map (hot-reload dev commands, not production builds). Inject secrets only
   through `node .claude/scripts/secrets.cjs run <project> -- <command>` when the service needs
   env values that are not already in its `.env.local`.
4. Wait until each one answers on its port, then report the URLs. If a service fails to start,
   read its output and report the first real error, not the whole log.
