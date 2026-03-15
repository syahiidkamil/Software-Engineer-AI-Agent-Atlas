#!/usr/bin/env node

const readline = require('readline');
const fs = require('fs');
const path = require('path');

// ─── Constants ───────────────────────────────────────────────────────────────

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

// ─── Utilities ───────────────────────────────────────────────────────────────

function print(msg = '') {
  console.log(msg);
}

function printHeader() {
  print();
  print(`${CYAN}${BOLD}  ╔══════════════════════════════════════════════════╗${RESET}`);
  print(`${CYAN}${BOLD}  ║                                                  ║${RESET}`);
  print(`${CYAN}${BOLD}  ║   ATLAS — Software Engineer AI Agent             ║${RESET}`);
  print(`${CYAN}${BOLD}  ║   Adaptive Technical Learning & Architecture     ║${RESET}`);
  print(`${CYAN}${BOLD}  ║                                                  ║${RESET}`);
  print(`${CYAN}${BOLD}  ╚══════════════════════════════════════════════════╝${RESET}`);
  print();
  print(`${DIM}  FAANG experience for scale. Startup experience for pragmatism.${RESET}`);
  print();
}

function createRL() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(`${YELLOW}  ? ${RESET}${question} `, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function askChoice(rl, question, options) {
  print(`${YELLOW}  ? ${RESET}${question}`);
  options.forEach((opt, i) => {
    print(`    ${BOLD}${i + 1}${RESET}) ${opt.label} ${DIM}— ${opt.desc}${RESET}`);
  });
  const answer = await ask(rl, `Choose [1-${options.length}]:`);
  const idx = parseInt(answer, 10) - 1;
  if (idx >= 0 && idx < options.length) {
    return options[idx].value;
  }
  // Default to first option
  print(`${DIM}    Defaulting to: ${options[0].label}${RESET}`);
  return options[0].value;
}

async function askMultiChoice(rl, question, options) {
  print(`${YELLOW}  ? ${RESET}${question} ${DIM}(comma-separated, e.g. 1,3)${RESET}`);
  options.forEach((opt, i) => {
    print(`    ${BOLD}${i + 1}${RESET}) ${opt.label} ${DIM}— ${opt.desc}${RESET}`);
  });
  const answer = await ask(rl, `Choose:`);
  if (!answer) return [];
  const indices = answer.split(',').map((s) => parseInt(s.trim(), 10) - 1);
  return indices
    .filter((i) => i >= 0 && i < options.length)
    .map((i) => options[i].value);
}

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function writeFileSync(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function gitkeep(dirPath) {
  ensureDir(dirPath);
  const gk = path.join(dirPath, '.gitkeep');
  if (!fs.existsSync(gk)) {
    fs.writeFileSync(gk, '', 'utf-8');
  }
}

// ─── Template Generators ─────────────────────────────────────────────────────

function generateClaudeMd(bossName, mode) {
  const selfPrefix = mode === 'single' ? 'atlas/' : '';
  return `# CLAUDE.md

## I Am ATLAS

**Adaptive Technical Learning and Architecture System**

Software Engineer Entity. Solution Architect. Software Architect. Tech Lead.
FAANG experience for scale. Startup experience for pragmatism. I build systems that work based on context.
Mostly scalable without overengineering.

## Core Documents

- @${selfPrefix}self/atlas.md - Identity, journey, work protocol, ground truth
- @${selfPrefix}self/engineering.md - Engineering principles, roles, development beliefs
- @IMPORTANT_NOTES.md - Critical lessons, warnings, must-follow rules (high priority)

## How I Work

1. **Verify empirically** - Read files before claiming, ask boss to test or help test if instructed to help the test before declaring
2. **KISS/YAGNI/DRY** - Simple solutions, no speculation, balanced abstraction
3. **Context determines correctness** - Right tool for the right scale
4. **Mermaid diagrams** - Visualize architecture when clarity helps

## Git Discipline

1. Request Boss ${bossName} review with context when work complete
2. Ask Boss: verify manually or need ATLAS to verify?
3. Boss handles staging
4. If Boss ask to commit, will immediately commit
`;
}

function generateSettingsJson() {
  return JSON.stringify(
    {
      permissions: {
        allow: [
          'Bash(git log:*)',
          'Bash(mkdir:*)',
        ],
        deny: [],
        ask: [],
        defaultMode: 'acceptEdits',
      },
      enableAllProjectMcpServers: true,
    },
    null,
    2
  ) + '\n';
}

function generateMcpJson(options = {}) {
  const servers = {};

  if (options.playwright) {
    servers.playwright = {
      command: 'npx',
      args: [
        '@playwright/mcp@latest',
        '--user-data-dir=./misc/browser-storage',
      ],
    };
  }

  if (options.postgres) {
    servers.postgres = {
      command: 'npx',
      args: [
        '-y',
        '@modelcontextprotocol/server-postgres',
        'postgresql://postgres:postgres@localhost:5432/postgres?schema=public',
      ],
    };
  }

  return JSON.stringify({ mcpServers: servers }, null, 2) + '\n';
}

function generateRepoClaudeMd() {
  return `backend at @repos/backend (port xxxx)
frontend at @repos/frontend (port yyyy)
`;
}

function generateImportantNotes() {
  return `# IMPORTANT NOTES

IMPORTANT
Critical reminders, warnings, and insights that must not be forgotten. These are lessons learned from production incidents, architectural decisions that saved or cost us, and wisdom that prevents repeating mistakes. Update when discovering crucial patterns or avoiding disasters.

## Information Entropy Guide

This file suggested to contain only **high-entropy information** - things that would genuinely surprise someone or save them from disaster.

as it is IMPORTANT!!! and YOU MUST FOLLOW IT!
<IMPORTANT>
YOU MUST FOLLOW THESE (HIGH PRIORITY):
...fill it here
</IMPORTANT>
`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  printHeader();

  const rl = createRL();

  try {
    // 1. Boss name
    const bossName = await ask(rl, 'What is your name (Boss name)?');
    if (!bossName) {
      print(`${YELLOW}  Boss name is required.${RESET}`);
      process.exit(1);
    }

    // 2. Project type
    const mode = await askChoice(rl, 'Project type?', [
      {
        label: 'Single repo',
        desc: 'Add ATLAS to an existing project',
        value: 'single',
      },
      {
        label: 'Multi repo',
        desc: 'Create a workspace with repos/ folder for multiple projects',
        value: 'multi',
      },
    ]);

    // 3. Project name / directory
    let targetDir;
    if (mode === 'single') {
      const useCurrentDir = await askChoice(
        rl,
        'Scaffold in current directory?',
        [
          { label: 'Yes', desc: `Use ${process.cwd()}`, value: 'yes' },
          { label: 'No', desc: 'Specify a different path', value: 'no' },
        ]
      );
      if (useCurrentDir === 'yes') {
        targetDir = process.cwd();
      } else {
        targetDir = await ask(rl, 'Enter project path:');
        targetDir = path.resolve(targetDir);
      }
    } else {
      const projectName = await ask(
        rl,
        'Workspace name (directory to create):'
      );
      if (!projectName) {
        print(`${YELLOW}  Workspace name is required.${RESET}`);
        process.exit(1);
      }
      targetDir = path.resolve(process.cwd(), projectName);
    }

    // 4. Context templates
    const contextTemplates = await askMultiChoice(
      rl,
      'Which context templates to include?',
      [
        {
          label: 'Backend API',
          desc: 'RESTful conventions, error handling patterns',
          value: 'backend.md',
        },
        {
          label: 'React + Vite + Tailwind v4 + shadcn/ui',
          desc: 'Full frontend stack conventions',
          value: 'frontend-react-vite-tailwind-4-and-shadcn.md',
        },
        {
          label: 'React + Vite (basic)',
          desc: 'Minimal React + Vite conventions',
          value: 'frontend-react-vite.md',
        },
        {
          label: 'JavaScript/TypeScript',
          desc: 'JS/TS language patterns',
          value: 'javascript.md',
        },
      ]
    );

    // 5. MCP servers
    const mcpServers = await askMultiChoice(
      rl,
      'Which MCP servers to enable?',
      [
        {
          label: 'Playwright',
          desc: 'Browser automation for QA testing',
          value: 'playwright',
        },
        {
          label: 'PostgreSQL',
          desc: 'Database access and queries',
          value: 'postgres',
        },
      ]
    );

    rl.close();

    // ─── Scaffold ────────────────────────────────────────────────────────

    print();
    print(`${GREEN}${BOLD}  Scaffolding ATLAS...${RESET}`);
    print();

    ensureDir(targetDir);

    // Determine paths based on mode
    const selfDir =
      mode === 'single'
        ? path.join(targetDir, 'atlas', 'self')
        : path.join(targetDir, 'self');
    const ctDir =
      mode === 'single'
        ? path.join(targetDir, 'atlas', 'context-templates')
        : path.join(targetDir, 'context-templates');
    const claudeDir = path.join(targetDir, '.claude');

    // CLAUDE.md
    writeFileSync(
      path.join(targetDir, 'CLAUDE.md'),
      generateClaudeMd(bossName, mode)
    );
    print(`  ${GREEN}+${RESET} CLAUDE.md`);

    // IMPORTANT_NOTES.md
    writeFileSync(
      path.join(targetDir, 'IMPORTANT_NOTES.md'),
      generateImportantNotes()
    );
    print(`  ${GREEN}+${RESET} IMPORTANT_NOTES.md`);

    // self/ directory
    const selfTemplateDir = path.join(TEMPLATES_DIR, 'self');
    if (fs.existsSync(selfTemplateDir)) {
      copyDirSync(selfTemplateDir, selfDir);
      // Replace boss name in atlas.md
      const atlasPath = path.join(selfDir, 'atlas.md');
      if (fs.existsSync(atlasPath)) {
        let content = fs.readFileSync(atlasPath, 'utf-8');
        content = content.replace(/Boss Kamil/g, `Boss ${bossName}`);
        fs.writeFileSync(atlasPath, content, 'utf-8');
      }
    }
    print(`  ${GREEN}+${RESET} ${mode === 'single' ? 'atlas/' : ''}self/`);

    // Context templates
    if (contextTemplates.length > 0) {
      ensureDir(ctDir);
      const ctTemplateDir = path.join(TEMPLATES_DIR, 'context-templates');
      for (const tpl of contextTemplates) {
        const src = path.join(ctTemplateDir, tpl);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(ctDir, tpl));
        }
      }
      print(
        `  ${GREEN}+${RESET} ${mode === 'single' ? 'atlas/' : ''}context-templates/ (${contextTemplates.length} templates)`
      );
    }

    // .claude/ directory — skills, agents, commands, hooks
    const claudeTemplateDir = path.join(TEMPLATES_DIR, '.claude');
    if (fs.existsSync(claudeTemplateDir)) {
      // Copy skills
      const skillsSrc = path.join(claudeTemplateDir, 'skills');
      if (fs.existsSync(skillsSrc)) {
        copyDirSync(skillsSrc, path.join(claudeDir, 'skills'));
        print(`  ${GREEN}+${RESET} .claude/skills/`);
      }

      // Copy agents
      const agentsSrc = path.join(claudeTemplateDir, 'agents');
      if (fs.existsSync(agentsSrc)) {
        copyDirSync(agentsSrc, path.join(claudeDir, 'agents'));
        print(`  ${GREEN}+${RESET} .claude/agents/`);
      }

      // Copy commands
      const commandsSrc = path.join(claudeTemplateDir, 'commands');
      if (fs.existsSync(commandsSrc)) {
        copyDirSync(commandsSrc, path.join(claudeDir, 'commands'));
        print(`  ${GREEN}+${RESET} .claude/commands/`);
      }

      // Copy hooks
      const hooksSrc = path.join(claudeTemplateDir, 'hooks');
      if (fs.existsSync(hooksSrc)) {
        copyDirSync(hooksSrc, path.join(claudeDir, 'hooks'));
        print(`  ${GREEN}+${RESET} .claude/hooks/`);
      }
    }

    // settings.json
    writeFileSync(
      path.join(claudeDir, 'settings.json'),
      generateSettingsJson()
    );
    print(`  ${GREEN}+${RESET} .claude/settings.json`);

    // .mcp.json
    const mcpOptions = {
      playwright: mcpServers.includes('playwright'),
      postgres: mcpServers.includes('postgres'),
    };
    if (mcpServers.length > 0) {
      writeFileSync(
        path.join(targetDir, '.mcp.json'),
        generateMcpJson(mcpOptions)
      );
      print(`  ${GREEN}+${RESET} .mcp.json`);
    }

    // Multi-repo specific directories
    if (mode === 'multi') {
      // repos/
      gitkeep(path.join(targetDir, 'repos', 'backend'));
      gitkeep(path.join(targetDir, 'repos', 'frontend'));
      writeFileSync(
        path.join(targetDir, 'repos', 'CLAUDE.md'),
        generateRepoClaudeMd()
      );
      print(`  ${GREEN}+${RESET} repos/`);

      // automation_tests/
      gitkeep(path.join(targetDir, 'automation_tests', 'test_cases'));
      gitkeep(path.join(targetDir, 'automation_tests', 'test_runs'));
      print(`  ${GREEN}+${RESET} automation_tests/`);

      // development-context/
      gitkeep(path.join(targetDir, 'development-context'));
      print(`  ${GREEN}+${RESET} development-context/`);

      // misc/browser-storage (for playwright)
      if (mcpOptions.playwright) {
        gitkeep(path.join(targetDir, 'misc', 'browser-storage'));
        print(`  ${GREEN}+${RESET} misc/browser-storage/`);
      }
    } else {
      // Single-repo: misc/browser-storage if playwright enabled
      if (mcpOptions.playwright) {
        gitkeep(path.join(targetDir, 'misc', 'browser-storage'));
        print(`  ${GREEN}+${RESET} misc/browser-storage/`);
      }
    }

    // ─── Summary ─────────────────────────────────────────────────────────

    print();
    print(`${GREEN}${BOLD}  ATLAS scaffolded successfully!${RESET}`);
    print();
    print(`  ${BOLD}Mode:${RESET}      ${mode === 'single' ? 'Single repo' : 'Multi repo'}`);
    print(`  ${BOLD}Location:${RESET}  ${targetDir}`);
    print(`  ${BOLD}Boss:${RESET}      ${bossName}`);
    if (contextTemplates.length > 0) {
      print(
        `  ${BOLD}Templates:${RESET} ${contextTemplates.map((t) => t.replace('.md', '')).join(', ')}`
      );
    }
    if (mcpServers.length > 0) {
      print(`  ${BOLD}MCP:${RESET}       ${mcpServers.join(', ')}`);
    }
    print();
    print(`${DIM}  Next steps:${RESET}`);
    if (mode === 'multi') {
      print(`  ${DIM}  1. cd ${path.basename(targetDir)}${RESET}`);
      print(`  ${DIM}  2. git init${RESET}`);
      print(`  ${DIM}  3. Add your repos to repos/ folder${RESET}`);
      print(`  ${DIM}  4. Open in Claude Code and start building${RESET}`);
    } else {
      print(`  ${DIM}  1. Open in Claude Code and start building${RESET}`);
      print(`  ${DIM}  2. Ask: "Who are you?" to activate ATLAS${RESET}`);
    }
    print();
  } catch (err) {
    rl.close();
    console.error(`\n  Error: ${err.message}`);
    process.exit(1);
  }
}

main();
