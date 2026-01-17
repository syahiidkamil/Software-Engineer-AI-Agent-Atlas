# Claude Code Essential Knowledge

*Last Updated: 2025-01-13*
*Source: Official Anthropic Documentation*

## Core Concepts

### What is Claude Code?
Claude Code is Anthropic's official CLI tool for AI-assisted software development. It provides:
- Interactive coding assistance with file system access
- Specialized sub-agents for focused tasks
- Hooks for workflow automation
- Context-aware development support

### Performance Principle
"Claude performs best when it has a clear target to iterate against—a visual mock, a test case, or another kind of output."

## Best Practices

### 1. Project Setup with CLAUDE.md
Create a `CLAUDE.md` file in your project root documenting:
- Essential bash commands for the project
- Code style guidelines and conventions
- Testing instructions and commands
- Repository etiquette and workflow
- Developer environment setup requirements

### 2. Optimal Development Workflow

#### Explore → Plan → Code → Commit
1. **Explore**: Read relevant files without coding initially
2. **Plan**: Use "think" modes to trigger deeper analysis
3. **Code**: Implement with verification of solution reasonableness
4. **Commit**: Create clear, explanatory commit messages

### 3. Performance Optimization Strategies
- **Context Management**: Use `/clear` to keep context focused
- **Leverage Sub-agents**: Delegate complex problems to specialized agents
- **Iterate**: Run 2-3 iterations for improved results
- **Thinking Levels**: Use escalating prompts:
  - "think" → basic reasoning
  - "think hard" → deeper analysis
  - "ultrathink" → maximum reasoning depth

### 4. Test-Driven Development (TDD)
1. Write tests first
2. Confirm tests fail initially
3. Implement code to pass tests
4. Use sub-agents to verify implementation isn't overfitting

## Sub-agents System

### What Are Sub-agents?
Specialized AI assistants within Claude Code that:
- Have specific purpose and expertise area
- Use separate context windows (preserving main context)
- Can be configured with specific tool access
- Include custom system prompts guiding behavior

### Creating Sub-agents
```bash
/agents  # Run this command
# Choose "Create New Agent"
# Define: purpose, tools, system prompt
```

### Example Sub-agents

#### Code Reviewer
```yaml
name: code-reviewer
purpose: Expert code review specialist
focus: Quality, security, maintainability
tools: Read-only access
```

#### Debugger
```yaml
name: debugger
purpose: Debugging specialist
focus: Errors, test failures, unexpected behavior
tools: Read, Bash, Debug tools
```

#### Data Scientist
```yaml
name: data-scientist
purpose: Data analysis expert
focus: SQL queries, BigQuery, data insights
tools: Database access, analysis tools
```

### Sub-agent Best Practices
- Start with Claude-generated agents
- Create focused, single-purpose agents
- Write detailed system prompts
- Limit tool access to necessary minimum
- Version control project sub-agents in `.claude/agents/`

## Hooks System

### What Are Hooks?
User-defined shell commands that execute at specific points in Claude Code's workflow, providing deterministic control over behavior.

### Available Hook Events

| Event | Trigger | Use Cases |
|-------|---------|-----------|
| **PreToolUse** | Before tool calls | Block dangerous operations, validate inputs |
| **PostToolUse** | After tool completion | Auto-format code, run linters |
| **UserPromptSubmit** | User submits prompt | Log interactions, validate requests |
| **Notification** | Claude sends notifications | Custom alerts, desktop notifications |
| **Stop** | Claude finishes responding | Cleanup, summary generation |
| **SubagentStop** | Sub-agent completes | Process sub-agent results |
| **PreCompact** | Before context compaction | Save important context |
| **SessionStart** | Session begins/resumes | Load project context |
| **SessionEnd** | Session ends | Save state, cleanup |

### Example Hook Implementations

#### Auto-formatting Hook (PostToolUse)
```bash
#!/bin/bash
if [[ "$TOOL_NAME" == "Edit" || "$TOOL_NAME" == "Write" ]]; then
  prettier --write "$FILE_PATH" 2>/dev/null || true
fi
```

#### File Protection Hook (PreToolUse)
```bash
#!/bin/bash
if [[ "$FILE_PATH" == *".env"* ]]; then
  echo "BLOCKED: Cannot modify environment files"
  exit 1
fi
```

### Security Considerations
- Hooks run with current environment credentials
- Always review hook implementations before registering
- Be aware of potential for code exfiltration
- Use hooks from trusted sources only

## Common Workflows

### 1. Codebase Understanding
```
"Give me an overview of this project's architecture"
"What authentication mechanism does this app use?"
"How does the data flow through this system?"
```
- Start broad, then narrow to specifics
- Use `@` to reference files and directories

### 2. Debugging Strategies

#### For Complex Issues
- Use "think" and intensifying phrases for deeper reasoning
- Share complete error messages and reproduction steps
- Ask for multiple fix approaches
- Verify fixes by running tests

#### Extended Thinking Triggers
- "Think step by step about this"
- "Think hard about why this might be happening"
- "Really analyze this deeply"

### 3. Testing Approaches
1. **Coverage Analysis**: "What functions lack test coverage?"
2. **Test Generation**: "Create tests for the auth module"
3. **Edge Cases**: "Add edge case tests for user input"
4. **Integration Tests**: "Write integration tests for the API"

### 4. Pull Request Creation
- Summarize all code changes
- Generate comprehensive PR descriptions
- Add testing details and coverage
- Highlight potential risks or breaking changes

### 5. Documentation
- Identify undocumented code sections
- Generate documentation with examples
- Verify documentation follows project standards
- Create API documentation from code

## Advanced Features

### Permission Modes
- **Plan Mode**: Safe, read-only code analysis (Shift+Tab to toggle)
- **Execute Mode**: Full tool access for implementation
- **Custom Permissions**: Configure via `/permissions`

### Tool Integration
- **MCP Servers**: Extend capabilities with custom tools
- **GitHub CLI**: Enhanced GitHub interactions
- **Custom Commands**: Create project-specific slash commands

### Conversation Management
```bash
# Resume previous conversation
claude-code --continue

# Resume specific conversation
claude-code --resume <conversation-id>

# Start fresh with specific model
claude-code --model claude-3-opus
```

### Git Worktrees for Parallel Work
```bash
# Create worktree for independent task
git worktree add ../project-feature feature-branch

# Work on multiple features simultaneously
claude-code ../project-feature
```

## Key Commands Reference

| Command | Purpose |
|---------|---------|
| `/clear` | Reset context |
| `/agents` | Manage sub-agents |
| `/permissions` | Configure tool access |
| `/hooks` | Manage workflow hooks |
| `/memory` | Edit persistent memory |
| `/continue` | Resume last conversation |
| `Shift+Tab` | Toggle Plan Mode |

## Optimal Usage Tips

1. **Be Specific**: Clear, detailed instructions yield better results
2. **Course-Correct Early**: Address issues immediately
3. **Use Visual References**: Screenshots for UI work
4. **Leverage Parallelism**: Multiple Claude instances for independent tasks
5. **Maintain Context**: Use CLAUDE.md files for project knowledge
6. **Iterate**: 2-3 rounds often produce significantly better results

## Important Reminders

- Context degrades with length - use `/clear` strategically
- Sub-agents preserve main context while handling specific tasks
- Hooks can enforce coding standards automatically
- Plan Mode allows safe exploration without modifications
- Always verify generated code against tests or specifications

---

*This knowledge base captures essential Claude Code concepts for effective AI-assisted development. Update as new features and best practices emerge.*