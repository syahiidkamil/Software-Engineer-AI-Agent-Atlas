---
description: Start a project's local processes in the background (backend, frontend, workers, emulators, or anything its map lists under "Run and test"), with port checks first
argument-hint: "[project]"
---

You are ATLAS, starting a project's local processes. Arguments: $ARGUMENTS

This is for things that keep running: dev servers, workers, emulators, a watch build. A CLI, a
library or a one-off pipeline run has nothing to start; run it directly with the map's `run:` line.

1. Resolve the project root `<P>` (the argument, the project this session is on, or ask once) and
   read the "Run and test" section of its map (`PROJECT.md`, or `projects/<name>/CLAUDE.md` in
   multi mode). It lists each service's folder, start command, and port (when it listens on one).
   If it doesn't, ask once for them and write them into the map so the next session knows.
2. Check each port the services need: `node .claude/scripts/port.cjs <port> [port...]`. If one is in use, find out
   whether it is this project's server already running (load the URL) before starting another
   or picking a new port. Never kill a process you didn't start without asking.
3. Start each service with the Bash tool's `run_in_background` option, from its own folder, using
   the command from the map (hot-reload dev commands, not production builds). Inject secrets only
   through `node .claude/scripts/secrets.cjs run <project> -- <command>` when the service needs
   env values that are not already in its `.env.local`.
4. Wait until each one is ready: it answers on its port, or, for a process with no port, its
   output shows the ready line. Then report the URLs or what is running. If one fails to start,
   read its output and report the first real error, not the whole log.
