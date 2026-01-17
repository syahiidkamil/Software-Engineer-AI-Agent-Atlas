---
description: An example slash command that demonstrates command frontmatter options
argument-hint: <required-arg> [optional-arg]
allowed-tools: [Read, Glob, Grep, Bash]
---

# Example Command

This command demonstrates slash command structure and frontmatter options.

## Arguments

The user invoked this command with: $ARGUMENTS

## Instructions

When this command is invoked:

1. Parse the arguments provided by the user
2. Perform the requested action using allowed tools
3. Report results back to the user

## Frontmatter Options Reference

Commands support these frontmatter fields:

- **description**: Short description shown in /help
- **argument-hint**: Hints for command arguments shown to user
- **allowed-tools**: Pre-approved tools for this command (reduces permission prompts)
- **model**: Override the model (e.g., "haiku", "sonnet", "opus")

## Example Usage

```
/example-command my-argument
/example-command arg1 arg2
```
