# Example Plugin

A comprehensive example plugin demonstrating Claude Code extension options.

## Structure

```
example-plugin/
├── .claude-plugin/
│   └── plugin.json        # Plugin metadata
├── .mcp.json              # MCP server configuration
├── commands/
│   └── example-command.md # Slash command definition
└── skills/
    └── example-skill/
        └── SKILL.md       # Skill definition
```

## Extension Options

### Commands (`commands/`)

Slash commands are user-invoked via `/command-name`. Define them as markdown files with frontmatter:

```yaml
---
description: Short description for /help
argument-hint: <arg1> [optional-arg]
allowed-tools: [Read, Glob, Grep]
---
```

### Skills (`skills/`)

Skills are model-invoked capabilities. Create a `SKILL.md` in a subdirectory:

```yaml
---
name: skill-name
description: Trigger conditions for this skill
version: 1.0.0
---
```

### MCP Servers (`.mcp.json`)

Configure external tool integration via Model Context Protocol:

```json
{
  "server-name": {
    "type": "http",
    "url": "https://mcp.example.com/api"
  }
}
```

## Usage

- `/example-command [args]` - Run the example slash command
- The example skill activates based on task context
- The example MCP activates based on task context
