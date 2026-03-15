#!/usr/bin/env node

const readline = require('readline');
const fs = require('fs');
const path = require('path');

// ─── Constants ───────────────────────────────────────────────────────────────

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
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
  print(`${CYAN}${BOLD}  ║   System                                         ║${RESET}`);
  print(`${CYAN}${BOLD}  ║                                                  ║${RESET}`);
  print(`${CYAN}${BOLD}  ╚══════════════════════════════════════════════════╝${RESET}`);
  print();
  print(`${DIM}  FAANG experience for scale. Startup experience for pragmatism.${RESET}`);
  print();
}

function printUsage() {
  print();
  print(`${BOLD}  Usage:${RESET}`);
  print(`    swe-atlas new-project ${DIM}[folder-name]${RESET}`);
  print();
  print(`${BOLD}  Arguments:${RESET}`);
  print(`    ${DIM}folder-name${RESET}  Target directory ${DIM}(default: current directory)${RESET}`);
  print();
  print(`${BOLD}  Examples:${RESET}`);
  print(`    swe-atlas new-project              ${DIM}# scaffold in current directory${RESET}`);
  print(`    swe-atlas new-project my-project   ${DIM}# scaffold in ./my-project${RESET}`);
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

function generateSettingsJson(targetDir, options = {}) {
  const os = require('os');
  const homeDir = os.homedir();

  const allow = [
    'Bash(git log:*)',
    'Bash(lsof:*)',
    'Bash(mkdir:*)',
    'Bash(xargs ls:*)',
    'Bash(find:*)',
    'WebFetch(domain:www.anthropic.com)',
    `Bash(${homeDir}/.claude/plugins/cache/claude-plugins-official/ralph-loop/*/scripts/setup-ralph-loop.sh:*)`,
  ];

  if (options.playwright) {
    allow.push(
      'mcp__playwright__browser_navigate',
      'mcp__playwright__browser_click',
      'mcp__playwright__browser_snapshot',
      'mcp__playwright__browser_type',
      'mcp__playwright__browser_console_messages',
      'mcp__playwright__browser_press_key',
      'mcp__playwright__browser_take_screenshot',
      'mcp__playwright__browser_fill_form',
      'mcp__playwright__browser_evaluate',
      'mcp__playwright__browser_wait_for',
      'mcp__playwright__browser_select_option',
      'mcp__playwright__browser_hover',
      'mcp__playwright__browser_resize',
      'mcp__playwright__browser_close',
      'mcp__playwright__browser_network_requests',
    );
  }

  const settings = {
    permissions: {
      allow,
      deny: [],
      ask: [],
      defaultMode: 'acceptEdits',
    },
    enableAllProjectMcpServers: true,
    hooks: {
      Stop: [
        {
          matcher: '',
          hooks: [
            {
              type: 'command',
              command: `node '${targetDir}/.claude/hooks/task-complete.js'`,
            },
          ],
        },
      ],
    },
    enabledPlugins: {
      'ralph-loop@claude-plugins-official': true,
    },
  };

  if (options.playwright) {
    settings.enabledMcpjsonServers = ['playwright'];
  }

  return JSON.stringify(settings, null, 2) + '\n';
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

// ─── Scaffold ────────────────────────────────────────────────────────────────

async function scaffold(targetDir) {
  printHeader();

  const resolvedDir = path.resolve(targetDir);
  print(`  ${BOLD}Target:${RESET} ${resolvedDir}`);
  print();

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
        desc: 'One project, ATLAS identity wrapped in atlas/ folder',
        value: 'single',
      },
      {
        label: 'Multi repo',
        desc: 'Workspace with repos/ folder for multiple projects',
        value: 'multi',
      },
    ]);

    // 3. Active context templates (placed in development-context/ for immediate use)
    const activeTemplates = await askMultiChoice(
      rl,
      'Which context templates to activate? (all are copied, these go into development-context/)',
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

    // 4. MCP servers
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

    // ─── Write Files ──────────────────────────────────────────────────────

    print();
    print(`${GREEN}${BOLD}  Scaffolding ATLAS...${RESET}`);
    print();

    ensureDir(resolvedDir);

    // Determine paths based on mode
    const selfDir =
      mode === 'single'
        ? path.join(resolvedDir, 'atlas', 'self')
        : path.join(resolvedDir, 'self');
    const ctDir =
      mode === 'single'
        ? path.join(resolvedDir, 'atlas', 'context-templates')
        : path.join(resolvedDir, 'context-templates');
    const claudeDir = path.join(resolvedDir, '.claude');

    // CLAUDE.md
    writeFileSync(
      path.join(resolvedDir, 'CLAUDE.md'),
      generateClaudeMd(bossName, mode)
    );
    print(`  ${GREEN}+${RESET} CLAUDE.md`);

    // IMPORTANT_NOTES.md
    writeFileSync(
      path.join(resolvedDir, 'IMPORTANT_NOTES.md'),
      generateImportantNotes()
    );
    print(`  ${GREEN}+${RESET} IMPORTANT_NOTES.md`);

    // self/ directory
    const selfTemplateDir = path.join(TEMPLATES_DIR, 'self');
    if (fs.existsSync(selfTemplateDir)) {
      copyDirSync(selfTemplateDir, selfDir);
      const atlasPath = path.join(selfDir, 'atlas.md');
      if (fs.existsSync(atlasPath)) {
        let content = fs.readFileSync(atlasPath, 'utf-8');
        content = content.replace(/Boss Kamil/g, `Boss ${bossName}`);
        fs.writeFileSync(atlasPath, content, 'utf-8');
      }
    }
    print(`  ${GREEN}+${RESET} ${mode === 'single' ? 'atlas/' : ''}self/`);

    // Context templates — copy all
    const ctTemplateDir = path.join(TEMPLATES_DIR, 'context-templates');
    if (fs.existsSync(ctTemplateDir)) {
      copyDirSync(ctTemplateDir, ctDir);
      print(`  ${GREEN}+${RESET} ${mode === 'single' ? 'atlas/' : ''}context-templates/`);
    }

    // Activate selected templates into development-context/
    const devCtxDir = mode === 'single'
      ? path.join(resolvedDir, 'atlas', 'development-context')
      : path.join(resolvedDir, 'development-context');
    ensureDir(devCtxDir);
    if (activeTemplates.length > 0) {
      for (const tpl of activeTemplates) {
        const src = path.join(ctDir, tpl);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(devCtxDir, tpl));
        }
      }
      print(`  ${GREEN}+${RESET} development-context/ (${activeTemplates.length} active)`);
    } else {
      gitkeep(devCtxDir);
      print(`  ${GREEN}+${RESET} development-context/`);
    }

    // .claude/ directory — skills, agents, commands, hooks
    const claudeTemplateDir = path.join(TEMPLATES_DIR, '.claude');
    if (fs.existsSync(claudeTemplateDir)) {
      const dirs = ['skills', 'agents', 'commands', 'hooks'];
      for (const dir of dirs) {
        const src = path.join(claudeTemplateDir, dir);
        if (fs.existsSync(src)) {
          copyDirSync(src, path.join(claudeDir, dir));
          print(`  ${GREEN}+${RESET} .claude/${dir}/`);
        }
      }
    }

    // MCP options
    const mcpOptions = {
      playwright: mcpServers.includes('playwright'),
      postgres: mcpServers.includes('postgres'),
    };

    // settings.json + settings.local.json
    const settingsContent = generateSettingsJson(resolvedDir, mcpOptions);
    writeFileSync(
      path.join(claudeDir, 'settings.json'),
      settingsContent
    );
    writeFileSync(
      path.join(claudeDir, 'settings.local.json'),
      settingsContent
    );
    print(`  ${GREEN}+${RESET} .claude/settings.json`);
    print(`  ${GREEN}+${RESET} .claude/settings.local.json`);

    // .mcp.json
    if (mcpServers.length > 0) {
      writeFileSync(
        path.join(resolvedDir, '.mcp.json'),
        generateMcpJson(mcpOptions)
      );
      print(`  ${GREEN}+${RESET} .mcp.json`);
    }

    // Common directories (both modes)
    gitkeep(path.join(resolvedDir, 'docs'));
    print(`  ${GREEN}+${RESET} docs/`);

    gitkeep(path.join(resolvedDir, 'misc', 'prompts'));
    print(`  ${GREEN}+${RESET} misc/prompts/`);

    gitkeep(path.join(resolvedDir, 'automation_tests', 'test_cases'));
    gitkeep(path.join(resolvedDir, 'automation_tests', 'test_runs'));
    print(`  ${GREEN}+${RESET} automation_tests/`);

    if (mcpOptions.playwright) {
      gitkeep(path.join(resolvedDir, 'misc', 'browser-storage'));
      print(`  ${GREEN}+${RESET} misc/browser-storage/`);
    }

    // Multi-repo specific directories
    if (mode === 'multi') {
      gitkeep(path.join(resolvedDir, 'repos', 'backend'));
      gitkeep(path.join(resolvedDir, 'repos', 'frontend'));
      writeFileSync(
        path.join(resolvedDir, 'repos', 'CLAUDE.md'),
        generateRepoClaudeMd()
      );
      print(`  ${GREEN}+${RESET} repos/`);
    }

    // Git submodules (external_information)
    const { execSync } = require('child_process');
    const eiDir = mode === 'single'
      ? path.join(resolvedDir, 'atlas', 'external_information')
      : path.join(resolvedDir, 'external_information');

    try {
      // Init git if not already
      if (!fs.existsSync(path.join(resolvedDir, '.git'))) {
        execSync('git init', { cwd: resolvedDir, stdio: 'ignore' });
        print(`  ${GREEN}+${RESET} git init`);
      }

      const eiRelative = path.relative(resolvedDir, eiDir);
      execSync(
        `git submodule add git@github.com:anthropics/claude-plugins-official.git "${eiRelative}/claude-plugins-official"`,
        { cwd: resolvedDir, stdio: 'ignore' }
      );
      print(`  ${GREEN}+${RESET} ${eiRelative}/claude-plugins-official (submodule)`);

      execSync(
        `git submodule add git@github.com:anthropics/skills.git "${eiRelative}/skills"`,
        { cwd: resolvedDir, stdio: 'ignore' }
      );
      print(`  ${GREEN}+${RESET} ${eiRelative}/skills (submodule)`);
    } catch (err) {
      print(`  ${YELLOW}!${RESET} Could not add git submodules (${err.message})`);
      print(`  ${DIM}  Run manually:${RESET}`);
      const eiRelative = path.relative(resolvedDir, eiDir);
      print(`  ${DIM}  git submodule add git@github.com:anthropics/claude-plugins-official.git ${eiRelative}/claude-plugins-official${RESET}`);
      print(`  ${DIM}  git submodule add git@github.com:anthropics/skills.git ${eiRelative}/skills${RESET}`);
    }

    // ─── Summary ──────────────────────────────────────────────────────────

    print();
    print(`${GREEN}${BOLD}  ATLAS scaffolded successfully!${RESET}`);
    print();
    print(`  ${BOLD}Mode:${RESET}      ${mode === 'single' ? 'Single repo' : 'Multi repo'}`);
    print(`  ${BOLD}Location:${RESET}  ${resolvedDir}`);
    print(`  ${BOLD}Boss:${RESET}      ${bossName}`);
    if (activeTemplates.length > 0) {
      print(
        `  ${BOLD}Active:${RESET}    ${activeTemplates.map((t) => t.replace('.md', '')).join(', ')}`
      );
    }
    if (mcpServers.length > 0) {
      print(`  ${BOLD}MCP:${RESET}       ${mcpServers.join(', ')}`);
    }
    print();
    print(`${DIM}  Next steps:${RESET}`);
    if (resolvedDir !== process.cwd()) {
      print(`  ${DIM}  1. cd ${path.relative(process.cwd(), resolvedDir) || '.'}${RESET}`);
      print(`  ${DIM}  2. Open in Claude Code and start building${RESET}`);
    } else {
      print(`  ${DIM}  1. Open in Claude Code and start building${RESET}`);
    }
    print(`  ${DIM}  ${resolvedDir !== process.cwd() ? '3' : '2'}. Ask: "Who are you?" to activate ATLAS${RESET}`);
    print();
  } catch (err) {
    rl.close();
    console.error(`\n  Error: ${err.message}`);
    process.exit(1);
  }
}

// ─── CLI Entry Point ─────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHeader();
    printUsage();
    process.exit(0);
  }

  if (command === 'new-project') {
    const folderArg = args[1];
    const targetDir = folderArg
      ? path.resolve(process.cwd(), folderArg)
      : process.cwd();
    scaffold(targetDir);
    return;
  }

  // Unknown command
  print();
  print(`${RED}  Unknown command: ${command}${RESET}`);
  printUsage();
  process.exit(1);
}

main();
