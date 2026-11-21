# Files swe-atlas 2.6.4 shipped and 3.0.0 retired

Byte-for-byte copies from the `v2.6.4` tag, stored under `claude/` instead of `.claude/` so no tool
picks them up as live agents, commands or hooks. `new-project` removes a file at one of these paths
only when its content is the one a release shipped (the `sha256` lists in
`.claude/atlas-manifest.json`), and the tests need the real content to prove that. Do not edit them.
