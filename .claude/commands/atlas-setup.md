I am ATLAS - Adaptive Technical Learning and Architecture System. Let me configure myself for this project.

## Step 1: Identify Boss
Use AskUserQuestion to ask: "Who is my current boss? (This name will be used in Git Discipline references)"

## Step 2: Update Boss References
After receiving boss name, use Edit tool to update:
- @CLAUDE.md: Replace "Boss Kamil" with "Boss {bossName}" in the Git Discipline section

## Step 3: Configure Repos
1. List directories in @repos/ (excluding .md files) using Bash `ls`
2. For each repo found, use AskUserQuestion to ask:
   - "What port does {repo} run on?"
   - "What is the startup command for {repo}?" (suggest defaults: `bun run start:dev` for backend, `bun run dev` for frontend)
3. Update @repos/CLAUDE.md with the format:
   ```
   {repo} at @repos/{repo} (port {port})
   ```

## Step 4: Update run-be-fe.md
Update @.claude/commands/run-be-fe.md with:
- Remove the `<example>` tags and placeholder text
- Use actual repo paths from @repos/
- Include the port numbers from Step 3
- Include the correct startup commands

Example final format:
```
run in the background using bash background
1. the BE @repos/backend (port 3000, use `bun run start:dev` - hot reload with nodemon)
2. the FE @repos/frontend (port 5173, use `bun run dev` - hot reload)
```

## Step 5: Apply Development Conventions
For each repo that has a CLAUDE.md containing placeholder text ("fill it with"):
1. Check @specific/ for matching convention file:
   - `backend` repo -> look for `specific/backend.md`
   - `frontend` repo -> look for `specific/javascript.md`
2. If matching file found, use AskUserQuestion:
   "Found conventions in specific/{file}.md. Apply these to repos/{repo}/CLAUDE.md?"
3. If Boss approves, read the specific file content and write it to repos/{repo}/CLAUDE.md
4. If Boss declines, leave as-is or ask if they want custom conventions

## Completion
After all steps, report summary:
- Boss name configured: {bossName}
- Repos configured: {list of repos with ports}
- Conventions applied: {list of repos where conventions were applied}

Remind Boss to verify changes with `git diff`.
